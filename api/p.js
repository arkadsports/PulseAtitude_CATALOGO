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
import { FOTOS, nomeCompleto, origemDe, paginaDePrevia, produtos } from './_lib.js';

export default async function handler(req, res) {
  const id = String(req.query.id || '').replace(/[^\w-]/g, '');
  const tamanho = String(req.query.t || '').replace(/[^\d.,]/g, '').slice(0, 5);
  const origem = origemDe(req);
  const p = id ? (await produtos(origem)).get(id) : null;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // A pré-visualização muda pouco: a CDN guarda por um dia.
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  res.status(p || !id ? 200 : 404).send(
    paginaDePrevia({
      titulo: p ? nomeCompleto(p) : 'Pulse Atitude',
      detalhes: p
        ? [p.colorway, tamanho && `Tamanho ${tamanho}`, `Código ${p.id}`].filter(Boolean).join(' · ')
        : 'Running · Training · Casual',
      foto: p ? `${FOTOS}/og/${p.id}.jpg` : `${origem}/og.jpg`,
      url: `${origem}/p/${id}${tamanho ? `?t=${tamanho}` : ''}`,
      destino: `/produto/${encodeURIComponent(id)}`,
    }),
  );
}
