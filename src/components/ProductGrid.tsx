// A grade de tênis, com os cards de frase comercial intercalados.
//
// "promos" diz onde entram: a primeira na posição "primeira" da grade (contando
// cartas e cards juntos) e depois uma a cada "aCada" posições. Sem "promos",
// só os tênis. Cada posição guarda a sua frase: ao "Mostrar mais", as frases
// que o cliente já viu não trocam debaixo dos olhos dele.
import { useState } from 'react';
import ProductCard from './ProductCard';
import PromoCard, { proximaPromo, type Promo } from './PromoCard';
import type { Product } from '../lib/catalog';

type Props = {
  produtos: Product[];
  promos?: { primeira: number; aCada: number } | false;
};

export default function ProductGrid({ produtos, promos = false }: Props) {
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
