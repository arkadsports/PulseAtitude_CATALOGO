// A grade de tênis, com os cards de frase comercial intercalados.
//
// "promos" diz onde entram: a primeira na posição "primeira" da grade (contando
// cartas e cards juntos) e depois uma a cada "aCada" posições. Sem "promos",
// só os tênis. Cada posição guarda a sua frase: ao "Mostrar mais", as frases
// que o cliente já viu não trocam debaixo dos olhos dele.
//
// Duas caras (lib/grade.tsx): ampla, com a carta 3D, ou compacta, com a carta
// pequena — 3 por linha no celular. Na compacta a frase vira uma faixa da
// largura da linha, e "grid-flow-dense" a empurra para depois de uma linha
// cheia, seja a grade de 3, 4, 5 ou 6 colunas.
import { useState } from 'react';
import ProductCard from './ProductCard';
import ProductCardMini from './ProductCardMini';
import PromoCard, { PromoFaixa, proximaPromo, type Promo } from './PromoCard';
import type { Product } from '../lib/catalog';
import { useGrade } from '../lib/grade';

type Props = {
  produtos: Product[];
  promos?: { primeira: number; aCada: number } | false;
};

export default function ProductGrid({ produtos, promos = false }: Props) {
  const { compacta } = useGrade();
  // Um mapa por grade, criado uma vez: posição -> frase. (A grade é recriada,
  // com frases novas, quando o filtro muda — quem a usa passa "key".)
  const [frases] = useState(() => new Map<number, Promo>());
  const fraseDa = (posicao: number) => {
    if (!frases.has(posicao)) frases.set(posicao, proximaPromo());
    return frases.get(posicao)!;
  };

  const itens: ({ tipo: 'produto'; produto: Product } | { tipo: 'promo'; posicao: number })[] = [];
  for (const produto of produtos) {
    const posicao = itens.length;
    if (promos && posicao >= promos.primeira && (posicao - promos.primeira) % promos.aCada === 0) {
      itens.push({ tipo: 'promo', posicao });
    }
    itens.push({ tipo: 'produto', produto });
  }

  if (compacta) {
    return (
      <div className="grid grid-flow-row-dense grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6">
        {itens.map((item) =>
          item.tipo === 'produto' ? (
            <ProductCardMini key={item.produto.id} product={item.produto} />
          ) : (
            <PromoFaixa key={`promo-${item.posicao}`} promo={fraseDa(item.posicao)} />
          ),
        )}
      </div>
    );
  }

  return (
    <div className="grid justify-items-center gap-6 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
      {itens.map((item) =>
        item.tipo === 'produto' ? (
          <ProductCard key={item.produto.id} product={item.produto} />
        ) : (
          <PromoCard key={`promo-${item.posicao}`} promo={fraseDa(item.posicao)} />
        ),
      )}
    </div>
  );
}
