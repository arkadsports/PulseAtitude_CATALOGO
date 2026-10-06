// A carta pequena da grade compacta: três por linha no celular. A carta 3D
// (ProductCard) não cabe num terço da tela, então aqui vai só o essencial —
// foto, nome, marca e preço — e o resto fica na página do produto.
import { Link } from 'react-router-dom';
import { brandBySlug } from '../config';
import { cover, priceLabel, type Product } from '../lib/catalog';

const SEM_FOTO = '/sem-foto.svg';

export default function ProductCardMini({ product }: { product: Product }) {
  const marca = brandBySlug.get(product.brand)?.name ?? product.brand;
  return (
    <Link
      to={`/produto/${product.id}`}
      aria-label={`${marca} ${product.name}`}
      className="group flex w-full min-w-0 flex-col overflow-hidden rounded-xl border border-fio bg-carvao transition-colors hover:border-ouro/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ouro-claro"
    >
      <div className="aspect-square overflow-hidden bg-grafite">
        <img
          src={cover(product)}
          alt=""
          loading="lazy"
          decoding="async"
          onError={(e) => {
            if (!e.currentTarget.src.endsWith(SEM_FOTO)) e.currentTarget.src = SEM_FOTO;
          }}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-2 sm:p-2.5">
        <p className="line-clamp-2 text-[11px] font-semibold leading-tight text-white sm:text-xs">{product.name}</p>
        <p className="truncate text-[10px] text-nevoa sm:text-[11px]">{marca}</p>
        <p className="mt-auto pt-1 text-[11px] font-bold text-ouro-claro sm:text-xs">{priceLabel(product)}</p>
      </div>
    </Link>
  );
}
