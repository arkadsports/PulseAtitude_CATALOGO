// ROUPAS, ETAPA 3 — Baixa só as fotos escolhidas (frente e costas de cada cor)
// na resolução original e grava como as dos tênis: IMG_DIR/<produto>/<n>-thumb.webp
// e <n>-full.webp. O produto é "<álbum>-<cor>" (ver roupas-fotos.mjs).
//
//   npm run roupas-imagens        (pula o que já existe)
// Depois: npm run build-catalog, npm run upload-images e npm run og-imagens.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import pLimit from 'p-limit';

const BASE = (process.env.YUPOO_ROUPAS || '').replace(/\/$/, '');
const IMG = path.resolve(process.env.IMG_DIR || 'public/img');
const MANIFEST = path.resolve('data/images.json');
const HEADERS = { 'User-Agent': 'Mozilla/5.0 Chrome/128.0', Referer: BASE + '/' };
const SIZES = { thumb: { width: 600, quality: 76 }, full: { width: 1600, quality: 84 } };
const existe = (f) => fs.access(f).then(() => true, () => false);

async function baixar(url) {
  for (let i = 1; i <= 3; i++) {
    try {
      const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(30000) });
      if (r.ok) return Buffer.from(await r.arrayBuffer());
      if (r.status === 404) return null;
    } catch {
      // tenta de novo
    }
    await new Promise((r) => setTimeout(r, 1500 * i));
  }
  return null;
}

const escolhas = JSON.parse(await fs.readFile('data/roupas.json', 'utf8'));
const manifest = JSON.parse(await fs.readFile(MANIFEST, 'utf8').catch(() => '{}'));
const produtos = Object.entries(escolhas).flatMap(([album, cores]) =>
  cores.map((c, k) => ({ id: `${album}-${k}`, fotos: c.fotos })),
);
console.log(`${produtos.length} produtos de roupa, ${produtos.reduce((s, p) => s + p.fotos.length, 0)} fotos...`);

const limit = pLimit(4);
let novas = 0;
let falhas = 0;
let feitos = 0;
await Promise.all(
  produtos.map((p) =>
    limit(async () => {
      const dir = path.join(IMG, p.id);
      await fs.mkdir(dir, { recursive: true });
      let ok = 0;
      for (const url of p.fotos) {
        if (await existe(path.join(dir, `${ok}-full.webp`))) {
          ok++;
          continue;
        }
        const buf = await baixar(url);
        if (!buf) {
          falhas++;
          continue;
        }
        try {
          for (const [nome, s] of Object.entries(SIZES)) {
            await sharp(buf)
              .rotate()
              .resize({ width: s.width, withoutEnlargement: true })
              .webp({ quality: s.quality })
              .toFile(path.join(dir, `${ok}-${nome}.webp`));
          }
          ok++;
          novas++;
        } catch {
          falhas++;
        }
      }
      manifest[p.id] = ok;
      if (++feitos % 200 === 0) {
        await fs.writeFile(MANIFEST, JSON.stringify(manifest));
        console.log(`  ${feitos}/${produtos.length}`);
      }
    }),
  ),
);
await fs.writeFile(MANIFEST, JSON.stringify(manifest));
console.log(`Pronto: ${novas} fotos novas, ${falhas} falhas. Agora: npm run build-catalog`);
