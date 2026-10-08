// As marcas como filtro, no mesmo padrão do catálogo da Arkad ("Escolha o país"):
// passar o mouse (ou tocar) abre o painel da marca e mostra os modelos dela
// logo abaixo, sem trocar de página. Clicar de novo (ou Enter) abre a marca.
//
// Embaixo, o tipo de tênis filtra os modelos da marca aberta (Nike + Running).
// Tipo e marca são independentes: o tipo vem do cadastro de cada produto.
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import GradeToggle from './GradeToggle';
import ProductGrid from './ProductGrid';
import { ElasticGallery, type ElasticItem } from './ui/elastic-gallery';
import { BRANDS, CATEGORIES, KINDS } from '../config';
import { cover, kindOf, normalize, useCatalog, type Product } from '../lib/catalog';
import { useGrade } from '../lib/grade';

// Modelos mostrados antes do "ver todos". Na ampla, 7 + 1 frase = 2 fileiras;
// na compacta, 12 (fecha linhas de 3, 4 e 6) e a frase vem em faixa à parte.
const PREVIEW_AMPLA = 7;
const PREVIEW_COMPACTA = 12;

export default function BrandGallery() {
  const { catalog } = useCatalog();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState('');
  const { compacta } = useGrade();
  const PREVIEW = compacta ? PREVIEW_COMPACTA : PREVIEW_AMPLA;

  // Só entra marca que tem modelo: painel que leva a uma página vazia frustra.
  const marcas = useMemo(() => {
    const conta = new Map<string, number>();
    const tipos = new Map<string, Set<string>>();
    const produtos = new Map<string, Set<string>>();
    const primeiro = new Map<string, Product>(); // o mais novo: o catálogo vem nessa ordem
    for (const p of catalog.products) {
      conta.set(p.brand, (conta.get(p.brand) ?? 0) + 1);
      if (!tipos.has(p.brand)) tipos.set(p.brand, new Set());
      if (p.category) tipos.get(p.brand)!.add(p.category);
      if (!produtos.has(p.brand)) produtos.set(p.brand, new Set());
      produtos.get(p.brand)!.add(kindOf(p));
      if (!primeiro.has(p.brand)) primeiro.set(p.brand, p);
    }
    return BRANDS.map((b) => {
      const capa = primeiro.get(b.slug);
      return {
        ...b,
        modelos: conta.get(b.slug) ?? 0,
        // Os tipos de tênis que a marca tem de fato, na ordem de CATEGORIES...
        tipos: CATEGORIES.filter((c) => tipos.get(b.slug)?.has(c.slug)),
        // ...e as roupas, para o selo da carta ("Running · Camisas").
        roupas: KINDS.filter((k) => k.slug !== 'tenis' && produtos.get(b.slug)?.has(k.slug)),
        // Sem foto própria, a carta usa a capa do produto mais novo da marca.
        foto: b.hero ?? (capa ? cover(capa, 'full') : '/sem-foto.svg'),
        // Painel fechado: a foto de um produto da marca (a peça de propaganda,
        // estreita, viraria um pedaço de letreiro).
        fotoFechado: capa ? cover(capa) : undefined,
      };
    // "Outras marcas" é filtro, não marca: não vira carta da galeria.
    }).filter((b) => b.modelos > 0 && b.slug !== 'outras');
  }, [catalog.products]);

  const [slug, setSlug] = useState('');
  const ativa = marcas.find((b) => b.slug === slug) ?? marcas[0];

  const items = useMemo<ElasticItem[]>(
    () =>
      marcas.map((b) => ({
        id: b.slug,
        title: b.name,
        // Curto, para não subir sobre o produto da peça: os tipos de produto
        // (o tipo de tênis fica nos botões logo abaixo da galeria).
        category: [...(b.tipos.length ? [KINDS[0]] : []), ...b.roupas].map((c) => c.name).join(' · '),
        meta: `${b.modelos.toLocaleString('pt-BR')} ${b.modelos === 1 ? 'modelo' : 'modelos'}`,
        src: b.foto,
        srcFechado: b.fotoFechado,
        alt: `${b.name}: ${b.tagline.toLowerCase()} ${b.blurb}`,
        badge: b.logo ? (
          <img src={b.logo} alt="" aria-hidden className="h-8 w-auto max-w-[96px] object-contain md:h-11 md:max-w-[130px]" />
        ) : undefined,
        icon: b.logo ? (
          <img src={b.logo} alt="" aria-hidden className="h-6 w-auto max-w-[44px] object-contain md:h-7 md:max-w-[50px]" />
        ) : undefined,
        cta: 'Ver modelos',
      })),
    [marcas],
  );

  const daMarca = useMemo(
    () => (ativa ? catalog.products.filter((p) => p.brand === ativa.slug) : []),
    [catalog.products, ativa],
  );
  // Tipo pedido que a marca não tem (trocou de marca): volta para "Todos".
  const tipoAtivo = ativa?.tipos.some((c) => c.slug === tipo) ? tipo : '';
  const modelos = tipoAtivo ? daMarca.filter((p) => p.category === tipoAtivo) : daMarca;
  const nomeTipo = CATEGORIES.find((c) => c.slug === tipoAtivo)?.name;
  const linkMarca = (extra: Record<string, string>) => {
    const qs = new URLSearchParams({ ...(tipoAtivo ? { eixo: tipoAtivo } : {}), ...extra }).toString();
    return `/marca/${ativa.slug}${qs ? '?' + qs : ''}`;
  };
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
            {ativa.logo ? (
              <img src={ativa.logo} alt="" aria-hidden className="h-9 w-auto max-w-[110px] object-contain" />
            ) : null}
            <h3 className="font-display text-2xl font-extrabold uppercase leading-none text-white">
              Modelos · {ativa.name}
            </h3>
          </div>
          <div className="flex items-center gap-4">
            <GradeToggle />
            <Link
              to={linkMarca({})}
              className="text-sm font-semibold uppercase tracking-wider text-ouro-claro transition-colors hover:text-white"
            >
              Ver os {modelos.length.toLocaleString('pt-BR')} →
            </Link>
          </div>
        </div>

        {/* Tipo de tênis dentro da marca: só os tipos que ela tem. */}
        {ativa.tipos.length > 1 ? (
          <div role="group" aria-label="Tipo de tênis" className="mb-4 flex flex-wrap gap-2">
            {[{ slug: '', name: 'Todos' }, ...ativa.tipos].map((c) => {
              const ligado = tipoAtivo === c.slug;
              const n = c.slug ? daMarca.filter((p) => p.category === c.slug).length : daMarca.length;
              return (
                <button
                  key={c.slug || 'todos'}
                  type="button"
                  aria-pressed={ligado}
                  onClick={() => setTipo(c.slug)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                    ligado
                      ? 'border-ouro bg-gradient-to-br from-ouro-claro to-ouro-escuro text-black'
                      : 'border-fio bg-grafite text-nevoa hover:border-ouro hover:text-white'
                  }`}
                >
                  {c.name}
                  <small className="ml-1.5 opacity-60">{n.toLocaleString('pt-BR')}</small>
                </button>
              );
            })}
          </div>
        ) : null}

        {daMarca.length > PREVIEW ? (
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Filtrar modelos ${ativa.name}${nomeTipo ? ' ' + nomeTipo : ''}: nome, cor, código…`}
            aria-label={`Filtrar modelos ${ativa.name}`}
            className="mb-6 h-10 w-full max-w-md rounded-full border border-fio bg-grafite px-4 text-sm text-white placeholder:text-nevoa focus:border-ouro focus:outline-none"
          />
        ) : null}

        {mostrados.length ? (
          <ProductGrid
            key={`${ativa.slug}|${tipoAtivo}|${q}`}
            produtos={mostrados}
            promos={mostrados.length >= 5 ? { primeira: 5, aCada: 1000 } : false}
          />
        ) : (
          <p className="py-10 text-center text-nevoa">
            Nenhum modelo {ativa.name}
            {nomeTipo ? ` ${nomeTipo}` : ''} com "{q}". Tente outro nome ou cor.
          </p>
        )}

        {achados.length > PREVIEW ? (
          <p className="mt-6 text-center">
            <Link
              to={linkMarca(q ? { q } : {})}
              className="inline-block rounded-full border border-ouro px-8 py-3 text-sm font-bold uppercase tracking-wider text-ouro-claro transition-colors hover:bg-ouro hover:text-black"
            >
              Ver{' '}
              {q
                ? `os ${achados.length} encontrados`
                : `todos os ${modelos.length.toLocaleString('pt-BR')} ${ativa.name}${nomeTipo ? ' ' + nomeTipo : ''}`}
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}
