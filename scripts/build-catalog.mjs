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
// Capa de cada produto, escolhida por "npm run capas" para nunca ser a sola.
const CAPAS = path.resolve('data/capas.json');
// Cores de cada produto, tiradas da foto de capa por "npm run cores".
const CORES = path.resolve('data/cores.json');
// Mesmos nomes de COLORS, em src/config.ts: é o texto que o cliente lê.
const NOME_COR = {
  preto: 'Preto', branco: 'Branco', cinza: 'Cinza', bege: 'Bege', marrom: 'Marrom', vermelho: 'Vermelho',
  rosa: 'Rosa', laranja: 'Laranja', amarelo: 'Amarelo', verde: 'Verde', azul: 'Azul', roxo: 'Roxo',
};

// ---------------------------------------------------------------------------
// Marcas: o slug do site e os jeitos de escrever que o fornecedor usa.
// Mantenha alinhado com BRANDS em src/config.ts.
// ---------------------------------------------------------------------------
// Os nomes em chinês são os que o fornecedor usa nas categorias e nos títulos.
const MARCAS = [
  ['nike', ['nike', 'air jordan', 'jordan', 'air force', 'dunk', '耐克', '空军']],
  ['on', ['on running', 'on cloud', 'oncloud', '昂跑']],
  ['adidas', ['adidas', 'yeezy', '阿迪']],
  ['asics', ['asics', '亚瑟士']],
  ['new-balance', ['new balance', 'newbalance', 'nb ', '新百伦']],
  ['puma', ['puma', '彪马']],
  ['mizuno', ['mizuno', '美津浓']],
  ['vans', ['vans', '万斯']],
];

// O que sai do nome do produto: só o nome da marca, nunca o do modelo
// ("On Cloud 5" continua "Cloud 5", "Air Jordan 1" continua "Air Jordan 1").
const MARCA_NO_NOME = ['nike', 'on running', 'adidas', 'asics', 'new balance', 'newbalance', 'puma', 'mizuno', 'vans'];

// Uso. A ordem importa: a primeira que casar vence.
const USOS = [
  ['running', [
    'running', 'run ', 'corrida', '跑鞋', '跑步', '马拉松',
    'pegasus', 'vomero', 'alphafly', 'vaporfly', 'zoom fly', 'invincible', 'structure', 'streakfly',
    'adizero', 'ultraboost', 'supernova', 'adistar', 'solarglide',
    'nimbus', 'novablast', 'kayano', 'cumulus', 'wave rider', 'fresh foam', '1080', '880',
    'cloudmonster', 'cloudsurfer', 'cloudflow', 'cloudrunner', 'cloudboom', 'cloudeclipse', 'cloudstratus',
    'velocity nitro', 'deviate nitro', 'magnify nitro',
  ]],
  ['training', ['training', 'trainer', 'gym', 'treino', 'crossfit', 'dropset', 'metcon', '训练']],
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
  const trecho = t.split(/size|eur|tamanho|尺码|码/)[1];
  if (trecho) {
    const soltos = [...trecho.matchAll(/\b(3[3-9]|4[0-6])\b/g)].map((m) => m[1]);
    if (soltos.length) return [...new Set(soltos)].sort((a, b) => Number(a) - Number(b));
  }
  return [];
}

/** Código do modelo que o fornecedor escreve depois de "货号：" — "HF3704 001". */
function acharCodigo(titulo) {
  const m = (titulo || '').match(/(?:货号|号)\s*[:：]?\s*([A-Z0-9]{4,}(?:[\s-][A-Z0-9]{3})?)/i);
  return m ? m[1].replace(/\s+/g, ' ').toUpperCase() : '';
}

/** Nome do produto: tira marca, tamanhos e ruído do título do fornecedor. */
function limparNome(titulo) {
  // Tudo depois de "尺码" (tamanho) é a grade; o resto em chinês é descrição
  // ("舒适 织物 透气" = confortável, tecido, respirável) e não entra no nome.
  let n = (titulo || '').split(/尺码|码数|货号|号\s*[:：]/)[0];
  n = n.replace(/[　-〿㐀-鿿＀-￯]+/g, ' ');
  for (const a of MARCA_NO_NOME) n = n.replace(new RegExp(`\\b${a}\\b`, 'ig'), ' ');
  // O fornecedor às vezes corta a primeira letra da marca: "ike Air Jordan", "didas Samba".
  n = n.replace(/^\s*(n?ike|ke|a?didas|das|ordan)\b/i, ' ');
  n = n
    .replace(/\b(size|eur|tamanho|sizes?)\b[\s:]*[\d\s\-~–,]*/gi, ' ')
    .replace(/\b(3[0-9]|4[0-9])\s*[-~–]\s*(3[0-9]|4[0-9])\b/g, ' ')
    .replace(/[#@]\S+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s\-–—|,.:#×]+|[\s\-–—|,.:#×]+$/g, '')
    .trim();
  // Inicial maiúscula: o fornecedor escreve "originals SAMBA".
  return n ? n[0].toUpperCase() + n.slice(1) : 'Modelo sem nome';
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
  const capas = await ler(CAPAS, {});
  const cores = await ler(CORES, {});

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

    const codigo = acharCodigo(a.title);
    let fotos = manifest[id] ?? 0;
    if (!fotos) {
      const lista = await ler(path.join(RAW, 'photos', `${id}.json`), []);
      fotos = lista.length;
    }

    const suasCores = cores[id] ?? [];
    products.push({
      id,
      // Título todo em chinês: o que sobra para identificar o par é o código.
      name: limparNome(a.title) === 'Modelo sem nome' && codigo ? `Ref. ${codigo}` : limparNome(a.title),
      tags: codigo ? [codigo] : [],
      brand: marca,
      category: acharUso(a.title, textoCat),
      colorway: suasCores.map((c) => NOME_COR[c] ?? c).join(' / '),
      colors: suasCores,
      sizes: acharTamanhos(a.title),
      photos: fotos,
      cover: Math.min(capas[id] ?? 0, Math.max(fotos - 1, 0)),
      price: null,
    });
  }

  // Mais novo primeiro: o número do álbum cresce com o tempo no Yupoo, e é esta
  // ordem que a vitrine usa em "O que chegou" e na grade.
  products.sort((x, y) => Number(y.id) - Number(x.id));

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
