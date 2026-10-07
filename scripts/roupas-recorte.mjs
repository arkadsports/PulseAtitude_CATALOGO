// ROUPAS, ETAPA 3b — Recorta cada foto de roupa em volta da peça.
//
// O fornecedor escreve uma etiqueta no canto de cima, à esquerda (código, cor
// em chinês e tamanhos: "2217 黑色 M-3XL"), e a peça fica pequena no meio de
// muito fundo. Aqui a etiqueta é apagada (pintada com a cor do fundo, sem
// tocar na peça) e a foto vira um quadrado em volta da peça — ou da pessoa,
// nas fotos com modelo.
//
// Trabalha sobre os <n>-full.webp de IMG_DIR/<álbum>-<cor>/ e refaz os
// <n>-thumb.webp. Cada pasta recortada ganha um ".recortado" e não é
// recortada de novo.
//
//   npm run roupas-recorte
// Depois: npm run upload-images -- --filtro=- --forcar  e  npm run og-imagens -- --forcar=-
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import pLimit from 'p-limit';

sharp.cache(false);
const IMG = path.resolve(process.env.IMG_DIR || 'public/img');
const L = 200; // resolução da análise
const ETIQUETA = { x: 0.32, y: 0.18 }; // canto onde o fornecedor escreve
const FOLGA = 0.05;
const existe = (f) => fs.access(f).then(() => true, () => false);

/** Apaga a etiqueta: no canto dela, o que não é fundo e NÃO está ligado à
 *  peça (letras, logo solta) vira cor de fundo. A peça é a maior mancha
 *  contínua da foto — manga ou gola que entra no canto continua lá. */
async function semEtiqueta(buf) {
  const M = 320;
  const { width: W, height: H } = await sharp(buf).metadata();
  const { data } = await sharp(buf).resize(M, M, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = (x, y) => {
    const i = (y * M + x) * 3;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const fundoDaLinha = (y) => {
    const a = px(1, y);
    const b = px(M - 2, y);
    return a.map((v, k) => (v + b[k]) / 2);
  };
  const cheio = new Uint8Array(M * M);
  for (let y = 0; y < M; y++) {
    const f = fundoDaLinha(y);
    for (let x = 0; x < M; x++) {
      const p = px(x, y);
      if (Math.hypot(p[0] - f[0], p[1] - f[1], p[2] - f[2]) >= 28) cheio[y * M + x] = 1;
    }
  }
  // Manchas (4 vizinhos); guarda a maior.
  const mancha = new Int32Array(M * M).fill(-1);
  let maior = -1;
  let tamMaior = 0;
  let id = 0;
  for (let i = 0; i < M * M; i++) {
    if (!cheio[i] || mancha[i] >= 0) continue;
    let tam = 0;
    const pilha = [i];
    mancha[i] = id;
    while (pilha.length) {
      const j = pilha.pop();
      tam++;
      const x = j % M;
      const y = (j / M) | 0;
      for (const k of [x > 0 ? j - 1 : -1, x < M - 1 ? j + 1 : -1, y > 0 ? j - M : -1, y < M - 1 ? j + M : -1]) {
        if (k >= 0 && cheio[k] && mancha[k] < 0) {
          mancha[k] = id;
          pilha.push(k);
        }
      }
    }
    if (tam > tamMaior) {
      tamMaior = tam;
      maior = id;
    }
    id++;
  }
  // O que apagar: no canto da etiqueta, fora da peça, um pouco engordado.
  const tinta = Buffer.alloc(M * M * 4);
  let algo = false;
  for (let y = 0; y < M * ETIQUETA.y * 1.3; y++)
    for (let x = 0; x < M * ETIQUETA.x * 1.3; x++) {
      const i = y * M + x;
      if (!cheio[i] || mancha[i] === maior) continue;
      algo = true;
      const f = fundoDaLinha(y);
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= M || yy >= M || mancha[yy * M + xx] === maior) continue;
          const o = (yy * M + xx) * 4;
          tinta[o] = f[0];
          tinta[o + 1] = f[1];
          tinta[o + 2] = f[2];
          tinta[o + 3] = 255;
        }
    }
  if (!algo) return buf;
  const camada = await sharp(tinta, { raw: { width: M, height: M, channels: 4 } })
    .resize(W, H, { fit: 'fill', kernel: 'nearest' })
    .png()
    .toBuffer();
  return sharp(buf).composite([{ input: camada }]).webp({ quality: 92 }).toBuffer();
}

