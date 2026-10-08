// As cartas da galeria de marcas: uma peça de propaganda por marca, com o
// produto mais vendido dela no mundo — desde que esteja no catálogo da Pulse.
//
// Foto de campanha da própria marca tem direito autoral; aqui a peça é feita
// com a foto do produto que já está no site (a mesma do catálogo), no visual
// da Pulse. Sai em public/hero/<marca>.webp, quadrada (1000 px), para a
// galeria mostrar inteira, sem cortes.
//
//   npm run anuncios        (depois de mudar ANUNCIOS abaixo)
//
// O campeão de vendas de cada marca, e o que fazer quando ele não está no
// catálogo, ficam em ANUNCIOS. Trocou o produto? Mude o id e rode de novo.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

sharp.cache(false);
const IMG = path.resolve(process.env.IMG_DIR || 'public/img');
const LADO = 1000;

/** marca -> o produto da peça (id do catálogo), o título e o selo. */
const ANUNCIOS = {
  nike: { id: '256045483', titulo: "AIR FORCE 1 '07", selo: 'O tênis mais vendido da Nike' },
  on: { id: '256429145', titulo: 'CLOUD 5', selo: 'O mais vendido da On' },
  adidas: { id: '254235047', titulo: 'SAMBA OG', selo: 'O clássico mais vendido da Adidas' },
  'new-balance': { id: '256180008', titulo: '530', selo: 'O mais vendido da New Balance' },
  puma: { id: '246795173', titulo: 'SPEEDCAT', selo: 'O fenômeno da Puma' },
  // O Old Skool, campeão da Vans, não está no catálogo: vai o que temos.
  vans: { id: '233291972', titulo: 'ULTRARANGE', selo: 'Vans na Pulse' },
  // Marcas só de roupa por enquanto: a camiseta, peça de maior saída delas.
  'under-armour': { id: '215946023-2', titulo: 'CAMISETA DE TREINO', selo: 'O essencial da Under Armour' },
  arcteryx: { id: '218249150-2', titulo: 'CAMISETA', selo: "O básico técnico da Arc'teryx" },
  gymshark: { id: '215945938-2', titulo: 'CAMISETA DE TREINO', selo: 'O favorito da Gymshark' },
  alo: { id: '215946056-2', titulo: 'CAMISETA', selo: 'O essencial da Alo' },
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Recorta a foto em volta do produto: a maior mancha que destoa do fundo.
 *  (O estúdio tem luz no centro e sombra nas bordas — comparar com as bordas
 *  marca a parede do meio também; a mancha maior e contínua é o produto.) */
async function recortar(buf, proporcao) {
  const L = 200;
  const { width: W, height: H } = await sharp(buf).metadata();
  const { data } = await sharp(buf).resize(L, L, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = (x, y) => {
    const i = (y * L + x) * 3;
    return [data[i], data[i + 1], data[i + 2]];
  };
  // Fundo local: a mediana de uma vizinhança larga (31 px) em cada linha.
  const cheio = new Uint8Array(L * L);
  for (let y = 0; y < L; y++)
    for (let x = 0; x < L; x++) {
      const viz = [];
      for (const dx of [-15, -10, 10, 15]) {
        const xx = Math.min(L - 1, Math.max(0, x + dx));
        viz.push(px(xx, y).reduce((s2, v) => s2 + v, 0));
      }
      const p = px(x, y);
      const lum = p[0] + p[1] + p[2];
      const saturado = Math.max(...p) - Math.min(...p) > 40;
      viz.sort((m, n) => m - n);
      if (saturado || Math.abs(lum - (viz[1] + viz[2]) / 2) > 50 || lum < 300) cheio[y * L + x] = 1;
    }
  // Maior mancha (8 vizinhos).
  const marca = new Int32Array(L * L).fill(-1);
  let melhor = null;
  for (let i = 0; i < L * L; i++) {
    if (!cheio[i] || marca[i] >= 0) continue;
    const pilha = [i];
    marca[i] = i;
    let x0 = L, y0 = L, x1 = -1, y1 = -1, n = 0;
    while (pilha.length) {
      const j = pilha.pop();
      n++;
      const x = j % L;
      const y = (j / L) | 0;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= L || yy >= L) continue;
          const k = yy * L + xx;
          if (cheio[k] && marca[k] < 0) {
            marca[k] = i;
            pilha.push(k);
          }
        }
    }
    if (!melhor || n > melhor.n) melhor = { n, x0, y0, x1, y1 };
  }
  if (!melhor || melhor.n < L * L * 0.004) return { buf };
  // Janela no formato do quadro, centrada no produto, com folga de 35% —
  // recortada da própria foto, sem precisar inventar borda.
  const bw = ((melhor.x1 - melhor.x0 + 1) / L) * W;
  const bh = ((melhor.y1 - melhor.y0 + 1) / L) * H;
  const cx = ((melhor.x0 + melhor.x1 + 1) / 2 / L) * W;
  const cy = ((melhor.y0 + melhor.y1 + 1) / 2 / L) * H;
  let w = Math.max(bw * 1.35, bh * 1.35 * proporcao);
  let h = w / proporcao;
  // Janela maior que a foto: encolhe (a folga diminui, o produto continua inteiro).
  if (w > W) { w = W; h = w / proporcao; }
  if (h > H) { h = H; w = h * proporcao; }
  // Nem assim o produto cabe (peça que ocupa a foto toda): a foto inteira entra
  // no quadro, completada com o fundo, em vez de cortar a peça.
  if (bw > w || bh > h) return { buf, completar: true };
  const left = Math.round(Math.min(Math.max(cx - w / 2, 0), W - w));
  const top = Math.round(Math.min(Math.max(cy - h / 2, 0), H - h));
  return { buf: await sharp(buf).extract({ left, top, width: Math.round(w), height: Math.round(h) }).toBuffer() };
}

