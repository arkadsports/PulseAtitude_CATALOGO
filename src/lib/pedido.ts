// O pedido do carrinho em mensagem de WhatsApp — e as fotos dele.
//
// O wa.me só leva texto, e o WhatsApp só mostra a pré-visualização do PRIMEIRO
// link da mensagem. Por isso a mensagem abre com um link do pedido inteiro,
// /c?i=... (api/c.js): a pré-visualização dele é uma montagem com a foto de
// cada item (api/colagem.js), e quem toca nele abre /pedido, a página com as
// fotos, tamanhos e quantidades de tudo.
//
// No celular há ainda "Enviar com as fotos": o compartilhamento do aparelho
// manda as fotos de verdade, uma por item, junto com o texto (fotosDoPedido).
import { STORE } from '../config';
import { codificarItens, type CartItem } from './cart';
import { nomeCompleto, priceLabel, type Product } from './catalog';

export type LinhaDoPedido = CartItem & { produto: Product };

const origem = () => (typeof window === 'undefined' ? '' : window.location.origin);

/** Link do pedido inteiro: a pré-visualização mostra a foto de cada item. */
export const linkDoPedido = (itens: CartItem[]) => `${origem()}/c?i=${encodeURIComponent(codificarItens(itens))}`;

export function textoDoPedido(linhas: LinhaDoPedido[], comLink = true) {
  const pares = linhas.reduce((s, l) => s + l.qty, 0);
  const partes = [
    `Olá! Quero fazer este pedido na ${STORE.name}:`,
    '',
    ...linhas.flatMap((l, i) => [
      `${i + 1}. *${nomeCompleto(l.produto)}*`,
      `   Tamanho: ${l.size} · Quantidade: ${l.qty}`,
      `   ${[l.produto.colorway && `Cor: ${l.produto.colorway}`, `Código: ${l.produto.id}`, priceLabel(l.produto)]
        .filter(Boolean)
        .join(' · ')}`,
    ]),
    '',
    `Total: ${pares} ${pares === 1 ? 'par' : 'pares'}.`,
  ];
  // O link vai logo depois da saudação: é o primeiro link da mensagem, e é
  // dele que o WhatsApp tira a pré-visualização com as fotos.
  if (comLink) partes.splice(1, 0, `Fotos e detalhes: ${linkDoPedido(linhas)}`);
  return partes.join('\n');
}

export function whatsappDoPedido(linhas: LinhaDoPedido[]) {
  const texto = encodeURIComponent(textoDoPedido(linhas));
  return STORE.whatsapp ? `https://wa.me/${STORE.whatsapp}?text=${texto}` : `https://wa.me/?text=${texto}`;
}

/** O aparelho sabe compartilhar arquivos (celular, quase sempre)? */
export function podeEnviarFotos() {
  if (typeof navigator === 'undefined' || !navigator.canShare) return false;
  try {
    const teste = new File([new Blob(['x'], { type: 'image/jpeg' })], 'teste.jpg', { type: 'image/jpeg' });
    return navigator.canShare({ files: [teste] });
  } catch {
    return false;
  }
}

/** As fotos do pedido como arquivos, uma por item, para o compartilhamento do
 *  aparelho. Vêm de /api/foto (mesmo endereço do site): direto do R2 o
 *  navegador bloquearia, por ser outro domínio. */
export async function fotosDoPedido(linhas: LinhaDoPedido[]) {
  const arquivos = await Promise.all(
    linhas.map(async (l, i) => {
      const r = await fetch(`/api/foto?id=${encodeURIComponent(l.produto.id)}`);
      if (!r.ok) return null;
      const nome = `${i + 1}-${nomeCompleto(l.produto)}-tam-${l.size}`.replace(/[^\w-]+/g, '-').slice(0, 60);
      return new File([await r.blob()], `${nome}.jpg`, { type: 'image/jpeg' });
    }),
  );
  return arquivos.filter((a): a is File => a !== null);
}
