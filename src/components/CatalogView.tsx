// A grade do catálogo com os filtros. É a mesma tela para /catalogo, /marca/:slug,
// /categoria/:slug e /busca — muda só o que já vem escolhido.
//
// Os filtros vivem na URL (?q=&marca=&eixo=&min=&max=): assim o cliente manda o
// link do que achou e o outro lado abre exatamente a mesma lista.
import { useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import ProductCard from './ProductCard';
import { BRANDS, CATEGORIES } from '../config';
import { normalize, priceOf, useCatalog, type Product } from '../lib/catalog';

/** Quantos modelos entram na grade de cada vez. Com milhares de produtos, a
 *  grade inteira de uma vez travaria o navegador. */
const POR_VEZ = 48;

type Props = {
  titulo: string;
  subtitulo?: string;
  /** Marca travada pela rota (/marca/nike): some do filtro. */
  marcaFixa?: string;
  /** Eixo travado pela rota (/categoria/running). */
  eixoFixo?: string;
};

export default function CatalogView({ titulo, subtitulo, marcaFixa, eixoFixo }: Props) {
  const { ready, error, catalog } = useCatalog();
  const [params, setParams] = useSearchParams();

  const q = params.get('q') ?? '';
  const marca = marcaFixa ?? params.get('marca') ?? '';
  const eixo = eixoFixo ?? params.get('eixo') ?? '';
  const min = params.get('min') ?? '';
  const max = params.get('max') ?? '';

  // Mexer num filtro preserva os outros e apaga o que ficou vazio.
  const mexer = (chave: string, valor: string) => {
    const novo = new URLSearchParams(params);
    if (valor) novo.set(chave, valor);
    else novo.delete(chave);
    setParams(novo, { replace: true });
  };

  const limpar = () => setParams(new URLSearchParams(), { replace: true });

  // Só faz sentido oferecer o filtro de preço quando existe preço no catálogo.
  const temPreco = useMemo(() => catalog.products.some((p) => priceOf(p) !== undefined), [catalog]);

  const resultados = useMemo<Product[]>(() => {
    const palavras = normalize(q).split(/\s+/).filter(Boolean);
    const pisoNum = Number(min);
    const tetoNum = Number(max);
    const piso = min !== '' && Number.isFinite(pisoNum) ? pisoNum : undefined;
    const teto = max !== '' && Number.isFinite(tetoNum) ? tetoNum : undefined;

    return catalog.products.filter((p) => {
      if (marca && p.brand !== marca) return false;
      if (eixo && p.category !== eixo) return false;

      if (palavras.length) {
        const nomeMarca = BRANDS.find((b) => b.slug === p.brand)?.name ?? p.brand;
        const texto = normalize([p.id, p.name, nomeMarca, p.category, p.colorway, ...(p.tags ?? [])].join(' '));
        if (!palavras.every((w) => texto.includes(w))) return false;
      }

      if (piso !== undefined || teto !== undefined) {
        const preco = priceOf(p);
        // Produto sem preço fica de fora quando o cliente delimita uma faixa.
        if (preco === undefined) return false;
        if (piso !== undefined && preco < piso) return false;
        if (teto !== undefined && preco > teto) return false;
      }

      return true;
    });
  }, [catalog, q, marca, eixo, min, max]);

  // Contagem por marca, para mostrar ao lado do nome no filtro.
  const porMarca = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of catalog.products) {
      if (eixo && p.category !== eixo) continue;
      m.set(p.brand, (m.get(p.brand) ?? 0) + 1);
    }
    return m;
  }, [catalog, eixo]);

  // Mudou o filtro, a grade volta para o começo.
  const chaveFiltro = [q, marca, eixo, min, max].join('|');
  const [pagina, setPagina] = useState({ chave: chaveFiltro, n: POR_VEZ });
  const mostrando = pagina.chave === chaveFiltro ? pagina.n : POR_VEZ;
  const visiveis = resultados.slice(0, mostrando);

  const filtrando = Boolean(q || (!marcaFixa && marca) || (!eixoFixo && eixo) || min || max);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-8">
        <h1 className="ouro-texto font-display text-[clamp(2rem,5vw,3.5rem)] font-black uppercase leading-none">
          {titulo}
        </h1>
        {subtitulo ? <p className="mt-3 max-w-2xl text-nevoa">{subtitulo}</p> : null}
      </header>

      {/* ---------------- Filtros ---------------- */}
      <section
        aria-label="Filtros"
        className="mb-8 rounded-2xl border border-fio bg-carvao p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-ouro">
            <SlidersHorizontal className="h-4 w-4" />
            Filtrar
          </span>

          <input
            type="search"
            value={q}
            onChange={(e) => mexer('q', e.target.value)}
            placeholder="Modelo, cor, código…"
            aria-label="Filtrar por texto"
            className="h-10 min-w-0 flex-1 basis-56 rounded-full border border-fio bg-grafite px-4 text-sm text-white placeholder:text-nevoa focus:border-ouro focus:outline-none"
          />

          {filtrando ? (
            <button
              type="button"
              onClick={limpar}
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-fio px-4 text-xs font-semibold uppercase tracking-wider text-nevoa transition-colors hover:border-ouro hover:text-ouro-claro"
            >
              <X className="h-3.5 w-3.5" />
              Limpar
            </button>
          ) : null}
        </div>

        {/* Marca */}
        {marcaFixa ? null : (
          <fieldset className="mt-4">
            <legend className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-nevoa">Marca</legend>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <Chip ativo={marca === ''} onClick={() => mexer('marca', '')}>
                Todas
              </Chip>
              {BRANDS.map((b) => (
                <Chip key={b.slug} ativo={marca === b.slug} onClick={() => mexer('marca', b.slug)}>
                  {b.name}
                  <small className="ml-1.5 opacity-60">{porMarca.get(b.slug) ?? 0}</small>
                </Chip>
              ))}
            </div>
          </fieldset>
        )}

        {/* Eixo */}
        {eixoFixo ? null : (
          <fieldset className="mt-4">
            <legend className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-nevoa">Uso</legend>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <Chip ativo={eixo === ''} onClick={() => mexer('eixo', '')}>
                Todos
              </Chip>
              {CATEGORIES.map((c) => (
                <Chip key={c.slug} ativo={eixo === c.slug} onClick={() => mexer('eixo', c.slug)}>
                  {c.name}
                </Chip>
              ))}
            </div>
          </fieldset>
        )}

        {/* Preço — o campo existe desde já; liga sozinho quando houver preço. */}
        <fieldset className="mt-4">
          <legend className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-nevoa">Preço</legend>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={min}
              disabled={!temPreco}
              onChange={(e) => mexer('min', e.target.value)}
              placeholder="De R$"
              aria-label="Preço mínimo"
              className="h-10 w-32 rounded-full border border-fio bg-grafite px-4 text-sm text-white placeholder:text-nevoa focus:border-ouro focus:outline-none disabled:cursor-not-allowed disabled:opacity-45"
            />
            <span className="text-nevoa">—</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={max}
              disabled={!temPreco}
              onChange={(e) => mexer('max', e.target.value)}
              placeholder="Até R$"
              aria-label="Preço máximo"
              className="h-10 w-32 rounded-full border border-fio bg-grafite px-4 text-sm text-white placeholder:text-nevoa focus:border-ouro focus:outline-none disabled:cursor-not-allowed disabled:opacity-45"
            />
            {temPreco ? null : (
              <span className="text-xs text-nevoa">Preços em definição — peça pelo WhatsApp.</span>
            )}
          </div>
        </fieldset>
      </section>

      {/* ---------------- Resultado ---------------- */}
      {error ? (
        <p className="py-16 text-center text-nevoa">{error}</p>
      ) : !ready ? (
        <p className="py-16 text-center text-nevoa">Carregando o catálogo…</p>
      ) : resultados.length === 0 ? (
        <p className="py-16 text-center text-nevoa">
          Nada encontrado com esses filtros. Tente outra marca ou limpe a busca.
        </p>
      ) : (
        <>
          <p className="mb-5 text-sm text-nevoa">
            <strong className="text-white">{resultados.length}</strong>{' '}
            {resultados.length === 1 ? 'modelo' : 'modelos'}
          </p>
          <div className="grid justify-items-center gap-6 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
            {visiveis.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          {visiveis.length < resultados.length ? (
            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={() => setPagina({ chave: chaveFiltro, n: mostrando + POR_VEZ })}
                className="rounded-full border border-ouro px-8 py-3 text-sm font-bold uppercase tracking-wider text-ouro-claro transition-colors hover:bg-ouro hover:text-black"
              >
                Mostrar mais
              </button>
              <p className="mt-3 text-xs text-nevoa">
                {visiveis.length} de {resultados.length}
              </p>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function Chip({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
        ativo
          ? 'border-ouro bg-gradient-to-br from-ouro-claro to-ouro-escuro text-black'
          : 'border-fio bg-grafite text-nevoa hover:border-ouro hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}
