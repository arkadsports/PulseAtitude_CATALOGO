// ROUPAS, ETAPA 1 — Lê as camisas e bermudas do fornecedor de roupas no Yupoo.
//
// Fornecedor separado do de tênis: o endereço fica em YUPOO_ROUPAS, no .env
// (pelo mesmo motivo do YUPOO_BASE — de quem a Pulse compra não entra no Git).
// As categorias lidas e o que cada uma vira estão em CATEGORIAS, abaixo.
//
//   npm run sync-roupas      -> data/raw-roupas/albuns.json (retoma: pula álbum já lido)
//
// Cada álbum é um modelo em várias cores. Daqui sai a lista de fotos e, quando
// o fornecedor escreve, a descrição: 品牌 (marca), 尺码 (tamanhos), 颜色 (cores).
import fs from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';
import pLimit from 'p-limit';

const BASE = (process.env.YUPOO_ROUPAS || '').replace(/\/$/, '');
if (!BASE) {
  console.error('Falta YUPOO_ROUPAS no .env (o endereço do fornecedor de roupas).');
  process.exit(1);
}

/** Categoria do fornecedor -> o tipo de produto no site. */
export const CATEGORIAS = {
  4461936: 'camisa', // 短袖 — manga curta
  4151736: 'bermuda', // 短裤 — shorts
};

const RAW = path.resolve('data/raw-roupas');
const SAIDA = path.join(RAW, 'albuns.json');
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36',
  Referer: BASE + '/',
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, tries = 4) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(20000) });
      if (res.ok) return await res.text();
    } catch {
      // tenta de novo
    }
    await sleep(1500 * i);
  }
  throw new Error(`Falhou: ${url}`);
}

async function albunsDaCategoria(cat) {
  const ids = [];
  for (let page = 1; page < 50; page++) {
    const $ = cheerio.load(await get(`${BASE}/categories/${cat}?isSubCate=false&page=${page}`));
    const antes = ids.length;
    $('a.album__main').each((_, a) => {
      const id = ($(a).attr('href') || '').match(/albums\/(\d+)/)?.[1];
      if (id && !ids.includes(id)) ids.push(id);
    });
    if (ids.length === antes || $('a.album__main').length < 100) break;
    await sleep(300);
  }
  return ids;
}

async function lerAlbum(id) {
  const $ = cheerio.load(await get(`${BASE}/albums/${id}?uid=1`));
  const fotos = $('img.image__img')
    .map((_, img) => $(img).attr('data-origin-src') || $(img).attr('data-src') || $(img).attr('src'))
    .get()
    .filter(Boolean)
    .map((u) => (u.startsWith('//') ? 'https:' + u : u));
  return {
    titulo: $('.showalbumheader__gallerytitle').text().trim(),
    descricao: $('.showalbumheader__gallerysubtitle').text().trim().replace(/\s+/g, ' '),
    fotos: [...new Set(fotos)],
  };
}

await fs.mkdir(RAW, { recursive: true });
const albuns = JSON.parse(await fs.readFile(SAIDA, 'utf8').catch(() => '{}'));

for (const [cat, tipo] of Object.entries(CATEGORIAS)) {
  const ids = await albunsDaCategoria(cat);
  console.log(`${tipo}: ${ids.length} álbuns`);
  const limit = pLimit(3);
  let lidos = 0;
  await Promise.all(
    ids.map((id) =>
      limit(async () => {
        if (albuns[id]?.fotos?.length) return;
        try {
          albuns[id] = { id, tipo, ...(await lerAlbum(id)) };
        } catch (e) {
          console.warn(`  álbum ${id}: ${e.message}`);
        }
        if (++lidos % 50 === 0) {
          await fs.writeFile(SAIDA, JSON.stringify(albuns));
          console.log(`  ${lidos} lidos`);
        }
        await sleep(250);
      }),
    ),
  );
  await fs.writeFile(SAIDA, JSON.stringify(albuns));
}

const todos = Object.values(albuns);
const fotos = todos.reduce((s, a) => s + a.fotos.length, 0);
const comMarca = todos.filter((a) => /品牌/.test(a.descricao)).length;
console.log(`Pronto: ${todos.length} álbuns, ${fotos} fotos listadas, ${comMarca} com marca na descrição.`);
console.log('Próximo passo: npm run roupas-fotos');
