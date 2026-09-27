// ETAPA 3c — Descobre as cores de cada produto olhando a foto de capa.
//
// O fornecedor não escreve a cor no título, então ela sai da imagem: as fotos
// são de estúdio, com fundo cinza liso. O fundo é medido na borda da foto, o
// que destoa dele é o tênis, e cada pixel do tênis cai numa das cores da
// paleta abaixo. Entram as cores que ocupam uma fatia boa do tênis (até 3).
//
//   npm run cores            (depois de "npm run capas", que escolhe a capa)
//   npm run build-catalog    (grava as cores no catálogo)
//
// Resultado: data/cores.json, { "<álbum>": ["preto", "branco"] }.
// Os nomes são os slugs de COLORS, em src/config.ts.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import pLimit from 'p-limit';

const IMG = path.resolve(process.env.IMG_DIR || 'public/img');
const SAIDA = path.resolve('data/cores.json');
const LADO = 140; // a foto é reduzida a isto antes de contar: rápido e suficiente
const FATIA_MINIMA = 0.14; // cor que ocupa menos que isto do tênis não entra
// Cinza precisa de mais: a sombra de um tênis branco também é cinza.
const FATIA_CINZA = 0.28;
const MAX_CORES = 3;

/** Uma cor da paleta a partir de RGB (0–255). */
function nomeDaCor(r, g, b) {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const v = max;
  const s = max === 0 ? 0 : (max - min) / max;
  let h = 0;
  if (max !== min) {
    const d = max - min;
    const [R, G, B] = [r / 255, g / 255, b / 255];
    if (max === R) h = ((G - B) / d) % 6;
    else if (max === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  if (v < 0.22) return 'preto';
  if (s < 0.14) return v > 0.8 ? 'branco' : v < 0.35 ? 'preto' : 'cinza';
  // Tons de terra: laranja/amarelo apagados viram bege (claro) ou marrom (escuro).
  if (h >= 15 && h < 50 && s < 0.5) return v > 0.62 ? 'bege' : 'marrom';
  if (h >= 10 && h < 45 && v < 0.5) return 'marrom';
  // Vermelho claro e pouco saturado é rosa.
  if ((h < 15 || h >= 330) && s < 0.45 && v > 0.65) return 'rosa';
  if (h < 12 || h >= 345) return 'vermelho';
  if (h < 40) return 'laranja';
  if (h < 68) return 'amarelo';
  if (h < 165) return 'verde';
  if (h < 255) return 'azul';
  if (h < 290) return 'roxo';
  return 'rosa';
}

async function coresDaFoto(arquivo) {
  const { data, info } = await sharp(arquivo)
    .resize(LADO, LADO, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const px = (x, y) => {
    const i = (y * W + x) * 3;
    return [data[i], data[i + 1], data[i + 2]];
  };

  // Fundo: média das bordas (o estúdio é um cinza liso, levemente degradê).
  let soma = [0, 0, 0];
  let n = 0;
  for (let x = 0; x < W; x++)
    for (const y of [0, 1, H - 2, H - 1]) {
      const p = px(x, y);
      soma = soma.map((s, k) => s + p[k]);
      n++;
    }
  for (let y = 0; y < H; y++)
    for (const x of [0, 1, W - 2, W - 1]) {
      const p = px(x, y);
      soma = soma.map((s, k) => s + p[k]);
      n++;
    }
  const fundo = soma.map((s) => s / n);

  const conta = new Map();
  let total = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const [r, g, b] = px(x, y);
      const dist = Math.hypot(r - fundo[0], g - fundo[1], b - fundo[2]);
      if (dist < 38) continue; // é fundo (ou sombra suave no fundo)
      const cor = nomeDaCor(r, g, b);
      conta.set(cor, (conta.get(cor) ?? 0) + 1);
      total++;
    }
  if (total < 50) return [];

  const ordem = [...conta.entries()].sort((a, b) => b[1] - a[1]);
  const cores = ordem
    .filter(([cor, c], i) => i === 0 || c / total >= (cor === 'cinza' ? FATIA_CINZA : FATIA_MINIMA))
    .slice(0, MAX_CORES);
  return cores.map(([cor]) => cor);
}

const catalogo = JSON.parse(await fs.readFile('public/data/catalog.json', 'utf8'));
const capas = JSON.parse(await fs.readFile('data/capas.json', 'utf8').catch(() => '{}'));
const somente = process.argv.find((a) => a.startsWith('--ids='))?.slice(6).split(',');
const produtos = catalogo.products.filter((p) => (p.photos ?? 0) > 0 && (!somente || somente.includes(p.id)));

const cores = JSON.parse(await fs.readFile(SAIDA, 'utf8').catch(() => '{}'));
const limit = pLimit(6);
let feitos = 0;
await Promise.all(
  produtos.map((p) =>
    limit(async () => {
      const capa = capas[p.id] ?? p.cover ?? 0;
      try {
        cores[p.id] = await coresDaFoto(path.join(IMG, p.id, `${capa}-thumb.webp`));
      } catch {
        // foto que não abre: fica sem cor, e o produto só não aparece no filtro
      }
      if (++feitos % 1000 === 0) console.log(`  ${feitos}/${produtos.length}`);
    }),
  ),
);
await fs.writeFile(SAIDA, JSON.stringify(cores));

const porCor = {};
for (const lista of Object.values(cores)) for (const c of lista) porCor[c] = (porCor[c] ?? 0) + 1;
console.log(`Pronto: ${Object.keys(cores).length} produtos.`, porCor);
console.log('Agora: npm run build-catalog');
