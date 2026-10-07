// ROUPAS, ETAPA 2 — Escolhe as fotos: só frente e costas de cada cor, sem repetir.
//
// O álbum do fornecedor mistura: closes do tecido e da logo, a peça em fundo
// branco (de frente, de costas, de lado ou em ângulo, para cada cor), montagens
// com todas as cores — e repete várias fotos no fim. O nome da cor só existe
// escrito dentro da imagem. Então tudo aqui sai da própria foto:
//
//   1. foto de produto = borda branca (closes e montagens têm fundo de cor);
//   2. uma peça só     = uma mancha só (montagem de 4 bermudas são 4 manchas);
//   3. vista reta      = contorno simétrico (lado e ângulo são tortos);
//   4. repetida        = impressão digital (dHash) igual a uma já vista;
//   5. mesma cor       = cor média da peça parecida (ΔE em Lab);
//   6. em cada cor ficam 2 vistas retas e diferentes: frente e costas — regra
//      própria para camisa (a logo no peito) e para bermuda (a simetria), nas
//      funções frenteECostasDaCamisa e frenteECostasDaBermuda.
//
// Cada cor vira um produto. Resultado em data/roupas.json, que o build-catalog lê.
//
//   npm run roupas-fotos                     -> todos os álbuns (cache das fotos em IMG_DIR/_roupas)
//   npm run roupas-fotos -- --album=123      -> um álbum só, e uma prancha para conferir
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import pLimit from 'p-limit';

const BASE = (process.env.YUPOO_ROUPAS || '').replace(/\/$/, '');
const IMG = path.resolve(process.env.IMG_DIR || 'public/img');
const CACHE = path.join(IMG, '_roupas');
const RAW = path.resolve('data/raw-roupas/albuns.json');
const SAIDA = path.resolve('data/roupas.json');
const HEADERS = { 'User-Agent': 'Mozilla/5.0 Chrome/128.0', Referer: BASE + '/' };
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];

// --- Limites, calibrados à mão em álbuns de camisa e bermuda ---
const BORDA_BRANCA = 0.85; // fração da borda quase branca para ser foto de produto
// IoU do contorno com o espelho para ser vista reta. 0,90 deixa de fora a
// camisa em ângulo (~0,86) e a foto das cores penduradas no cabide (~0,84).
const SIMETRIA = 0.9;
// De lado a peça fica estreita: bermuda reta ~0,75–0,80, de lado ~0,53.
// A conta é relativa à vista mais larga do álbum, porque camisa é mais larga.
const PROPORCAO_RETA = 0.82;
// A repetida é o mesmo arquivo reenviado: diferença 0. Vistas diferentes da
// mesma peça (frente, ângulo, costas) ficam acima de 18.
const MESMA_FOTO = 4; // bits de diferença no dHash (256) para ser a mesma foto
// Cores: o tom (a, b do Lab) manda, a claridade pesa um terço — "verde-acinzentado"
// e "cinza" têm a mesma claridade e só se separam pelo tom (diferença ~3).
const MESMA_COR = 1.8;

const L = 128;

/** RGB -> Lab (D65), para comparar cores como o olho compara. */
function lab([r, g, b]) {
  const f = (c) => {
    c /= 255;
    return c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92;
  };
  const [R, G, B] = [f(r), f(g), f(b)];
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const h = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * h(y) - 16, 500 * (h(x) - h(y)), 200 * (h(y) - h(z))];
}
const deltaE = (a, b) => Math.hypot((a[0] - b[0]) / 3, a[1] - b[1], a[2] - b[2]);

