// As marcas como filtro, no mesmo padrão do catálogo da Arkad ("Escolha o país"):
// passar o mouse (ou tocar) abre o painel da marca e mostra os modelos dela
// logo abaixo, sem trocar de página. Clicar de novo (ou Enter) abre a marca.
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProductCard from './ProductCard';
import { ElasticGallery, type ElasticItem } from './ui/elastic-gallery';
import { BRANDS, CATEGORIES } from '../config';
import { normalize, useCatalog } from '../lib/catalog';

const PREVIEW = 8; // modelos mostrados antes do "ver todos"

export default function BrandGallery() {
  const { catalog } = useCatalog();
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  // Só entra marca que tem modelo: painel que leva a uma página vazia frustra.
  const marcas = useMemo(() => {
    const conta = new Map<string, number>();
    for (const p of catalog.products) conta.set(p.brand, (conta.get(p.brand) ?? 0) + 1);
    return BRANDS.map((b) => ({ ...b, modelos: conta.get(b.slug) ?? 0 })).filter((b) => b.modelos > 0);
  }, [catalog.products]);

  const [slug, setSlug] = useState('');
  const ativa = marcas.find((b) => b.slug === slug) ?? marcas[0];

  const items = useMemo<ElasticItem[]>(
    () =>
      marcas.map((b) => ({
        id: b.slug,
        title: b.name,
        category: CATEGORIES.find((c) => c.slug === b.category)?.name ?? b.category,
        meta: `${b.modelos.toLocaleString('pt-BR')} ${b.modelos === 1 ? 'modelo' : 'modelos'} · ${b.tagline.toLowerCase()} ${b.blurb}`,
        src: b.hero,
        alt: `${b.name}: ${b.tagline.toLowerCase()} ${b.blurb}`,
        badge: <img src={b.logo} alt="" aria-hidden className="h-8 w-auto max-w-[96px] object-contain md:h-11 md:max-w-[130px]" />,
        icon: <img src={b.logo} alt="" aria-hidden className="h-6 w-auto max-w-[44px] object-contain md:h-7 md:max-w-[50px]" />,
        cta: 'Ver modelos',
      })),
    [marcas],
  );

  const modelos = useMemo(
    () => (ativa ? catalog.products.filter((p) => p.brand === ativa.slug) : []),
    [catalog.products, ativa],
  );
  const achados = q ? modelos.filter((p) => normalize([p.name, p.colorway, ...(p.tags ?? [])].join(' ')).includes(normalize(q))) : modelos;
  const mostrados = achados.slice(0, PREVIEW);

  if (!ativa) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-ouro">Marcas</p>
          <h2 className="mt-1 font-display text-3xl font-extrabold uppercase text-white sm:text-4xl">Escolha a marca</h2>
        </div>
        <Link
          to="/marcas"
          className="text-sm font-semibold uppercase tracking-wider text-nevoa transition-colors hover:text-ouro-claro"
        >
          Todas as marcas →
        </Link>
      </div>

      <ElasticGallery
        label="Marcas do catálogo"
        plural="marcas"
        items={items}
        activeId={ativa.slug}
        onActiveChange={(id) => {
          setSlug(id);
          setQ('');
        }}
        onOpen={(item) => navigate(`/marca/${item.id}`)}
      />

      <p className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-nevoa">
        <span className="hidden md:inline">
          Passe o mouse para abrir · use as setas para ver as {items.length} marcas · clique para entrar
        </span>
        <span className="md:hidden">
          Toque para abrir · deslize para ver as {items.length} marcas · toque de novo para entrar
        </span>
        {/* Crédito da foto aberta: as de licença CC BY-SA pedem o nome do autor. */}
        {ativa.heroCredito ? (
          <a
            href={ativa.heroCredito.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-nevoa/70 transition-colors hover:text-nevoa"
          >
            Foto {ativa.name}: {ativa.heroCredito.autor} · {ativa.heroCredito.licenca}
          </a>
        ) : null}
      </p>

      {/* Os modelos da marca aberta, logo abaixo */}
      <div className="mt-10">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-fio pb-4">
          <div className="flex items-center gap-4">
            <img src={ativa.logo} alt="" aria-hidden className="h-9 w-auto max-w-[110px] object-contain" />
            <h3 className="font-display text-2xl font-extrabold uppercase leading-none text-white">
              Modelos · {ativa.name}
            </h3>
          </div>
          <Link
            to={`/marca/${ativa.slug}`}
            className="text-sm font-semibold uppercase tracking-wider text-ouro-claro transition-colors hover:text-white"
          >
            Ver os {ativa.modelos.toLocaleString('pt-BR')} →
          </Link>
        </div>

        {modelos.length > PREVIEW ? (
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Filtrar modelos ${ativa.name}: nome, cor, código…`}
            aria-label={`Filtrar modelos ${ativa.name}`}
            className="mb-6 h-10 w-full max-w-md rounded-full border border-fio bg-grafite px-4 text-sm text-white placeholder:text-nevoa focus:border-ouro focus:outline-none"
          />
        ) : null}

        {mostrados.length ? (
          <div className="grid justify-items-center gap-6 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
            {mostrados.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <p className="py-10 text-center text-nevoa">
            Nenhum modelo {ativa.name} com "{q}". Tente outro nome ou cor.
          </p>
        )}

        {achados.length > PREVIEW ? (
          <p className="mt-6 text-center">
            <Link
              to={q ? `/marca/${ativa.slug}?q=${encodeURIComponent(q)}` : `/marca/${ativa.slug}`}
              className="inline-block rounded-full border border-ouro px-8 py-3 text-sm font-bold uppercase tracking-wider text-ouro-claro transition-colors hover:bg-ouro hover:text-black"
            >
              Ver {q ? `os ${achados.length} encontrados` : `todos os ${ativa.modelos.toLocaleString('pt-BR')} ${ativa.name}`}
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}
