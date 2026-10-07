// O que as funções de api/ dividem. Começa com "_": a Vercel não publica
// arquivo assim como função — é só um módulo.

// Mesmo endereço de IMAGE_BASE em src/config.ts (as fotos no Cloudflare R2).
export const FOTOS = (process.env.VITE_IMAGE_BASE || 'https://pub-dbd133e902ba4341b7a171c127db6fdb.r2.dev').replace(
  /\/$/,
  '',
);

// Nomes de BRANDS em src/config.ts — só para os textos da pré-visualização.
const MARCAS = {
  nike: 'Nike', on: 'On', adidas: 'Adidas', asics: 'ASICS', 'new-balance': 'New Balance',
  puma: 'Puma', mizuno: 'Mizuno', vans: 'Vans', 'under-armour': 'Under Armour', arcteryx: "Arc'teryx",
  gymshark: 'Gymshark', alo: 'Alo', outras: '',
};

/** "On Cloud 5" já traz a marca no nome: não vira "On On Cloud 5". */
export function nomeCompleto(p) {
  const marca = MARCAS[p.brand] ?? p.brand;
  if (!marca) return p.name; // "outras": o nome sozinho
  return p.name.toLowerCase().startsWith(marca.toLowerCase() + ' ') ? p.name : `${marca} ${p.name}`;
}

export const origemDe = (req) => `https://${req.headers['x-forwarded-host'] || req.headers.host}`;

// O catálogo fica na memória entre chamadas enquanto a função está quente.
let catalogo = null;
let lidoEm = 0;
export async function produtos(origem) {
  if (!catalogo || Date.now() - lidoEm > 10 * 60 * 1000) {
    const r = await fetch(`${origem}/data/catalog.json`);
    if (r.ok) {
      catalogo = new Map((await r.json()).products.map((p) => [p.id, p]));
      lidoEm = Date.now();
    }
  }
  return catalogo ?? new Map();
}

/** "id:tamanho:qtd,id:tamanho:qtd" — o mesmo formato de src/lib/cart.tsx. */
export function lerItens(texto) {
  return String(texto || '')
    .split(',')
    .map((parte) => {
      const [id, size, qty] = parte.split(':');
      return {
        id: String(id || '').replace(/[^\w-]/g, ''),
        size: String(size || '').replace(/[^\d.,]/g, '').slice(0, 5),
        qty: Math.max(1, Math.min(10, Number(qty) || 1)),
      };
    })
    .filter((i) => i.id)
    .slice(0, 30);
}

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** A página que só existe para o robô do WhatsApp ler as etiquetas Open Graph;
 *  gente de verdade é mandada na hora para "destino". */
export function paginaDePrevia({ titulo, detalhes, foto, url, destino, largura = 600, altura = 600 }) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${esc(titulo)} · Pulse Atitude</title>
<meta name="description" content="${esc(detalhes)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Pulse Atitude">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(detalhes)}">
<meta property="og:image" content="${esc(foto)}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="${largura}">
<meta property="og:image:height" content="${altura}">
<meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0; url=${esc(destino)}">
</head>
<body style="background:#000;color:#fff;font-family:system-ui,sans-serif;text-align:center;padding:48px 16px">
<p>Abrindo <a href="${esc(destino)}" style="color:#F8C549">${esc(titulo)}</a>…</p>
<script>location.replace(${JSON.stringify(destino)})</script>
</body>
</html>`;
}
