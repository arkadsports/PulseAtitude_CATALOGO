// ETAPA 3 — Baixa as fotos dos álbuns, converte para WebP e salva em IMG_DIR/<álbum>/ (padrão: public/img).
// Para cada foto gera 2 arquivos:
//   <n>-thumb.webp  (600 px, para a grade)
//   <n>-full.webp   (1600 px, para a página do produto e o zoom)
//
//   npm run images                     -> todos os álbuns (retoma de onde parou)
//   npm run images -- --covers         -> só a 1ª foto de cada álbum (rápido)
//   npm run images -- --brand=nike     -> só uma marca
//   npm run images -- --limit=50       -> só os 50 primeiros (para testar)
//   npm run images -- --max=5          -> no máximo 5 fotos por álbum
//
// Depois de baixar, rode de novo: npm run build-catalog
//
// IMPORTANTE: as fotos são do fornecedor. Confirme com ele que a Pulse pode
// usá-las na revenda antes de publicar o site.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import pLimit from 'p-limit';

const BASE = (process.env.YUPOO_BASE || '').replace(/\/$/, '');
const RAW = path.resolve('data/raw');
// Pasta das fotos. IMG_DIR no .env tira do projeto (e do OneDrive) os GB de fotos.
const IMG = path.resolve(process.env.IMG_DIR || 'public/img');
const MANIFEST = path.resolve('data/images.json');
const args = Object.fromEntries(
  process.argv
    .slice(2)
    .map((a) => a.replace(/^--/, '').split('='))
    .map(([k, v]) => [k, v ?? true]),
);
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36',
  Referer: BASE + '/',
};
const SIZES = { thumb: { width: 600, quality: 76 }, full: { width: 1600, quality: 84 } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const exists = (f) => fs.access(f).then(() => true, () => false);

async function download(url, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(30000) });
      if (res.ok) return Buffer.from(await res.arrayBuffer());
      if (res.status === 404) return null;
    } catch {}
    await sleep(1500 * i);
  }
  return null;
}

async function main() {
  const albums = JSON.parse(await fs.readFile(path.join(RAW, 'albums.json'), 'utf8'));
  const manifest = JSON.parse(await fs.readFile(MANIFEST, 'utf8').catch(() => '{}'));
  let ids = Object.keys(albums).filter((id) => !albums[id].locked);

  // Só o que virou produto: álbum de marca que o site não vende não gasta disco.
  const catalogo = JSON.parse(
    await fs.readFile('public/data/catalog.json', 'utf8').catch(() => '{"products":[]}'),
  );
  if (!catalogo.demo && catalogo.products.length) {
    const noSite = new Set(catalogo.products.map((p) => p.id));
    ids = ids.filter((id) => noSite.has(id));
  }

  if (args.brand) {
    const catalog = JSON.parse(
      await fs.readFile('public/data/catalog.json', 'utf8').catch(() => '{"products":[]}'),
    );
    const set = new Set(catalog.products.filter((p) => p.brand === args.brand).map((p) => p.id));
    if (!set.size) throw new Error(`Nenhum produto da marca "${args.brand}". Rode npm run build-catalog.`);
    ids = ids.filter((id) => set.has(id));
  }
  if (args.limit) ids = ids.slice(0, Number(args.limit));
  console.log(`Baixando fotos de ${ids.length} álbuns${args.covers ? ' (só capas)' : ''}...`);

  const limit = pLimit(4);
  let done = 0,
    photos = 0,
    failed = 0;
  const save = async () => fs.writeFile(MANIFEST, JSON.stringify(manifest));

  await Promise.all(
    ids.map((id) =>
      limit(async () => {
        let urls = JSON.parse(
          await fs.readFile(path.join(RAW, 'photos', `${id}.json`), 'utf8').catch(() => '[]'),
        );
        if (!urls.length && albums[id].cover) urls = [albums[id].cover.replace(/\/(small|medium)\./, '/big.')];
        if (args.covers) urls = urls.slice(0, 1);
        else if (args.max) urls = urls.slice(0, Number(args.max));
        const dir = path.join(IMG, id);
        await fs.mkdir(dir, { recursive: true });

        let ok = 0;
        for (let n = 0; n < urls.length; n++) {
          const full = path.join(dir, `${ok}-full.webp`);
          if (await exists(full)) {
            ok++;
            continue; // já baixada
          }
          const buf = await download(urls[n]);
          if (!buf) {
            failed++;
            continue;
          }
          try {
            for (const [name, s] of Object.entries(SIZES)) {
              await sharp(buf)
                .rotate()
                .resize({ width: s.width, withoutEnlargement: true })
                .webp({ quality: s.quality })
                .toFile(path.join(dir, `${ok}-${name}.webp`));
            }
            ok++;
            photos++;
          } catch {
            failed++;
          }
          await sleep(150);
        }
        manifest[id] = Math.max(manifest[id] || 0, ok);
        if (++done % 50 === 0) {
          await save();
          console.log(`  ${done}/${ids.length} álbuns · ${photos} fotos novas`);
        }
      }),
    ),
  );

  await save();
  console.log(`Pronto: ${photos} fotos novas, ${failed} falhas. Agora rode: npm run build-catalog`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