const catalogo = new Map(JSON.parse(await fs.readFile('public/data/catalog.json', 'utf8')).products.map((p) => [p.id, p]));

async function peca(slug, { id, titulo, selo }) {
  // A capa do produto (nunca a sola: é a escolhida por escolher-capas.mjs).
  const capa = catalogo.get(id)?.cover ?? 0;
  const foto = await fs.readFile(path.join(IMG, id, `${capa}-full.webp`));
  // O quarto de baixo fica livre: é onde a galeria escreve a marca e o "Ver
  // modelos" por cima — assim o texto não cobre o produto.
  const Q = { x: 110, y: 250, w: 780, h: 480, r: 40 };
  const { buf, completar } = await recortar(foto, Q.w / Q.h);

  // O quadro do produto: a janela da foto em volta dele, cantos redondos.
  const { data: canto } = await sharp(buf).extract({ left: 2, top: 2, width: 1, height: 1 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const quadro = completar
    ? await sharp(buf)
        .resize(Q.w - 60, Q.h - 60, { fit: 'inside' })
        .toBuffer({ resolveWithObject: true })
        .then(({ data, info }) => {
          // Um resize só por cadeia no sharp: a borda que completa o quadro vem à parte.
          const dx = Q.w - info.width;
          const dy = Q.h - info.height;
          const fundo = { r: canto[0], g: canto[1], b: canto[2] };
          return sharp(data)
            .extend({ top: Math.floor(dy / 2), bottom: Math.ceil(dy / 2), left: Math.floor(dx / 2), right: Math.ceil(dx / 2), background: fundo })
            .png()
            .toBuffer();
        })
    : await sharp(buf).resize(Q.w, Q.h, { fit: 'cover' }).png().toBuffer();
  const mascara = Buffer.from(`<svg width="${Q.w}" height="${Q.h}"><rect width="${Q.w}" height="${Q.h}" rx="${Q.r}" fill="#fff"/></svg>`);
  const quadroRedondo = await sharp(quadro).composite([{ input: mascara, blend: 'dest-in' }]).png().toBuffer();

  const tamTitulo = titulo.length > 14 ? 78 : 104;
  const arte = Buffer.from(`<svg width="${LADO}" height="${LADO}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="halo" cx="50%" cy="0%" r="75%">
      <stop offset="0" stop-color="#D7972A" stop-opacity=".45"/>
      <stop offset="1" stop-color="#050505" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="ouro" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFE08A"/><stop offset=".5" stop-color="#F8C549"/><stop offset="1" stop-color="#B7781A"/>
    </linearGradient>
  </defs>
  <rect width="${LADO}" height="${LADO}" fill="#070707"/>
  <rect width="${LADO}" height="${LADO}" fill="url(#halo)"/>
  <text x="${LADO / 2}" y="92" text-anchor="middle" font-family="Arial Black, Arial" font-weight="900" font-size="26" letter-spacing="6" fill="url(#ouro)">${esc(selo.toUpperCase())}</text>
  <text x="${LADO / 2}" y="${92 + tamTitulo + 28}" text-anchor="middle" font-family="Impact, Arial Black, Arial" font-size="${tamTitulo}" letter-spacing="2" fill="#ffffff">${esc(titulo)}</text>
  <rect x="${LADO / 2 - 60}" y="${92 + tamTitulo + 50}" width="120" height="4" rx="2" fill="url(#ouro)"/>
  <rect x="${Q.x - 2}" y="${Q.y - 2}" width="${Q.w + 4}" height="${Q.h + 4}" rx="${Q.r + 2}" fill="none" stroke="#D7972A" stroke-opacity=".55" stroke-width="2"/>
</svg>`);

  await sharp(arte)
    .composite([{ input: quadroRedondo, left: Q.x, top: Q.y }])
    .webp({ quality: 82 })
    .toFile(path.resolve('public/hero', `${slug}.webp`));
  console.log(`public/hero/${slug}.webp  ←  ${titulo} (${id})`);
}

const so = process.argv.find((a) => a.startsWith('--marca='))?.slice(8);
for (const [slug, cfg] of Object.entries(ANUNCIOS)) if (!so || so === slug) await peca(slug, cfg);
