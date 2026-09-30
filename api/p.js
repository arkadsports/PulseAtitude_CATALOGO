// /p/<id>?t=<tamanho> — o link do produto que vai dentro do pedido no WhatsApp.
//
// O WhatsApp não aceita foto num link wa.me, mas mostra a pré-visualização de
// qualquer link da mensagem. Este endereço existe para isso: devolve uma
// página com as etiquetas Open Graph do produto (nome, cor, tamanho e a foto
// og/<id>.jpg, gerada por scripts/og-imagens.mjs), e quem clica é levado na
// hora para a página normal do produto, /produto/<id>.
//
// O site é uma SPA (tudo vira index.html), e o robô do WhatsApp não roda
// JavaScript — por isso esta função, e não uma rota do React.

// Mesmo endereço de IMAGE_BASE em src/config.ts (as fotos no Cloudflare R2).
const FOTOS = (process.env.VITE_IMAGE_BASE || 'https://pub-dbd133e902ba4341b7a171c127db6fdb.r2.dev').replace(/\/$/, '');
// Nomes de BRANDS em src/config.ts — só para o título da pré-visualização.
const MARCAS = {
  nike: 'Nike', on: 'On', adidas: 'Adidas', asics: 'ASICS', 'new-balance': 'New Balance',
  puma: 'Puma', mizuno: 'Mizuno', vans: 'Vans',
};

// O catálogo fica na memória entre chamadas enquanto a função está quente.
let catalogo = null;
let lidoEm = 0;
async function produto(origem, id) {
  if (!catalogo || Date.now() - lidoEm > 10 * 60 * 1000) {
    const r = await fetch(`${origem}/data/catalog.json`);
    if (r.ok) {
      catalogo = new Map((await r.json()).products.map((p) => [p.id, p]));
      lidoEm = Date.now();
    }
  }
  return catalogo?.get(id);
}

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export default async function handler(req, res) {
  const id = String(req.query.id || '').replace(/[^\w-]/g, '');
  const tamanho = String(req.query.t || '').replace(/[^\d.,]/g, '').slice(0, 5);
  const origem = `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
  const destino = `/produto/${encodeURIComponent(id)}`;

  const p = id ? await produto(origem, id) : null;
  const marca = p ? MARCAS[p.brand] ?? p.brand : '';
  // "On Cloud 5" já traz a marca no nome: não vira "On On Cloud 5".
  const titulo = p
    ? p.name.toLowerCase().startsWith(marca.toLowerCase() + ' ')
      ? p.name
      : `${marca} ${p.name}`
    : 'Pulse Atitude';
  const detalhes = p
    ? [p.colorway, tamanho && `Tamanho ${tamanho}`, `Código ${p.id}`].filter(Boolean).join(' · ')
    : 'Running · Training · Casual';
  const foto = p ? `${FOTOS}/og/${p.id}.jpg` : `${origem}/og.jpg`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // A pré-visualização muda pouco: a CDN guarda por um dia.
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  res.status(p || !id ? 200 : 404).send(`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${esc(titulo)} · Pulse Atitude</title>
<meta name="description" content="${esc(detalhes)}">
<meta property="og:type" content="product">
<meta property="og:site_name" content="Pulse Atitude">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(detalhes)}">
<meta property="og:image" content="${esc(foto)}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="600">
<meta property="og:image:height" content="600">
<meta property="og:url" content="${esc(`${origem}/p/${id}${tamanho ? `?t=${tamanho}` : ''}`)}">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0; url=${esc(destino)}">
<link rel="canonical" href="${esc(origem + destino)}">
</head>
<body style="background:#000;color:#fff;font-family:system-ui,sans-serif;text-align:center;padding:48px 16px">
<p>Abrindo <a href="${esc(destino)}" style="color:#F8C549">${esc(titulo)}</a>…</p>
<script>location.replace(${JSON.stringify(destino)})</script>
</body>
</html>`);
}
