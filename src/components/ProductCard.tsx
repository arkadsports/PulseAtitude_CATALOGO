// A carta do produto na grade: o componente 3D de "components/ui/card-7",
// embrulhado num link para a página do produto. Foto que não existe cai no
// desenho de "sem foto" — o catálogo nasce antes das fotos subirem.
import { Link } from 'react-router-dom';
import { InteractiveProductCard } from './ui/card-7';
import { CATEGORIES, brandBySlug } from '../config';
import { cover, priceLabel, sortSizes, type Product } from '../lib/catalog';

export default function ProductCard({ product }: { product: Product }) {
  const marca = brandBySlug.get(product.brand);
  const eixo = CATEGORIES.find((c) => c.slug === product.category)?.name;

  // "relative" com "hover:z-10": a carta cresce 5% ao passar o mouse e não pode
  // ficar por baixo da vizinha.
  return (
    <Link
      to={`/produto/${product.id}`}
      className="relative block rounded-3xl hover:z-10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ouro-claro"
      aria-label={`${marca?.name ?? ''} ${product.name}`}
    >
      <InteractiveProductCard
        imageUrl={cover(product)}
        title={product.name}
        description={[marca?.name, product.colorway].filter(Boolean).join(' · ')}
        price={priceLabel(product)}
        sizes={sortSizes(product.sizes)}
        photos={product.photos || 1}
        badge={eixo}
        fallbackUrl="/sem-foto.svg"
      />
    </Link>
  );
}