/** Tudo o que se mede numa foto. */
async function medir(arquivo) {
  const { data } = await sharp(arquivo).resize(L, L, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = (x, y) => {
    const i = (y * L + x) * 3;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const branco = (p) => p[0] > 232 && p[1] > 232 && p[2] > 232;

  let nb = 0;
  let bb = 0;
  for (let t = 0; t < L; t++)
    for (const [x, y] of [[t, 1], [t, L - 2], [1, t], [L - 2, t]]) {
      nb++;
      if (branco(px(x, y))) bb++;
    }
  const borda = bb / nb;

  // A peça: o que não é branco, fora da etiqueta escrita no canto de cima à esquerda.
  const peca = new Uint8Array(L * L);
  for (let y = 0; y < L; y++)
    for (let x = 0; x < L; x++) {
      if (x < L * 0.3 && y < L * 0.16) continue; // "PL6800# 深灰"
      if (!branco(px(x, y))) peca[y * L + x] = 1;
    }

  // Manchas: quantas peças separadas há na foto (montagem tem várias).
  const visto = new Uint8Array(L * L);
  let manchas = 0;
  for (let i = 0; i < L * L; i++) {
    if (!peca[i] || visto[i]) continue;
    let tam = 0;
    const pilha = [i];
    visto[i] = 1;
    while (pilha.length) {
      const j = pilha.pop();
      tam++;
      const x = j % L;
      const y = (j / L) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= L || ny >= L) continue;
        const k = ny * L + nx;
        if (peca[k] && !visto[k]) {
          visto[k] = 1;
          pilha.push(k);
        }
      }
    }
    if (tam > L * L * 0.03) manchas++;
  }

  // Caixa da peça e simetria do contorno em torno do centro dela.
  let x0 = L, x1 = -1, y0 = L, y1 = -1, area = 0;
  let soma = [0, 0, 0];
  for (let y = 0; y < L; y++)
    for (let x = 0; x < L; x++)
      if (peca[y * L + x]) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
        area++;
        const p = px(x, y);
        soma = soma.map((s, k) => s + p[k]);
      }
  let inter = 0;
  let uniao = 0;
  let diferenca = 0;
  let pares = 0;
  const eixo = x0 + x1;
  for (let y = 0; y < L; y++)
    for (let x = 0; x < L; x++) {
      const xe = eixo - x;
      const a = peca[y * L + x];
      const b = xe >= 0 && xe < L ? peca[y * L + xe] : 0;
      if (a || b) uniao++;
      if (a && b) {
        inter++;
        const p = px(x, y);
        const q = px(xe, y);
        diferenca += Math.abs(p[0] + p[1] + p[2] - q[0] - q[1] - q[2]) / 3;
        pares++;
      }
    }

  // Logo: pontos que mudam muito quando a foto é espelhada (em 256 px). A frente
  // da camisa tem a logo num lado do peito; as costas são lisas e espelhadas.
  const G = 256;
  const cinza = await sharp(arquivo).greyscale().resize(G, G, { fit: 'fill' }).raw().toBuffer();
  let gx0 = G, gx1 = -1;
  const na = (x, y) => !(x < G * 0.3 && y < G * 0.16) && cinza[y * G + x] < 232;
  for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) if (na(x, y)) { gx0 = Math.min(gx0, x); gx1 = Math.max(gx1, x); }
  let fortes = 0;
  let comparados = 0;
  for (let y = 0; y < G; y++)
    for (let x = 0; x < G; x++) {
      const xe = gx0 + gx1 - x;
      if (xe < 0 || xe >= G || !na(x, y) || !na(xe, y)) continue;
      comparados++;
      if (Math.abs(cinza[y * G + x] - cinza[y * G + xe]) > 70) fortes++;
    }
  const logo = comparados ? +((1000 * fortes) / comparados).toFixed(1) : 0;

  // dHash: 256 bits do degradê horizontal da foto em 17x16. (Com 64 bits,
  // bermudas diferentes em fundo branco davam a mesma impressão digital.)
  const g = await sharp(arquivo).greyscale().resize(17, 16, { fit: 'fill' }).raw().toBuffer();
  let hash = '';
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) hash += g[y * 17 + x] < g[y * 17 + x + 1] ? '1' : '0';

  return {
    borda: +borda.toFixed(3),
    manchas,
    simetria: uniao ? +(inter / uniao).toFixed(3) : 0,
    logo,
    desenho: pares ? +(diferenca / pares).toFixed(2) : 0, // quanto o lado esquerdo difere do direito por dentro
    cor: area ? lab(soma.map((s) => s / area)).map((v) => +v.toFixed(1)) : [100, 0, 0],
    rgb: area ? soma.map((s) => Math.round(s / area)) : [255, 255, 255],
    area: +(area / (L * L)).toFixed(3),
    // Largura sobre altura da peça: de lado ela fica bem mais estreita.
    proporcao: x1 >= 0 ? +((x1 - x0 + 1) / (y1 - y0 + 1)).toFixed(3) : 0,
    hash,
  };
}
const hamming = (a, b) => [...a].reduce((s, c, i) => s + (c !== b[i] ? 1 : 0), 0);

