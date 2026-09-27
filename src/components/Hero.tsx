// Abertura: a pergunta da campanha, os três eixos e o carrossel de marcas.
// Cada carta do carrossel é uma marca e leva para o catálogo já filtrado nela.
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CoverFlowCarousel, type CarouselItem } from './ui/3-d-coverflow-carousel';
import { BRANDS, CATEGORIES, COPY } from '../config';

export default function Hero({ modelos }: { modelos: number }) {
  const navigate = useNavigate();

  const cartas = useMemo<CarouselItem[]>(
    () =>
      BRANDS.map((b) => ({
        tag: `#${CATEGORIES.find((c) => c.slug === b.category)?.name ?? b.category}`,
        titleLine1: b.name,
        titleLine2: b.tagline,
        desc: b.blurb,
        img: b.hero,
        logo: b.logo,
        ctaText: `Ver ${b.name}`,
        ctaUrl: `/marca/${b.slug}`,
      })),
    [],
  );

  return (
    <>
      <section className="relative overflow-hidden border-b border-fio">
        {/* Halo dourado atrás do texto, como o anel da logo. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(70% 60% at 50% -10%, rgba(215,151,42,.30) 0%, rgba(5,5,5,0) 70%)',
          }}
        />

        <div className="relative mx-auto max-w-5xl px-4 py-20 text-center sm:py-28">
          <p className="font-display text-xs font-bold uppercase tracking-[0.45em] text-ouro sm:text-sm">
            {COPY.eixos}
          </p>

          <h1 className="ouro-texto mt-6 font-display text-[clamp(2.4rem,8vw,5.5rem)] font-black uppercase leading-[0.95] tracking-tight">
            {COPY.manchete}
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-white/80 sm:text-xl">
            {COPY.submanchete}
          </p>

          <div className="mx-auto mt-8 h-px w-40 ouro-fio" />

          <p className="mt-8 font-display text-xl font-extrabold uppercase tracking-[0.12em] text-white sm:text-2xl">
            {COPY.atitude}
          </p>
          <p className="mt-2 text-sm uppercase tracking-[0.25em] text-nevoa">{COPY.atributos}</p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/catalogo" className="btn-ouro rounded-full px-8 py-3.5 text-sm">
              Ver o catálogo
            </Link>
            <Link
              to="/marcas"
              className="rounded-full border border-fio px-8 py-3.5 text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:border-ouro hover:text-ouro-claro"
            >
              Escolher por marca
            </Link>
          </div>

          <p className="mt-8 text-xs uppercase tracking-[0.3em] text-nevoa">
            {modelos > 0 ? `${modelos} modelos · ` : ''}
            {COPY.entrega}
          </p>
        </div>
      </section>

      {/* Os três eixos, em faixa */}
      <section className="border-b border-fio bg-carvao">
        <div className="mx-auto grid max-w-7xl gap-px bg-fio sm:grid-cols-3">
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              to={`/categoria/${c.slug}`}
              className="group bg-carvao px-6 py-8 transition-colors hover:bg-grafite"
            >
              <h2 className="font-display text-2xl font-extrabold uppercase tracking-wide text-white group-hover:text-ouro-claro">
                {c.name}
              </h2>
              <p className="mt-2 text-sm text-nevoa">{c.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Carrossel de marcas */}
      <CoverFlowCarousel
        items={cartas}
        sectionLabel="Escolha pela marca"
        onCtaClick={(item) => item.ctaUrl && navigate(item.ctaUrl)}
      />
    </>
  );
}
