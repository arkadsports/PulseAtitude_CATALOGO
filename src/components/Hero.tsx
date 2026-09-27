// Abertura: a pergunta da campanha, compacta, e logo abaixo a galeria de
// marcas (a sanfona do catálogo da Arkad) com os modelos da marca aberta.
// Depois, os três eixos.
import { Link } from 'react-router-dom';
import BrandGallery from './BrandGallery';
import { CATEGORIES, COPY } from '../config';

export default function Hero({ modelos }: { modelos: number }) {

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

        <div className="relative mx-auto max-w-4xl px-4 py-8 text-center sm:py-12">
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.4em] text-ouro sm:text-xs">
            {COPY.eixos}
          </p>

          <h1 className="ouro-texto mt-3 font-display text-[clamp(1.7rem,4.6vw,3.1rem)] font-black uppercase leading-[0.95] tracking-tight">
            {COPY.manchete}
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">
            {COPY.submanchete}
          </p>

          <div className="mx-auto mt-5 h-px w-32 ouro-fio" />

          <p className="mt-5 font-display text-base font-extrabold uppercase tracking-[0.12em] text-white sm:text-lg">
            {COPY.atitude}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.25em] text-nevoa">{COPY.atributos}</p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link to="/catalogo" className="btn-ouro rounded-full px-6 py-2.5 text-xs">
              Ver o catálogo
            </Link>
            <Link
              to="/marcas"
              className="rounded-full border border-fio px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:border-ouro hover:text-ouro-claro"
            >
              Escolher por marca
            </Link>
          </div>

          <p className="mt-5 text-[11px] uppercase tracking-[0.3em] text-nevoa">
            {modelos > 0 ? `${modelos} modelos · ` : ''}
            {COPY.entrega}
          </p>
        </div>
      </section>

      <BrandGallery />

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
    </>
  );
}
