// ETAPA 2 — Transforma os dados brutos de data/raw/ em public/data/catalog.json,
// que é o único arquivo que o site lê.
//
//   npm run build-catalog
//
// O que ele faz: para cada álbum do fornecedor, descobre a MARCA, o USO
// (running/training/casual), os TAMANHOS e um nome limpo. O fornecedor escreve
// o título de qualquer jeito — "Nike Air Zoom Pegasus 41 size 36-45" — então
// aqui é tudo por reconhecimento de padrão, e o que não for reconhecido cai em
// "sem marca" e sai listado no fim para conferência à mão.
//
// Preço NÃO sai daqui: fica "null" e o site mostra "Sob consulta" até alguém
// preencher (em src/config.ts, por marca, ou no próprio produto).
import fs from 'node:fs/promises';
import path from 'node:path';

const RAW = path.resolve('data/raw');
const SAIDA = path.resolve('public/data/catalog.json');
const MANIFEST = path.resolve('data/images.json');

// ---------------------------------------------------------------------------
// Marcas: o slug do site e os jeitos de escrever que o fornecedor usa.
// Mantenha alinhado com BRANDS em src/config.ts.
// ---------------------------------------------------------------------------
const MARCAS = [
  ['nike', ['nike', 'air jordan', 'jordan']],
  ['on', ['on running', 'on cloud', 'oncloud']],
  ['adidas', ['adidas', 'yeezy']],
  ['asics', ['asics']],
  ['new-balance', ['new balance', 'newbalance', 'nb ']],
  ['puma', ['puma']],
  ['mizuno', ['mizuno']],
  ['vans', ['vans']],
];

// Uso. A ordem importa: a primeira que casar vence.
const USOS = [
  ['running', ['running', 'run ', 'corrida', 'pegasus', 'nimbus', 'novablast', 'wave rider', 'cloudmonster', 'adizero', '1080']],
  ['training', ['training', 'trainer', 'gym', 'treino', 'crossfit', 'dropset', 'metcon']],
  ['casual', ['casual', 'lifestyle', 'skate', 'retro', 'classic', 'old skool', 'samba', 'suede', 'dunk', 'force']],
];

const USO_PADRAO = 'casual';

const normal = (s) =>
  (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

function acharMarca(...textos) {
  const t = ' ' + normal(textos.join(' ')) + ' ';
  for (const [slug, apelidos] of MARCAS) if (apelidos.some((a) => t.includes(a))) return slug;
  return null;
}

function acharUso(...textos) {
  const t = ' ' + normal(textos.join(' ')) + ' ';
  for (const [slug, palavras] of USOS) if (palavras.some((p) => t.includes(p))) return slug;
  return USO_PADRAO;
}

/** Tamanhos a partir do título: "36-45", "size 39~44", "eur 40 41 42". */
function acharTamanhos(titulo) {
  const t = normal(titulo);
  const faixa = t.match(/(3[0-9]|4[0-9])\s*[-~a–]\s*(3[0-9]|4[0-9])/);
  if (faixa) {
    const de = Number(faixa[1]);
    const ate = Number(faixa[2]);
    if (ate >= de && ate - de <= 14) {
      const out = [];
      for (let i = de; i <= ate; i++) out.push(String(i));
      return out;
    }
  }
  // Sem faixa: pega números soltos de 33 a 46 que apareçam depois de "size"/"eur".
  const trecho = t.split(/size|eur|tamanho/)[1];
  if (trecho) {
    const soltos = [...trecho.matchAll(/\b(3[3-9]|4[0-6])\b/g)].map((m) => m[1]);
    if (soltos.length) return [...new Set(soltos)].sort((a, b) => Number(a) - Number(b));
  }
  return [];
}

/** Nome do produto: tira marca, tamanhos e ruído do título do fornecedor. */
function limparNome(titulo, marcaSlug) {
  let n = (titulo || '').trim();
  const apelidos = MARCAS.find(([s]) => s === marcaSlug)?.[1] ?? [];
  for (const a of apelidos) n = n.replace(new RegExp(a.trim(), 'ig'), ' ');
  n = n
    .replace(/\b(size|eur|tamanho|sizes?)\b[\s:]*[\d\s\-~–,]*/gi, ' ')
    .replace(/\b(3[0-9]|4[0-9])\s*[-~–]\s*(3[0-9]|4[0-9])\b/g, ' ')
    .replace(/[#@]\S+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s\-–—|,.]+|[\s\-–—|,.]+$/g, '')
    .trim();
  return n || 'Modelo sem nome';
}

const ler = async (f, padrao) => {
  try {
    return JSON.parse(await fs.readFile(f, 'utf8'));
  } catch {
    return padrao;
  }
};

async function main() {
  const albums = await ler(path.join(RAW, 'albums.json'), null);
  if (!albums) {
    console.error('Não achei data/raw/albums.json. Rode primeiro: npm run sync');
    process.exit(1);
  }
  const cats = await ler(path.join(RAW, 'categories.json'), []);
  const nomeCat = new Map(cats.map((c) => [c.id, c.name]));
  // Quantas fotos cada álbum tem baixadas; sem manifesto, conta a lista bruta.
  const manifest = await ler(MANIFEST, {});

  const products = [];
  const semMarca = [];

  for (const [id, a] of Object.entries(albums)) {
    if (a.locked) continue;

    const textoCat = (a.categories ?? []).map((c) => nomeCat.get(c) ?? '').join(' ');
    const marca = acharMarca(a.title, textoCat);
    if (!marca) {
      semMarca.push(`${id} · ${a.title}`);
      continue;
    }

    let fotos = manifest[id] ?? 0;
    if (!fotos) {
      const lista = await ler(path.join(RAW, 'photos', `${id}.json`), []);
      fotos = lista.length;
    }

    products.push({
      id,
      name: limparNome(a.title, marca),
      brand: marca,
      category: acharUso(a.title, textoCat),
      colorway: '',
      sizes: acharTamanhos(a.title),
      photos: fotos,
      cover: 0,
      price: null,
    });
  }

  products.sort((x, y) => x.brand.localeCompare(y.brand) || x.name.localeCompare(y.name));

  await fs.mkdir(path.dirname(SAIDA), { recursive: true });
  await fs.writeFile(
    SAIDA,
    JSON.stringify({ generatedAt: new Date().toISOString(), products }, null, 2) + '\n',
  );

  const porMarca = {};
  for (const p of products) porMarca[p.brand] = (porMarca[p.brand] ?? 0) + 1;
  console.log(`catalog.json: ${products.length} produtos`);
  for (const [m, n] of Object.entries(porMarca).sort((a, b) => b[1] - a[1])) console.log(`  ${m}: ${n}`);

  if (semMarca.length) {
    console.log(`\n${semMarca.length} álbuns ficaram sem marca reconhecida. Os 20 primeiros:`);
    for (const s of semMarca.slice(0, 20)) console.log('  ' + s);
    console.log('Acrescente o apelido que faltou na lista MARCAS, no topo deste arquivo.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
