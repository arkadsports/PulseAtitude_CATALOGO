// A grade do catálogo com os filtros. É a mesma tela para /catalogo, /marca/:slug,
// /categoria/:slug e /busca — muda só o que já vem escolhido.
//
// Os filtros vivem na URL (?q=&marca=&produto=&eixo=&cor=&min=&max=): assim o cliente
// manda o link do que achou e o outro lado abre exatamente a mesma lista.
//
// Produto (tênis, camisa, bermuda), marca e tipo de tênis (eixo) são filtros
// independentes, e somam. Marca e tipo de tênis também: Nike +
// Running mostra só os Nike classificados como Running. O tipo vem do cadastro
// de cada produto (scripts/build-catalog.mjs) e o filtro o respeita à risca.
//
// Sem marca escolhida, o resultado vem separado por marca — uma faixa para
// cada, com os primeiros modelos e "Ver todos". Com marca, a grade inteira.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import GradeToggle from './GradeToggle';
import ProductGrid from './ProductGrid';
import { useGrade } from '../lib/grade';
import { BRANDS, CATEGORIES, COLORS, KINDS, type Brand, type ProductKind } from '../config';
import { kindOf, nomeDoTipo, normalize, priceOf, useCatalog, type Product } from '../lib/catalog';

/** Quantos modelos entram na grade de cada vez. Com milhares de produtos, a
 *  grade inteira de uma vez travaria o navegador. */
const POR_VEZ = 48;
/** Posições de cada marca na visão separada por marca (duas fileiras). */
const POR_MARCA = 8;
/** Na grade compacta cabem mais, e 12 fecha linhas de 3, 4 e 6 colunas. */
const POR_MARCA_COMPACTA = 12;
/** Frases comerciais na grade inteira: a primeira na 8ª posição, depois 1 a cada 16. */
const PROMOS_GRADE = { primeira: 7, aCada: 16 };
/** Na faixa de cada marca, uma frase na 6ª posição — só em faixas alternadas. */
const PROMO_FAIXA = { primeira: 5, aCada: 1000 };

type Props = {
  titulo: string;
  subtitulo?: string;
  /** Marca travada pela rota (/marca/nike): some do filtro. */
  marcaFixa?: string;
  /** Eixo travado pela rota (/categoria/running). */
  eixoFixo?: string;
  /** Tipo de produto travado pela rota (/camisas, /bermudas). */
  produtoFixo?: ProductKind;
};

type Filtro = 'marca' | 'eixo' | 'cor' | 'produto';

