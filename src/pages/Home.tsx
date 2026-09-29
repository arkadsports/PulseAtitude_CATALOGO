// Início: abertura da campanha, carrossel de marcas e uma amostra do catálogo.
import { Link } from 'react-router-dom';
import Hero from '../components/Hero';
import ProductGrid from '../components/ProductGrid';
import { COPY } from '../config';
import { useCatalog } from '../lib/catalog';

export default function Home() {
  const { ready, error, catalog } = useCatalog();
  // 7 tênis e uma frase comercial: duas fileiras cheias.
  const destaques = catalog.products.slice(0, 7);

  return (
    <>
      <Hero modelos={catalog.products.length} />

      {/* A frase da campanha, sozinha, entre o carrossel e a grade. */}
      <section className="border-y border-fio bg-carvao">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <h2 className="font-display text-[clamp(1.8rem,5vw,3.25rem)] font-black uppercase leading-tight text-white">
            {COPY.chamada}
          </h2>
          <div className="mx-auto mt-6 h-px w-32 ouro-fio" />
          <p className="mt-6 text-lg text-nevoa">{COPY.subchamada}</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-ouro">Novidades</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold uppercase text-white sm:text-4xl">
              O que chegou
            </h2>
          </div>
          <Link
            to="/catalogo"
            className="text-sm font-semibold uppercase tracking-wider text-nevoa transition-colors hover:text-ouro-claro"
          >
            Ver tudo →
          </Link>
        </div>

        {error ? (
          <p className="py-16 text-center text-nevoa">{error}</p>
        ) : !ready ? (
          <p className="py-16 text-center text-nevoa">Carregando o catálogo…</p>
        ) : destaques.length === 0 ? (
          <p className="py-16 text-center text-nevoa">
            O catálogo ainda está sendo montado. Volte em instantes.
          </p>
        ) : (
          <ProductGrid produtos={destaques} promos={{ primeira: 5, aCada: 1000 }} />
        )}
      </section>
    </>
  );
}