async function baixar(url, arquivo) {
  try {
    await fs.access(arquivo);
    return true;
  } catch {
    // não está no cache
  }
  const media = url.replace(/\/[^/]+\.(jpe?g|png|webp)$/i, '/medium.$1');
  for (let i = 1; i <= 3; i++) {
    try {
      const r = await fetch(media, { headers: HEADERS, signal: AbortSignal.timeout(30000) });
      if (r.ok) {
        await fs.writeFile(arquivo, Buffer.from(await r.arrayBuffer()));
        return true;
      }
      if (r.status === 404) return false;
    } catch {
      // tenta de novo
    }
    await new Promise((r) => setTimeout(r, 1500 * i));
  }
  return false;
}

/** Camisa: a frente tem a logo no peito, e a costas não — ganha quem tem mais
 *  "logo". Empate (diferença < 10%, como em camisa listrada): vale a ordem do
 *  álbum, porque o fornecedor fotografa a camisa de frente primeiro. */
function frenteECostasDaCamisa(g) {
  const porLogo = [...g].sort((a, b) => b.logo - a.logo);
  let [frente, costas] = porLogo;
  if (costas && frente.logo - costas.logo < frente.logo * 0.1) [frente, costas] = [frente, costas].sort((a, b) => a.n - b.n);
  return [frente, costas];
}

/** Bermuda: as costas também têm logo, então o que manda é a simetria. De
 *  frente ela é a mais espelhada (~0,96–0,99); as costas vêm em segundo, um
 *  pouco acima da frente em ângulo — que fica de fora. */
function frenteECostasDaBermuda(g) {
  const porSimetria = [...g].sort((a, b) => b.simetria - a.simetria);
  return [porSimetria[0], porSimetria[1]];
}

/** As cores de um álbum, cada uma com frente e costas (ou só uma vista). */
async function escolher(album) {
  const dir = path.join(CACHE, album.id);
  await fs.mkdir(dir, { recursive: true });
  const fotos = [];
  for (const [n, url] of album.fotos.entries()) {
    const arq = path.join(dir, `${n}.jpg`);
    if (!(await baixar(url, arq))) continue;
    try {
      fotos.push({ n, url, ...(await medir(arq)) });
    } catch {
      // foto corrompida: fica de fora
    }
  }

  // 1–3: foto de produto, uma peça, vista reta.
  const produto = fotos.filter((f) => f.borda >= BORDA_BRANCA && f.manchas === 1 && f.simetria >= SIMETRIA);
  const maisLarga = Math.max(0, ...produto.map((f) => f.proporcao));
  const retas = produto.filter((f) => f.proporcao >= maisLarga * PROPORCAO_RETA);
  // 4: sem repetidas (fica a primeira que apareceu).
  const unicas = [];
  // Repetida = mesma imagem E mesma cor (a impressão digital sozinha confunde
  // peças de cores diferentes no mesmo fundo branco).
  for (const f of retas)
    if (!unicas.some((u) => hamming(u.hash, f.hash) <= MESMA_FOTO && deltaE(u.cor, f.cor) <= MESMA_COR)) unicas.push(f);
  // 5: agrupa por cor, na ordem do álbum.
  const grupos = [];
  for (const f of unicas) {
    const g = grupos.find((gr) => deltaE(gr[0].cor, f.cor) <= MESMA_COR);
    if (g) g.push(f);
    else grupos.push([f]);
  }
  // 6: frente e costas de cada cor.
  const cores = grupos.map((g) => {
    const [frente, costas] = album.tipo === 'camisa' ? frenteECostasDaCamisa(g) : frenteECostasDaBermuda(g);
    return { rgb: frente.rgb, fotos: costas ? [frente, costas] : [frente], vistasNaCor: g.length };
  });
  // Nada em fundo branco: talvez o álbum seja de alguém vestindo a peça.
  if (!cores.length) return { fotos, cores: await escolherComModelo(album, fotos, dir), comModelo: true };
  return { fotos, cores };
}

// ---------------------------------------------------------------------------
// Álbum com modelo vestindo a peça (fundo cinza-claro, pessoa de frente e de
// costas). O contorno não serve — tem pele e a outra peça de roupa —, então:
//   - frente ou costas: o modelo de visão (CLIP), que separa bem uma pessoa de
//     frente de uma pessoa de costas;
//   - a cor: medida só onde a peça fica (o tronco, para camisa; a altura do
//     quadril, para bermuda), no centro da foto;
//   - fica a foto mais "de frente" e a mais "de costas" de cada cor.
// ---------------------------------------------------------------------------
// Duas perguntas que o modelo responde bem (frente x costas) e duas para tirar
// o que não serve. "Várias roupas juntas" ganhava sempre — o modelo veste duas.
const VISTAS = [
  'a man facing the camera',
  'the back of a man, seen from behind',
  'a collage grid of several product photos',
  'a close-up of fabric',
];
let clip = null;
async function visao() {
  if (!clip) {
    const { pipeline } = await import('@huggingface/transformers');
    clip = await pipeline('zero-shot-image-classification', 'Xenova/clip-vit-base-patch32');
  }
  return clip;
}

