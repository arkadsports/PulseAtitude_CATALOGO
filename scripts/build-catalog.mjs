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

// ---------------------------------------------------------------------------
// Tipo de tênis: running, training ou casual. Um tipo só por produto, e ele
// vale para qualquer marca — é o que o filtro "Tipo de tênis" usa, à risca.
//
// Quem decide é o MODELO, lido no nome (nunca no código do produto: "880"
// dentro de "DW8806" fazia Air Force 1 virar corrida). As listas são olhadas
// nesta ordem, e a primeira que casar vence:
//   1. modelos casuais — o fornecedor chama de "跑鞋" (tênis de corrida) até
//      P-6000 e Air Force; o modelo manda mais que a descrição;
//   2. modelos de treino;
//   3. modelos de corrida.
// Modelo que não está em lista nenhuma cai nas palavras da descrição
// (PALAVRAS_TIPO) e, sem nada, em casual.
// Achou um tênis no tipo errado? Acrescente o modelo na lista certa.
// ---------------------------------------------------------------------------
const MODELOS_TIPO = [
  ['casual', [
    // Nike
    'air force', 'af1', 'force 1', 'force1', 'dunk', 'jordan', 'aj1', 'aj4', 'p-6000', 'p6000', 'v2k', 'vomero 5',
    'initiator', 'moon shoe', 'cortez', 'blazer', 'air max', 'killshot', 'bapesta', 'mind', 'calm', 'sprint sister',
    'terra manta', 'field general', 'total 90', 'shox', 'tl', 'kobe', 'lebron', 'sabrina', 'ja 1', 'ja 2', 'ja 3',
    'big low', 'air rift', 'huarache', 'air more', 'foamposite', 'uptempo', 'waffle', 'daybreak', 'ld-1000', 'ldv',
    // Adidas
    'samba', 'gazelle', 'spezial', 'handball', 'superstar', 'stan smith', 'campus', 'forum', 'sl 72', 'sl72', 'tokyo',
    'taekwondo', 'jellyfish', 'ozweego', 'adipista', 'anfu', 'country', 'rivalry', 'adimatic', 'yeezy', 'y-3', 'bad bunny',
    'drop step', 'hyperboost edge', 'response cl', 'daroga', 'adiracer',
    // New Balance
    '9060', '1906', '2002', '530', '550', '327', '574', '990', '991', '992', '993', '204', '1000', '610', '740', '480',
    // Puma
    'speedcat', 'suede', 'palermo', 'roma', 'mostro', 'h-street', 'ballerina', 'avanti', 'inhale',
    // On
    'cloudtilt', 'loudtilt', 'roger', 'cloud 5', 'cloud 6', 'cloudnova', 'cloudaway', 'cloudrift', 'cloudzone', 'k-tech',
    'kith',
    // Vans
    'old skool', 'sk8', 'authentic', 'era', 'slip-on', 'knu skool',
  ]],
  ['training', [
    'metcon', 'cloud x', 'cloudx', 'cloudpulse', 'loudpulse', 'dropset', 'nano x', 'rapidmotion', 'trinity', 'amp training',
    'mc trainer', 'free metcon', 'savaleos',
  ]],
  ['running', [
    // Nike
    'pegasus', 'vomero', 'alphafly', 'vaporfly', 'zoom fly', 'invincible', 'structure', 'streakfly', 'infinity',
    'journey run', 'revolution', 'winflo', 'interact run', 'downshifter', 'flex', 'free rn', 'free 3.0', 'free 4.0',
    'free 5.0', 'mountain fly', 'wildhorse', 'kiger', 'ultrafly', 'zegama', 'juniper', 'react miler', 'tempo',
    // Adidas
    'adizero', 'adios', 'boston', 'ultraboost', 'supernova', 'adistar', 'solarglide', 'duramo', 'runfalcon', 'evo sl',
    'agravic', 'terrex', 'switch fwd', 'questar', 'response',
    // On
    'cloudmonster', 'cloudsurfer', 'cloudflow', 'cloudrunner', 'cloudboom', 'cloudeclipse', 'cloudstratus',
    'cloudultra', 'cloudvista', 'cloudspark', 'cloudgo', 'cloudventure', 'cloudhorizon', 'cloudsolo', 'cloudtrax',
    'oudsurfer',
    // New Balance
    'fresh foam', 'fuelcell', '1080', '880', 'rebel', 'more v', 'sc elite', 'sc trainer', '860', 'hierro',
    // Puma
    'nitro', 'velocity', 'deviate', 'magnify', 'fast-r', 'fast r',
  ]],
];

// Só para modelo que não está em MODELOS_TIPO: palavras da descrição.
const PALAVRAS_TIPO = [
  ['running', ['running', 'run', 'corrida', '跑鞋', '跑步', '马拉松', '慢跑']],
  ['training', ['training', 'gym', 'treino', 'crossfit', '训练', '综合训练']],
];

const TIPO_PADRAO = 'casual';

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

/** A palavra aparece inteira no texto (não dentro de outra, nem de um código). */
const escapar = (p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const temPalavra = (texto, p) =>
  /^[a-z0-9]/.test(p)
    ? new RegExp(`(^|[^a-z0-9])${escapar(p)}($|[^a-z0-9])`).test(texto)
    : texto.includes(p);

/** Tipo de tênis do produto. "nome" é o nome limpo; "descricao", o título
 *  do fornecedor antes do código e dos tamanhos (onde vem "跑鞋", "训练"...). */
function acharTipo(nome, descricao) {
  // "NB204", "M1906R", "U9060": separa o número do prefixo para casar "204", "1906"...
  // "NIKEVOMERO": a marca grudada no modelo também se separa.
  const n = normal(nome)
    .replace(/(^|[^a-z0-9])(nb|m|u|w|ml|mr|wl)(\d{3,4})/g, '$1$2 $3')
    .replace(/nike(?=[a-z])/g, 'nike ');
  for (const [tipo, modelos] of MODELOS_TIPO) if (modelos.some((m) => temPalavra(n, m))) return tipo;
  const d = normal(descricao);
  for (const [tipo, palavras] of PALAVRAS_TIPO) if (palavras.some((p) => temPalavra(d, p))) return tipo;
  return TIPO_PADRAO;
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
    // Título todo em chinês: o que sobra para identificar o par é o código.
    const nomeLimpo = limparNome(a.title);
    const nome = nomeLimpo === 'Modelo sem nome' && codigo ? `Ref. ${codigo}` : nomeLimpo;
    products.push({
      id,
      name: nome,
      tags: codigo ? [codigo] : [],
      brand: marca,
      category: acharTipo(nome, (a.title || '').split(/尺码|码数|货号|号\s*[:：]/)[0]),
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
