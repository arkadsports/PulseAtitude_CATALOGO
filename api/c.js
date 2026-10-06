// /c?i=id:tamanho:qtd,... — o link do pedido inteiro, que abre a mensagem do
// carrinho no WhatsApp.
//
// O WhatsApp só mostra a pré-visualização do primeiro link da mensagem, então
// um link por tênis mostraria só a foto do primeiro. Este link vale pelo
// pedido todo: a imagem da pré-visualização é a montagem com a foto de cada
// item (api/colagem.js), e quem toca nele abre /pedido, a página com as fotos,
// tamanhos e quantidades de tudo.
import { lerItens, nomeCompleto, origemDe, paginaDePrevia, produtos } from './_lib.js';

export default async function handler(req, res) {
  const itens = lerItens(req.query.i);
  const origem = origemDe(req);
  const catalogo = await produtos(origem);
  const linhas = itens.flatMap((i) => (catalogo.has(i.id) ? [{ ...i, p: catalogo.get(i.id) }] : []));
  const pares = linhas.reduce((s, l) => s + l.qty, 0);
  const codigo = encodeURIComponent(itens.map((i) => `${i.id}:${i.size}:${i.qty}`).join(','));

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // O endereço já diz o pedido inteiro: o que ele mostra não muda.
  res.setHeader('Cache-Control', 'public, s-maxage=31536000, immutable');
  res.status(linhas.length ? 200 : 404).send(
    paginaDePrevia({
      titulo: linhas.length
        ? `Pedido Pulse Atitude · ${pares} ${pares === 1 ? 'par' : 'pares'}`
        : 'Pulse Atitude',
      detalhes: linhas
        .map((l) => `${nomeCompleto(l.p)} (tam. ${l.size || '—'}${l.qty > 1 ? `, ${l.qty} pares` : ''})`)
        .join(' · '),
      foto: `${origem}/api/colagem?i=${encodeURIComponent(linhas.map((l) => l.id).join(','))}`,
      largura: 900,
      altura: 900,
      url: `${origem}/c?i=${codigo}`,
      destino: `/pedido?i=${codigo}`,
    }),
  );
}