/** Caixa da peça: o que difere do fundo (medido nas bordas), sem a etiqueta. */
async function caixa(buf) {
  const { width: W, height: H } = await sharp(buf).metadata();
  const { data } = await sharp(buf).resize(L, L, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = (x, y) => {
    const i = (y * L + x) * 3;
    return [data[i], data[i + 1], data[i + 2]];
  };
  // Fundo por linha, nas laterais (o estúdio de fundo cinza tem degradê).
  const fundo = (y) => {
    const a = px(1, y);
    const b = px(L - 2, y);
    return a.map((v, k) => (v + b[k]) / 2);
  };
  let x0 = L, y0 = L, x1 = -1, y1 = -1;
  for (let y = 0; y < L; y++) {
    const f = fundo(y);
    for (let x = 0; x < L; x++) {
      if (x < L * ETIQUETA.x && y < L * ETIQUETA.y) continue;
      const p = px(x, y);
      if (Math.hypot(p[0] - f[0], p[1] - f[1], p[2] - f[2]) < 28) continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
  }
  if (x1 < 0 || (x1 - x0) * (y1 - y0) < L * L * 0.05) return null;
  // Quadrado em volta da peça, com folga, sem sair da foto.
  const cx = (x0 + x1) / 2 / L;
  const cy = (y0 + y1) / 2 / L;
  let lado = Math.max((x1 - x0) / L * W, (y1 - y0) / L * H) * (1 + FOLGA * 2);
  lado = Math.min(lado, W, H);
  const left = Math.round(Math.min(Math.max(cx * W - lado / 2, 0), W - lado));
  const top = Math.round(Math.min(Math.max(cy * H - lado / 2, 0), H - lado));
  return { left, top, width: Math.round(lado), height: Math.round(lado), fundo: fundo(L - 2).map(Math.round) };
}

const dirs = (await fs.readdir(IMG, { withFileTypes: true })).filter((d) => d.isDirectory() && /^\d+-\d+$/.test(d.name));
console.log(`${dirs.length} produtos de roupa...`);
const limit = pLimit(4);
let feitos = 0;
let recortadas = 0;
await Promise.all(
  dirs.map((d) =>
    limit(async () => {
      const dir = path.join(IMG, d.name);
      if (await existe(path.join(dir, '.recortado'))) return;
      for (let n = 0; ; n++) {
        const full = path.join(dir, `${n}-full.webp`);
        if (!(await existe(full))) break;
        const original = await fs.readFile(full);
        const buf = await semEtiqueta(original).catch(() => original);
        const c = await caixa(buf).catch(() => null);
        if (!c) continue;
        const { fundo, ...regiao } = c;
        const quadrado = await sharp(buf).extract(regiao).toBuffer();
        await sharp(quadrado).resize(1600, 1600, { fit: 'contain', background: { r: fundo[0], g: fundo[1], b: fundo[2] }, withoutEnlargement: true }).webp({ quality: 84 }).toFile(full);
        await sharp(quadrado).resize(600, 600, { fit: 'contain', background: { r: fundo[0], g: fundo[1], b: fundo[2] } }).webp({ quality: 76 }).toFile(path.join(dir, `${n}-thumb.webp`));
        recortadas++;
      }
      await fs.writeFile(path.join(dir, '.recortado'), '');
      if (++feitos % 250 === 0) console.log(`  ${feitos}/${dirs.length}`);
    }),
  ),
);
console.log(`Pronto: ${recortadas} fotos recortadas.`);
