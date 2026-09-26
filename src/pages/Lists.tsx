// As telas que são a mesma grade com um filtro já escolhido:
// catálogo inteiro, uma marca, um eixo de uso, e a busca.
import { Link, useParams, useSearchParams } from 'react-router-dom';
import CatalogView from '../components/CatalogView';
import { BRANDS, CATEGORIES, COPY, brandBySlug } from '../config';
import { useCatalog } from '../lib/catalog';

export function CatalogPage() {
  return <CatalogView titulo="Catálogo" subtitulo={`${COPY.eixos}. ${COPY.atributos}`} />;
}

export function BrandPage() {
  const { slug = '' } = useParams();
  const marca = brandBySlug.get(slug);

  if (!marca) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center">
        <p className="text-nevoa">Marca não encontrada.</p>
        <Link to="/marcas" className="mt-4 inline-block text-ouro-claro">
          Ver todas as marcas
        </Link>
      </div>
    );
  }

  const eixo = CATEGORIES.find((c) => c.slug === marca.category)?.name;
  return (
    <CatalogView
      titulo={marca.name}
      subtitulo={`${marca.tagline} ${marca.blurb}. ${eixo ? eixo + '.' : ''}`}
      marcaFixa={marca.slug}
    />
  );
}

export function CategoryPage() {
  const { slug = '' } = useParams();
  const eixo = CATEGORIES.find((c) => c.slug === slug);

  if (!eixo) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center">
        <p className="text-nevoa">Categoria não encontrada.</p>
        <Link to="/catalogo" className="mt-4 inline-block text-ouro-claro">
          Ver o catálogo
        </Link>
      </div>
    );
  }

  return <CatalogView titulo={eixo.name} subtitulo={eixo.blurb} eixoFixo={eixo.slug} />;
}

export function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get('q') ?? '';
  return <CatalogView titulo="Busca" subtitulo={q ? `Resultados para "${q}".` : 'Digite o que procura.'} />;
}

/** Vitrine das marcas: uma porta para cada filtro. */
export function BrandsPage() {
  const { catalog } = useCatalog();
  const contagem = new Map<string, number>();
  for (const p of catalog.products) contagem.set(p.brand, (contagem.get(p.brand) ?? 0) + 1);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="ouro-texto font-display text-[clamp(2rem,5vw,3.5rem)] font-black uppercase leading-none">
        Marcas
      </h1>
      <p className="mt-3 max-w-2xl text-nevoa">{COPY.subchamada}</p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {BRANDS.map((b) => (
          <Link
            key={b.slug}
            to={`/marca/${b.slug}`}
            className="group relative overflow-hidden rounded-2xl border border-fio bg-carvao transition-colors hover:border-ouro"
          >
            <img
              src={b.hero}
              alt=""
              loading="lazy"
              className="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-4">
              <h2 className="font-display text-2xl font-extrabold uppercase text-white">{b.name}</h2>
              <p className="text-xs uppercase tracking-[0.2em] text-ouro">
                {CATEGORIES.find((c) => c.slug === b.category)?.name}
              </p>
              <p className="mt-1 text-xs text-nevoa">
                {contagem.get(b.slug) ?? 0} {(contagem.get(b.slug) ?? 0) === 1 ? 'modelo' : 'modelos'}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