/** Pele (regra clássica de RGB): fica de fora da cor da roupa. */
const pele = ([r, g, b]) => r > 95 && g > 40 && b > 20 && r > g && r > b && r - g > 15 && Math.max(r, g, b) - Math.min(r, g, b) > 15;

/** Cor da roupa numa foto com modelo: a faixa central (onde está o corpo),
 *  sem o fundo (medido nas bordas) e sem pele. A roupa muda de lugar entre
 *  álbuns de corpo inteiro e de meio corpo, por isso a faixa é larga. */
async function corNaRegiao(arquivo) {
  const { data } = await sharp(arquivo).resize(L, L, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = (x, y) => {
    const i = (y * L + x) * 3;
    return [data[i], data[i + 1], data[i + 2]];
  };
  let f = [0, 0, 0];
  let nf = 0;
  for (let y = 0; y < L; y++)
    for (const x of [2, L - 3]) {
      const p = px(x, y);
      f = f.map((v, k) => v + p[k]);
      nf++;
    }
  f = f.map((v) => v / nf);
  let soma = [0, 0, 0];
  let n = 0;
  for (let y = Math.round(L * 0.15); y < L * 0.8; y++)
    for (let x = Math.round(L * 0.35); x < L * 0.65; x++) {
      const p = px(x, y);
      if (Math.hypot(p[0] - f[0], p[1] - f[1], p[2] - f[2]) < 30 || pele(p)) continue;
      soma = soma.map((v, k) => v + p[k]);
      n++;
    }
  const rgb = n ? soma.map((v) => v / n) : f;
  return { cor: lab(rgb), rgb: rgb.map(Math.round) };
}

async function escolherComModelo(album, fotos, dir) {
  const clf = await visao();
  const vistas = [];
  for (const f of fotos) {
    const arq = path.join(dir, `${f.n}.jpg`);
    const o = await clf(arq, VISTAS);
    const nota = Object.fromEntries(o.map((x) => [x.label, x.score]));
    const frente = nota[VISTAS[0]];
    const costas = nota[VISTAS[1]];
    if (frente + costas < 0.6) continue; // montagem, close: fora
    vistas.push({ ...f, ...(await corNaRegiao(arq)), frente, costas });
  }
  // Sem repetidas, e agrupadas por cor da peça (a régua de cor é mais frouxa
  // aqui: luz de estúdio no corpo varia mais que na peça estendida).
  const unicas = [];
  for (const v of vistas) if (!unicas.some((u) => hamming(u.hash, v.hash) <= MESMA_FOTO)) unicas.push(v);
  const grupos = [];
  for (const v of unicas) {
    const g = grupos.find((gr) => deltaE(gr[0].cor, v.cor) <= MESMA_COR * 3);
    if (g) g.push(v);
    else grupos.push([v]);
  }
  // Cor que ficou só com frente + cor que ficou só com costas, de tom parecido:
  // é a mesma peça (a camisa branca quase some no fundo claro e se divide).
  const soFrente = (g) => g.every((v) => v.frente > v.costas);
  const soCostas = (g) => g.every((v) => v.costas >= v.frente);
  for (const g of [...grupos]) {
    if (!soFrente(g) || !grupos.includes(g)) continue;
    const par = grupos
      .filter((h) => h !== g && soCostas(h))
      .sort((h1, h2) => deltaE(h1[0].cor, g[0].cor) - deltaE(h2[0].cor, g[0].cor))[0];
    if (par && deltaE(par[0].cor, g[0].cor) <= MESMA_COR * 8) {
      g.push(...par);
      grupos.splice(grupos.indexOf(par), 1);
    }
  }
  return grupos.map((g) => {
    const deFrente = [...g].filter((v) => v.frente > v.costas).sort((a, b) => b.frente - a.frente)[0];
    const deCostas = g.filter((v) => v.costas > v.frente).sort((a, b) => b.costas - a.costas)[0];
    // Cor sem foto de frente: a de costas abre o produto (melhor que nada).
    const fotosDaCor = [deFrente, deCostas].filter(Boolean);
    return { rgb: fotosDaCor[0].rgb, fotos: fotosDaCor, vistasNaCor: g.length, comModelo: true };
  });
}

async function prancha(album, r, saida) {
  const W = 150;
  const linhas = [r.fotos, ...r.cores.map((c) => c.fotos)];
  const tiles = [];
  const marca = (txt, cor = '#ff0') =>
    Buffer.from(`<svg width="${W}" height="18"><rect width="${W}" height="18" fill="#000"/><text x="3" y="13" font-size="11" font-family="Arial" fill="${cor}">${txt}</text></svg>`);
  // Linha 0: todas as fotos com as medidas; depois, uma linha por cor escolhida.
  for (const [i, f] of r.fotos.entries()) {
    const ok = f.borda >= BORDA_BRANCA && f.manchas === 1 && f.simetria >= SIMETRIA;
    const img = await sharp(path.join(CACHE, album.id, `${f.n}.jpg`)).resize(W, W, { fit: 'contain', background: '#fff' }).toBuffer();
    tiles.push({ input: img, left: (i % 12) * (W + 2), top: Math.floor(i / 12) * (W + 20) });
    tiles.push({ input: marca(`${f.n} b${f.borda} m${f.manchas} s${f.simetria} d${f.desenho}`, ok ? '#0f0' : '#f66'), left: (i % 12) * (W + 2), top: Math.floor(i / 12) * (W + 20) + W });
  }
  const topoCores = (Math.ceil(r.fotos.length / 12) + 0.3) * (W + 20);
  for (const [k, c] of r.cores.entries())
    for (const [j, f] of c.fotos.entries()) {
      const img = await sharp(path.join(CACHE, album.id, `${f.n}.jpg`)).resize(W, W, { fit: 'contain', background: '#fff' }).toBuffer();
      tiles.push({ input: img, left: j * (W + 2), top: topoCores + k * (W + 20) });
      tiles.push({ input: marca(`cor ${k + 1}: ${j ? 'costas' : 'frente'} (${f.n})`), left: j * (W + 2), top: topoCores + k * (W + 20) + W });
    }
  const altura = Math.ceil(topoCores + r.cores.length * (W + 20) + 10);
  await sharp({ create: { width: 12 * (W + 2), height: altura, channels: 3, background: '#333' } }).composite(tiles).jpeg({ quality: 80 }).toFile(saida);
  void linhas;
}

const albuns = JSON.parse(await fs.readFile(RAW, 'utf8'));
const so = arg('album');
if (so) {
  const r = await escolher(albuns[so]);
  const saida = path.resolve(arg('prancha') || `prancha-${so}.jpg`);
  await prancha(albuns[so], r, saida);
  console.log(`${r.fotos.length} fotos -> ${r.cores.length} cores:`, r.cores.map((c) => `${c.fotos.map((f) => f.n).join('/')} (${c.vistasNaCor} vistas)`).join(' · '));
  console.log('Prancha:', saida);
} else {
  const anterior = JSON.parse(await fs.readFile(SAIDA, 'utf8').catch(() => '{}'));
  const limit = pLimit(4);
  let feitos = 0;
  await Promise.all(
    Object.values(albuns).map((a) =>
      limit(async () => {
        if (anterior[a.id]) return;
        try {
          const r = await escolher(a);
          anterior[a.id] = r.cores.map((c) => ({
            rgb: c.rgb,
            fotos: c.fotos.map((f) => f.url),
            // Foto com modelo: a cor vem da roupa (rgb), não da capa inteira.
            ...(c.comModelo ? { comModelo: true } : {}),
          }));
        } catch (e) {
          console.warn(`  álbum ${a.id}: ${e.message}`);
        }
        if (++feitos % 25 === 0) {
          await fs.writeFile(SAIDA, JSON.stringify(anterior));
          console.log(`  ${feitos} álbuns`);
        }
      }),
    ),
  );
  await fs.writeFile(SAIDA, JSON.stringify(anterior));
  const cores = Object.values(anterior).reduce((s, c) => s + c.length, 0);
  const fotos = Object.values(anterior).reduce((s, c) => s + c.reduce((t, k) => t + k.fotos.length, 0), 0);
  console.log(`Pronto: ${Object.keys(anterior).length} álbuns -> ${cores} produtos (cores), ${fotos} fotos.`);
}
