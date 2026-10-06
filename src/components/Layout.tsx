// Moldura do site: faixa de campanha, cabeçalho com busca, conteúdo, rodapé.
import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ShoppingBag } from 'lucide-react';
import { CATEGORIES, COPY, STORE } from '../config';
import { useCart } from '../lib/cart';
import { useCatalog } from '../lib/catalog';

const FAIXA = [COPY.chamada, COPY.atitude, COPY.entrega, COPY.subchamada];

// Desenhado à mão: a lucide tirou os ícones de marca da versão 1.
function IconeInstagram({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function Marquise() {
  // O bloco aparece duas vezes: a animação anda -50% e volta ao começo sem emenda.
  const bloco = (
    <div className="flex shrink-0 items-center gap-10 px-5">
      {FAIXA.map((t) => (
        <span key={t} className="flex items-center gap-10 whitespace-nowrap">
          {t}
          <span className="h-1 w-1 rounded-full bg-ouro" />
        </span>
      ))}
    </div>
  );
  return (
    <div className="overflow-hidden border-b border-fio bg-carvao py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-nevoa">
      <div className="marquise flex w-max">
        {bloco}
        {bloco}
      </div>
    </div>
  );
}

function Logo() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-3" aria-label={`${STORE.name} — início`}>
      <img src="/logo.webp" alt="" width={44} height={44} className="h-11 w-11 object-contain" />
      <span className="flex flex-col leading-none">
        <span className="ouro-texto font-display text-2xl font-extrabold tracking-[0.22em]">PULSE</span>
        <span className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.3em] text-nevoa">Atitude</span>
      </span>
    </Link>
  );
}

function BarraDeBusca() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  // Ao sair da busca, o campo esvazia; dentro dela, mostra o que está na URL —
  // inclusive o que for digitado no filtro da própria página.
  const termoDaUrl = location.pathname === '/busca' ? (params.get('q') ?? '') : '';
  const [q, setQ] = useState(termoDaUrl);
  const [termoAnterior, setTermoAnterior] = useState(termoDaUrl);

  // Ajuste durante a renderização: enquanto se digita, a URL não muda, então o
  // campo não é reescrito por baixo da mão de quem escreve.
  if (termoAnterior !== termoDaUrl) {
    setTermoAnterior(termoDaUrl);
    setQ(termoDaUrl);
  }

  return (
    <form
      role="search"
      className="relative order-3 w-full min-w-0 md:order-none md:w-auto md:flex-1 md:basis-64"
      onSubmit={(e) => {
        e.preventDefault();
        const termo = q.trim();
        if (termo) navigate(`/busca?q=${encodeURIComponent(termo)}`);
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-nevoa" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por modelo, marca ou cor…"
        aria-label="Buscar no catálogo"
        className="h-11 w-full rounded-full border border-fio bg-grafite pl-10 pr-4 text-sm text-white placeholder:text-nevoa focus:border-ouro focus:outline-none"
      />
    </form>
  );
}

/** O carrinho no cabeçalho, com quantos pares já foram escolhidos. */
function IconeCarrinho() {
  const { count } = useCart();
  return (
    <Link
      to="/carrinho"
      aria-label={count ? `Carrinho: ${count} ${count === 1 ? 'par' : 'pares'}` : 'Carrinho vazio'}
      className="relative order-2 ml-auto grid h-11 w-11 shrink-0 place-items-center rounded-full border border-fio bg-grafite text-white transition-colors hover:border-ouro md:order-last md:ml-0"
    >
      <ShoppingBag className="h-5 w-5" />
      {count ? (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-gradient-to-br from-ouro-claro to-ouro-escuro px-1 text-[11px] font-bold text-black">
          {count}
        </span>
      ) : null}
    </Link>
  );
}

const linkClasse = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-semibold uppercase tracking-wider transition-colors ${
    isActive ? 'text-ouro-claro' : 'text-nevoa hover:text-white'
  }`;

export default function Layout() {
  const { catalog } = useCatalog();

  return (
    <div className="flex min-h-screen flex-col bg-breu">
      <Marquise />

      {/* Enquanto os produtos forem a semente de exemplo, quem abre precisa saber. */}
      {catalog.demo ? (
        <p className="bg-ouro-escuro/25 px-4 py-2 text-center text-xs text-ouro-claro">
          Catálogo de demonstração — modelos, tamanhos e fotos de exemplo.
        </p>
      ) : null}

      <header className="sticky top-0 z-30 border-b border-fio bg-breu/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <Logo />

          <nav className="order-4 flex w-full gap-5 overflow-x-auto pb-1 md:order-none md:w-auto md:pb-0">
            <NavLink to="/catalogo" className={linkClasse}>
              Catálogo
            </NavLink>
            {CATEGORIES.map((c) => (
              <NavLink key={c.slug} to={`/categoria/${c.slug}`} className={linkClasse}>
                {c.name}
              </NavLink>
            ))}
            <NavLink to="/marcas" className={linkClasse}>
              Marcas
            </NavLink>
          </nav>

          <BarraDeBusca />
          <IconeCarrinho />
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-fio bg-carvao">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-nevoa">{COPY.subchamada}</p>
          </div>

          <div>
            <h3 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-ouro">Catálogo</h3>
            <ul className="mt-3 space-y-2 text-sm text-nevoa">
              {CATEGORIES.map((c) => (
                <li key={c.slug}>
                  <Link to={`/categoria/${c.slug}`} className="hover:text-white">
                    {c.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/marcas" className="hover:text-white">
                  Todas as marcas
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-ouro">Como funciona</h3>
            <ul className="mt-3 space-y-2 text-sm text-nevoa">
              <li>Escolha o modelo e o tamanho</li>
              <li>Peça pelo WhatsApp</li>
              <li>Prazo de {STORE.leadTime}</li>
              <li>{COPY.entrega}</li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-ouro">Contato</h3>
            <a
              href={`https://instagram.com/${STORE.instagram}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-2 text-sm text-nevoa hover:text-white"
            >
              <IconeInstagram className="h-4 w-4" />@{STORE.instagram}
            </a>
          </div>
        </div>

        <div className="border-t border-fio">
          <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-nevoa">
            © {new Date().getFullYear()} {STORE.name}. {COPY.atributos}
          </p>
        </div>
      </footer>
    </div>
  );
}
