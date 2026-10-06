// /api/colagem?i=id,id,id — a imagem da pré-visualização do pedido: a foto de
// cada tênis lado a lado, num quadrado de 900 px. As linhas se ajustam à
// quantidade (5 itens = 3 em cima e 2 centralizados embaixo), e cada foto tem
// o fundo do estúdio aparado, para o tênis ocupar a casa.
// As fotos são as og/<id>.jpg do R2 (scripts/og-imagens.mjs). Até 9 itens;
// pedido maior mostra os 9 primeiros.
import sharp from 'sharp';
import { FOTOS } from './_lib.js';

const LADO = 900;
const VAO = 8; // a linha escura entre as fotos
const FUNDO = '#0a0a0a';
const ESTUDIO = '#e6e7e9'; // o cinza do fundo das fotos do fornecedor

/** Quantas fotos em cada linha: 1 → [1], 3 → [2, 1], 5 → [3, 2], 9 → [3, 3, 3]. */
function linhas(n) {
  const cols = Math.ceil(Math.sqrt(n));
  const total = Math.ceil(n / cols);
  return Array.from({ length: total }, (_, i) => Math.min(cols, n - i * cols));
}

/** Onde está o tênis na foto: o que destoa do fundo do estúdio (medido nas
 *  bordas da própria foto, que tem degradê). Devolve um recorte com folga. */
async function ondeEstaOTenis(foto) {
  const L = 160;
  const { width: W0, height: H0 } = await sharp(foto).metadata();
  const { data } = await sharp(foto).resize(L, L, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = (x, y) => {
    const i = (y * L + x) * 3;
    return [data[i], data[i + 1], data[i + 2]];
  };
  // Fundo linha a linha: a parede cinza vira piso quase branco de cima para
  // baixo, e um fundo só confundiria o piso com o tênis. Mede nas laterais da
  // foto (logo dentro das faixas lisas que og-imagens.mjs pôs nas bordas).
  const fundoDaLinha = (y) => {
    const a = px(Math.round(L * 0.15), y);
    const b = px(Math.round(L * 0.85), y);
    return a.map((v, k) => (v + b[k]) / 2);
  };
  let x0 = L, y0 = L, x1 = -1, y1 = -1;
  for (let y = 0; y < L; y++) {
    const fundo = fundoDaLinha(y);
    for (let x = Math.round(L * 0.15); x < Math.round(L * 0.85); x++) {
      const [r, g, b] = px(x, y);
      if (Math.hypot(r - fundo[0], g - fundo[1], b - fundo[2]) < 40) continue;
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
  }
  if (x1 < 0 || (x1 - x0) * (y1 - y0) < L * L * 0.02) return null; // não achou: usa a foto inteira
  const margem = 0.06 * L;
  const esq = Math.max(0, x0 - margem), topo = Math.max(0, y0 - margem);
  const dir = Math.min(L, x1 + margem), base = Math.min(L, y1 + margem);
  return {
    left: Math.round((esq / L) * W0),
    top: Math.round((topo / L) * H0),
    width: Math.round(((dir - esq) / L) * W0),
    height: Math.round(((base - topo) / L) * H0),
  };
}

/** Recorta o tênis e o encaixa na casa, sobre o cinza do estúdio. */
async function encaixar(foto, w, h) {
  let base = sharp(foto);
  try {
    const caixa = await ondeEstaOTenis(foto);
    if (caixa) base = sharp(await sharp(foto).extract(caixa).toBuffer());
  } catch {
    // não deu para recortar: usa a foto inteira
  }
  // Dois passos: o sharp faz um só "resize" por cadeia. Primeiro o tênis
  // encolhe com folga; depois as bordas completam a casa, centralizando.
  const folga = Math.round(Math.min(w, h) * 0.08);
  const { data, info } = await base
    .resize(w - folga * 2, h - folga * 2, { fit: 'inside' })
    .toBuffer({ resolveWithObject: true });
  const dx = w - info.width;
  const dy = h - info.height;
  return sharp(data)
    .extend({
      top: Math.floor(dy / 2),
      bottom: Math.ceil(dy / 2),
      left: Math.floor(dx / 2),
      right: Math.ceil(dx / 2),
      background: ESTUDIO,
    })
    .toBuffer();
}

export default async function handler(req, res) {
  const ids = [...new Set(String(req.query.i || '').split(','))]
    .map((id) => id.replace(/[^\w-]/g, ''))
    .filter(Boolean)
    .slice(0, 9);

  const fotos = (
    await Promise.all(
      ids.map(async (id) => {
        const r = await fetch(`${FOTOS}/og/${id}.jpg`);
        return r.ok ? Buffer.from(await r.arrayBuffer()) : null;
      }),
    )
  ).filter(Boolean);

  if (!fotos.length) {
    res.status(404).send('Sem fotos para este pedido.');
    return;
  }

  const porLinha = linhas(fotos.length);
  const cols = porLinha[0];
  const w = Math.floor((LADO - VAO * (cols - 1)) / cols);
  const h = Math.floor((LADO - VAO * (porLinha.length - 1)) / porLinha.length);
  const posicoes = porLinha.flatMap((n, lin) => {
    // Linha incompleta fica centralizada.
    const recuo = Math.round(((cols - n) * (w + VAO)) / 2);
    return Array.from({ length: n }, (_, c) => ({ left: recuo + c * (w + VAO), top: lin * (h + VAO) }));
  });
  const casas = await Promise.all(
    fotos.map(async (foto, i) => ({ input: await encaixar(foto, w, h), ...posicoes[i] })),
  );

  const jpeg = await sharp({ create: { width: LADO, height: LADO, channels: 3, background: FUNDO } })
    .composite(casas)
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();

  res.setHeader('Content-Type', 'image/jpeg');
  // Os ids na URL definem a imagem: a CDN guarda para sempre.
  res.setHeader('Cache-Control', 'public, s-maxage=31536000, immutable');
  res.status(200).send(jpeg);
}