export default function CatalogView({ titulo, subtitulo, marcaFixa, eixoFixo, produtoFixo }: Props) {
  const { ready, error, catalog } = useCatalog();
  const [params, setParams] = useSearchParams();

  const q = params.get('q') ?? '';
  const marca = marcaFixa ?? params.get('marca') ?? '';
  const eixo = eixoFixo ?? params.get('eixo') ?? '';
  const cor = params.get('cor') ?? '';
  const produto = produtoFixo ?? params.get('produto') ?? '';
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

  // A lista suspensa aberta (uma por vez). Fecha ao tocar fora ou com Esc.
  const [aberta, setAberta] = useState<string | null>(null);
  const painelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!aberta) return;
    const fora = (e: PointerEvent) => {
      if (!painelRef.current?.contains(e.target as Node)) setAberta(null);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberta(null);
    };
    document.addEventListener('pointerdown', fora);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', fora);
      document.removeEventListener('keydown', esc);
    };
  }, [aberta]);

  // Só faz sentido oferecer o filtro de preço quando existe preço no catálogo.
  const temPreco = useMemo(() => catalog.products.some((p) => priceOf(p) !== undefined), [catalog]);

  /** O produto passa nos filtros de lista — menos o "ignorar", para as
   *  contagens: ao lado de cada marca, quantos há com os OUTROS filtros. Roupa
   *  não tem tipo de tênis, então qualquer tipo escolhido já a deixa de fora. */
  const passa = useCallback(
    (p: Product, ignorar?: Filtro) =>
      (ignorar === 'marca' || !marca || p.brand === marca) &&
      (ignorar === 'eixo' || !eixo || p.category === eixo) &&
      (ignorar === 'cor' || !cor || (p.colors ?? []).includes(cor)) &&
      (ignorar === 'produto' || !produto || kindOf(p) === produto),
    [marca, eixo, cor, produto],
  );

  const resultados = useMemo<Product[]>(() => {
    const palavras = normalize(q).split(/s+/).filter(Boolean);
    const pisoNum = Number(min);
    const tetoNum = Number(max);
    const piso = min !== '' && Number.isFinite(pisoNum) ? pisoNum : undefined;
    const teto = max !== '' && Number.isFinite(tetoNum) ? tetoNum : undefined;

    return catalog.products.filter((p) => {
      if (!passa(p)) return false;

      if (palavras.length) {
        const nomeMarca = BRANDS.find((b) => b.slug === p.brand)?.name ?? p.brand;
        const texto = normalize(
          [p.id, p.name, nomeMarca, p.category, nomeDoTipo(p), p.colorway, ...(p.tags ?? [])].join(' '),
        );
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
  }, [catalog, q, min, max, passa]);

  // Contagens para mostrar ao lado de cada opção do filtro.
  const contar = useCallback(
    (ignorar: Filtro, chave: (p: Product) => string[] | string | undefined) => {
      const m = new Map<string, number>();
      for (const p of catalog.products) {
        if (!passa(p, ignorar)) continue;
        const k = chave(p);
        for (const v of Array.isArray(k) ? k : k ? [k] : []) m.set(v, (m.get(v) ?? 0) + 1);
      }
      return m;
    },
    [catalog, passa],
  );
  const porMarca = useMemo(() => contar('marca', (p) => p.brand), [contar]);
  const porTipo = useMemo(() => contar('eixo', (p) => p.category), [contar]);
  const porCor = useMemo(() => contar('cor', (p) => p.colors), [contar]);
  const porProduto = useMemo(() => contar('produto', (p) => kindOf(p)), [contar]);

  // Separado por marca, na ordem de BRANDS; marca sem resultado não aparece.
  const porMarcaNaGrade = useMemo(
    () =>
      BRANDS.map((b) => ({ marca: b, produtos: resultados.filter((p) => p.brand === b.slug) })).filter(
        (g) => g.produtos.length > 0,
      ),
    [resultados],
  );
  const verMarca = (slug: string) => {
    mexer('marca', slug);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Mudou o filtro, a grade volta para o começo.
  const chaveFiltro = [q, marca, eixo, cor, produto, min, max].join('|');
  const [pagina, setPagina] = useState({ chave: chaveFiltro, n: POR_VEZ });
  const mostrando = pagina.chave === chaveFiltro ? pagina.n : POR_VEZ;
  const visiveis = resultados.slice(0, mostrando);

  const filtrando = Boolean(
    q || (!marcaFixa && marca) || (!eixoFixo && eixo) || (!produtoFixo && produto) || cor || min || max,
  );
  // O tipo de tênis só aparece quando há tênis na lista (não em /camisas).
  const mostraTipoDeTenis = !eixoFixo && (!produto || produto === 'tenis');

  // Escolher numa lista suspensa aplica o filtro e fecha a lista.
  const escolher = (chave: string, v: string) => {
    mexer(chave, v);
    setAberta(null);
  };
  const opcoes = 'flex flex-wrap gap-2';

  const suspensas: { id: string; rotulo: string; valor?: string; conteudo: ReactNode }[] = [];
  if (!produtoFixo)
    suspensas.push({
      id: 'produto',
      rotulo: 'Produto',
      valor: KINDS.find((k) => k.slug === produto)?.name,
      conteudo: (
        <div className={opcoes}>
          <Chip ativo={produto === ''} onClick={() => escolher('produto', '')}>
            Todos
          </Chip>
          {KINDS.filter((k) => (porProduto.get(k.slug) ?? 0) > 0 || produto === k.slug).map((k) => (
            <Chip
              key={k.slug}
              ativo={produto === k.slug}
              onClick={() => {
                // Roupa não tem tipo de tênis: escolher camisa limpa o "Running".
                const novo = new URLSearchParams(params);
                novo.set('produto', k.slug);
                if (k.slug !== 'tenis') novo.delete('eixo');
                setParams(novo, { replace: true });
                setAberta(null);
              }}
            >
              {k.name}
              <small className="ml-1.5 opacity-60">{porProduto.get(k.slug) ?? 0}</small>
            </Chip>
          ))}
        </div>
      ),
    });
  if (!marcaFixa)
    suspensas.push({
      id: 'marca',
      rotulo: 'Marca',
      valor: BRANDS.find((b) => b.slug === marca)?.name,
      conteudo: (
        <div className={opcoes}>
          <Chip ativo={marca === ''} onClick={() => escolher('marca', '')}>
            Todas
          </Chip>
          {/* Marca sem modelo nos outros filtros (ex.: Vans em Running) não aparece. */}
          {BRANDS.filter((b) => (porMarca.get(b.slug) ?? 0) > 0 || marca === b.slug).map((b) => (
            <Chip key={b.slug} ativo={marca === b.slug} onClick={() => escolher('marca', b.slug)}>
              {b.name}
              <small className="ml-1.5 opacity-60">{porMarca.get(b.slug) ?? 0}</small>
            </Chip>
          ))}
        </div>
      ),
    });
  if (mostraTipoDeTenis)
    suspensas.push({
      id: 'eixo',
      rotulo: 'Tipo de tênis',
      valor: CATEGORIES.find((c) => c.slug === eixo)?.name,
      conteudo: (
        <div className={opcoes}>
          <Chip ativo={eixo === ''} onClick={() => escolher('eixo', '')}>
            Todos
          </Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c.slug} ativo={eixo === c.slug} onClick={() => escolher('eixo', c.slug)}>
              {c.name}
              <small className="ml-1.5 opacity-60">{porTipo.get(c.slug) ?? 0}</small>
            </Chip>
          ))}
        </div>
      ),
    });
  // Cor: sai da foto de capa de cada produto. Sem cor no catálogo, some.
  if (porCor.size > 0 || cor)
    suspensas.push({
      id: 'cor',
      rotulo: 'Cor',
      valor: COLORS.find((c) => c.slug === cor)?.name,
      conteudo: (
        <div className={opcoes}>
          <Chip ativo={cor === ''} onClick={() => escolher('cor', '')}>
            Todas
          </Chip>
          {COLORS.filter((c) => (porCor.get(c.slug) ?? 0) > 0 || cor === c.slug).map((c) => (
            <Chip key={c.slug} ativo={cor === c.slug} onClick={() => escolher('cor', cor === c.slug ? '' : c.slug)}>
              <span
                aria-hidden
                className="mr-1.5 inline-block h-3 w-3 rounded-full align-[-1px] ring-1 ring-white/30"
                style={{ backgroundColor: c.hex }}
              />
              {c.name}
              <small className="ml-1.5 opacity-60">{porCor.get(c.slug) ?? 0}</small>
            </Chip>
          ))}
        </div>
      ),
    });
  // Preço: só aparece quando houver preço no catálogo.
  if (temPreco)
    suspensas.push({
      id: 'preco',
      rotulo: 'Preço',
      valor: min || max ? [min && `de R$ ${min}`, max && `até R$ ${max}`].filter(Boolean).join(' ') : undefined,
      conteudo: (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={min}
            onChange={(e) => mexer('min', e.target.value)}
            placeholder="De R$"
            aria-label="Preço mínimo"
            className="h-10 w-32 rounded-full border border-fio bg-grafite px-4 text-sm text-white placeholder:text-nevoa focus:border-ouro focus:outline-none"
          />
          <span className="text-nevoa">—</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={max}
            onChange={(e) => mexer('max', e.target.value)}
            placeholder="Até R$"
            aria-label="Preço máximo"
            className="h-10 w-32 rounded-full border border-fio bg-grafite px-4 text-sm text-white placeholder:text-nevoa focus:border-ouro focus:outline-none"
          />
        </div>
      ),
    });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-8">
        <h1 className="ouro-texto font-display text-[clamp(2rem,5vw,3.5rem)] font-black uppercase leading-none">
          {titulo}
        </h1>
        {subtitulo ? <p className="mt-3 max-w-2xl text-nevoa">{subtitulo}</p> : null}
      </header>

      {/* ---------------- Filtros ----------------
          Busca à vista; o resto em listas suspensas, para não poluir a tela.
          Cada botão diz o que está escolhido ("Marca: Nike"); abre uma lista
          por vez, e ela fecha ao escolher, ao tocar fora ou com Esc. */}
      {/* Gruda logo abaixo do cabeçalho (--cabecalho, medido no Layout): rolando a
          lista, os filtros continuam à mão. */}
      <section
        ref={painelRef}
        aria-label="Filtros"
        style={{ top: 'var(--cabecalho, 0px)' }}
        className="sticky z-20 -mx-4 mb-8 bg-breu/95 px-4 py-3 backdrop-blur-md"
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 basis-full sm:basis-64">
            <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ouro" />
            <input
              type="search"
              value={q}
              onChange={(e) => mexer('q', e.target.value)}
              placeholder="Filtrar: modelo, cor, código…"
              aria-label="Filtrar por texto"
              className="h-10 w-full rounded-full border border-fio bg-grafite pl-9 pr-4 text-sm text-white placeholder:text-nevoa focus:border-ouro focus:outline-none"
            />
          </div>

          {suspensas.map((d) => (
            <button
              key={d.id}
              type="button"
              aria-expanded={aberta === d.id}
              aria-controls="painel-filtro"
              onClick={() => setAberta(aberta === d.id ? null : d.id)}
              className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors ${
                d.valor
                  ? 'border-ouro bg-gradient-to-br from-ouro-claro to-ouro-escuro text-black'
                  : aberta === d.id
                    ? 'border-ouro bg-grafite text-white'
                    : 'border-fio bg-grafite text-nevoa hover:border-ouro hover:text-white'
              }`}
            >
              {d.rotulo}
              {d.valor ? <span className="max-w-[9rem] truncate font-bold">: {d.valor}</span> : null}
              <ChevronDown className={`h-4 w-4 transition-transform ${aberta === d.id ? 'rotate-180' : ''}`} />
            </button>
          ))}

          {filtrando ? (
            <button
              type="button"
              onClick={() => {
                limpar();
                setAberta(null);
              }}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold uppercase tracking-wider text-nevoa transition-colors hover:text-ouro-claro"
            >
              <X className="h-3.5 w-3.5" />
              Limpar
            </button>
          ) : null}
        </div>

        {aberta ? (
          <div
            id="painel-filtro"
            role="group"
            aria-label={suspensas.find((d) => d.id === aberta)?.rotulo}
            className="absolute inset-x-0 top-full z-20 mt-2 max-h-[60vh] overflow-y-auto rounded-2xl border border-ouro/40 bg-carvao p-4 shadow-2xl shadow-black/70"
          >
            {suspensas.find((d) => d.id === aberta)?.conteudo}
          </div>
        ) : null}
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
          <div className="mb-5 flex items-center justify-between gap-4">
            <p className="text-sm text-nevoa">
              <strong className="text-white">{resultados.length}</strong>{' '}
              {resultados.length === 1 ? 'modelo' : 'modelos'}
              {marca ? null : <> em {porMarcaNaGrade.length} {porMarcaNaGrade.length === 1 ? 'marca' : 'marcas'}</>}
            </p>
            <GradeToggle />
          </div>
          {marca ? (
            <>
              <ProductGrid key={chaveFiltro} produtos={visiveis} promos={PROMOS_GRADE} />
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
          ) : (
            <div className="space-y-14">
              {porMarcaNaGrade.map(({ marca: b, produtos }, i) => (
                <FaixaDaMarca
                  key={`${b.slug}|${chaveFiltro}`}
                  marca={b}
                  produtos={produtos}
                  comFrase={i % 2 === 0}
                  onVerTodos={() => verMarca(b.slug)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Uma marca na visão separada: logo, contagem, os primeiros modelos e "Ver todos". */
function FaixaDaMarca({
  marca,
  produtos,
  comFrase,
  onVerTodos,
}: {
  marca: Brand;
  produtos: Product[];
  /** Faixas alternadas levam uma frase comercial, para não poluir. */
  comFrase: boolean;
  onVerTodos: () => void;
}) {
  const { compacta } = useGrade();
  // Na ampla, a frase ocupa uma das posições e as duas fileiras continuam
  // cheias. Na compacta ela é uma faixa à parte e não toma lugar de tênis.
  const vagas = compacta ? POR_MARCA_COMPACTA : POR_MARCA;
  const temFrase = comFrase && produtos.length >= PROMO_FAIXA.primeira;
  const cabem = temFrase && !compacta ? vagas - 1 : vagas;
  const sobra = produtos.length - cabem;
  return (
    <section aria-label={marca.name}>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-fio pb-4">
        <div className="flex items-center gap-4">
          {marca.logo ? (
            <img src={marca.logo} alt="" aria-hidden className="h-9 w-auto max-w-[110px] object-contain" />
          ) : null}
          <div>
            <h2 className="font-display text-2xl font-extrabold uppercase leading-none text-white">{marca.name}</h2>
            <p className="mt-1 text-xs text-nevoa">
              {produtos.length} {produtos.length === 1 ? 'modelo' : 'modelos'}
            </p>
          </div>
        </div>
        {sobra > 0 ? (
          <button
            type="button"
            onClick={onVerTodos}
            className="text-sm font-semibold uppercase tracking-wider text-ouro-claro transition-colors hover:text-white"
          >
            Ver todos os {produtos.length} →
          </button>
        ) : null}
      </header>
      <ProductGrid produtos={produtos.slice(0, cabem)} promos={temFrase ? PROMO_FAIXA : false} />
    </section>
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
