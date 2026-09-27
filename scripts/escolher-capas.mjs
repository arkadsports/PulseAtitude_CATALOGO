// ETAPA 3b — Escolhe a foto de capa de cada produto: nunca a sola.
//
// O fornecedor abre quase todo álbum pela sola (foto 0) e segue com o tênis de
// lado (foto 1). A regra parte disso — a capa é a foto 1 — e só volta para a
// foto 0 quando um modelo de visão (CLIP, rodando aqui no computador) tem
// certeza das duas coisas: a foto 1 parece MUITO mais sola que a 0, e a 0
// claramente não é sola. É o álbum que o fornecedor montou ao contrário.
//
// Por que não deixar o modelo decidir sozinho: em tênis de uma cor só (todo
// preto, todo vermelho) ele não distingue sola de lateral e errava ~3% das
// capas. Com a posição mandando e o modelo só vetando, sobrou 1 em 96.
//
//   npm i --no-save @huggingface/transformers   (uma vez; ~250 MB, fica fora do package.json)
//   npm run capas                               (retoma de onde parou)
//   npm run build-catalog                       (grava a capa no catálogo)
//
// Resultado: data/capas.json, { "<álbum>": <índice da foto de capa> }, e as
// notas do modelo em data/capas-notas.json — mudar a regra abaixo não exige
// rodar o modelo de novo, só este script (ele reaproveita as notas).
import fs from 'node:fs/promises';
import path from 'node:path';

const IMG = path.resolve(process.env.IMG_DIR || 'public/img');
const SAIDA = path.resolve('data/capas.json');
const NOTAS = path.resolve('data/capas-notas.json');
// Duas opções só: com mais rótulos o modelo se confundia mais.
const SOLA = 'the underside of a shoe showing the rubber outsole';
const ROTULOS = [SOLA, 'a shoe'];

/** A regra: [nota de sola da foto 0, da foto 1] -> índice da capa. */
function capa([s0, s1]) {
  const foto1ESola = s1 - s0 > 0.2;
  const foto0NaoESola = s0 < 0.2;
  return foto1ESola && foto0NaoESola ? 0 : 1;
}

const catalogo = JSON.parse(await fs.readFile('public/data/catalog.json', 'utf8'));
const notas = JSON.parse(await fs.readFile(NOTAS, 'utf8').catch(() => '{}'));
const comDuas = catalogo.products.filter((p) => (p.photos ?? 0) >= 2);
const pendentes = comDuas.filter((p) => !(p.id in notas));
console.log(`${pendentes.length} produtos para o modelo avaliar (${comDuas.length - pendentes.length} já avaliados)...`);

if (pendentes.length) {
  let pipeline;
  try {
    ({ pipeline } = await import('@huggingface/transformers'));
  } catch {
    console.error('Falta o modelo de visão. Rode uma vez: npm i --no-save @huggingface/transformers');
    process.exit(1);
  }
  const clf = await pipeline('zero-shot-image-classification', 'Xenova/clip-vit-base-patch32');
  const nota = async (id, n) => {
    try {
      const out = await clf(path.join(IMG, id, `${n}-thumb.webp`), ROTULOS);
      return +out.find((o) => o.label === SOLA).score.toFixed(3);
    } catch {
      return 1; // foto que não abre conta como sola: não vira capa
    }
  };
  let feitos = 0;
  for (const p of pendentes) {
    notas[p.id] = [await nota(p.id, 0), await nota(p.id, 1)];
    if (++feitos % 200 === 0) {
      await fs.writeFile(NOTAS, JSON.stringify(notas));
      console.log(`  ${feitos}/${pendentes.length}`);
    }
  }
  await fs.writeFile(NOTAS, JSON.stringify(notas));
}

const capas = {};
for (const p of comDuas) capas[p.id] = capa(notas[p.id]);
await fs.writeFile(SAIDA, JSON.stringify(capas));
const naZero = Object.values(capas).filter((i) => i === 0).length;
console.log(`Pronto: ${Object.keys(capas).length} capas, ${naZero} ficam na foto 0. Agora: npm run build-catalog`);
