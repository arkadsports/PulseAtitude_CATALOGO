// O menu do celular: o botão de três linhas abre uma barra lateral com abas
// (Calçados, Roupas, Marcas) e, dentro de cada uma, as sub-abas que levam às
// listas. No computador o menu do cabeçalho segue à vista e este não aparece.
// Fecha ao escolher um destino, ao tocar fora, com Esc ou no X.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, Footprints, Menu, Shirt, Tags, X } from 'lucide-react';
import { BRANDS, STORE } from '../config';
import { useCatalog } from '../lib/catalog';

type Item = { para: string; rotulo: string; extra?: ReactNode };
type Aba = { id: string; rotulo: string; icone: ReactNode; itens: Item[] };

export default function MenuLateral() {
  // Endereço com #menu já abre o menu (serve de link direto para ele).
  const [aberto, setAberto] = useState(() => typeof window !== 'undefined' && window.location.hash === '#menu');
  const [aba, setAba] = useState<string | null>('calcados');
  const { pathname, search } = useLocation();
  const { catalog } = useCatalog();

  // Mudou de página: o menu fecha. (Ajuste durante a renderização, sem efeito.)
  const [rota, setRota] = useState(pathname + search);
  if (rota !== pathname + search) {
    setRota(pathname + search);
    setAberto(false);
  }

  // Aberto: Esc fecha, e a página por trás não rola.
  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(false);
    };
    document.addEventListener('keydown', esc);
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.style.overflow = antes;
    };
  }, [aberto]);

  const abas = useMemo<Aba[]>(() => {
    const conta = new Map<string, number>();
    for (const p of catalog.products) conta.set(p.brand, (conta.get(p.brand) ?? 0) + 1);
    return [
      {
        id: 'calcados',
        rotulo: 'Calçados',
        icone: <Footprints className="h-5 w-5" />,
        itens: [
          { para: '/catalogo?produto=tenis', rotulo: 'Todos os tênis' },
          { para: '/categoria/running', rotulo: 'Tênis de Corrida' },
          { para: '/categoria/training', rotulo: 'Tênis de Treino' },
          { para: '/categoria/casual', rotulo: 'Tênis Casual' },
        ],
      },
      {
        id: 'roupas',
        rotulo: 'Roupas',
        icone: <Shirt className="h-5 w-5" />,
        itens: [
          { para: '/camisas', rotulo: 'Camisetas' },
          { para: '/bermudas', rotulo: 'Bermudas' },
        ],
      },
      {
        id: 'marcas',
        rotulo: 'Marcas',
        icone: <Tags className="h-5 w-5" />,
        itens: [
          ...BRANDS.filter((b) => (conta.get(b.slug) ?? 0) > 0).map((b) => ({
            para: `/marca/${b.slug}`,
            rotulo: b.name,
            extra: <small className="text-nevoa">{conta.get(b.slug)}</small>,
          })),
          { para: '/marcas', rotulo: 'Ver todas as marcas' },
        ],
      },
    ];
  }, [catalog.products]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label="Abrir o menu"
        aria-expanded={aberto}
        aria-controls="menu-lateral"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-fio bg-grafite text-white transition-colors hover:border-ouro md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* O menu vai direto no <body>: dentro do cabeçalho (que tem desfoque de
          fundo), o "fixed" ficaria preso a ele em vez de à tela. */}
      {createPortal(
      <>
      {/* Fundo escurecido: tocar fora fecha. */}
      <div
        aria-hidden
        onClick={() => setAberto(false)}
        className={`fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity md:hidden ${
          aberto ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <nav
        id="menu-lateral"
        aria-label="Menu"
        aria-hidden={!aberto}
        inert={!aberto}
        className={`fixed inset-y-0 left-0 z-50 flex w-[86%] max-w-sm flex-col border-r border-fio bg-carvao shadow-2xl shadow-black transition-transform duration-300 md:hidden ${
          aberto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-fio px-4 py-4">
          <span className="ouro-texto font-display text-xl font-extrabold tracking-[0.2em]">
            {STORE.name.split(' ')[0].toUpperCase()}
          </span>
          <button
            type="button"
            onClick={() => setAberto(false)}
            aria-label="Fechar o menu"
            className="grid h-10 w-10 place-items-center rounded-full text-nevoa hover:bg-grafite hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3">
          <Link to="/" className="block rounded-xl px-3 py-3 font-semibold text-white hover:bg-grafite">
            Início
          </Link>
          <Link to="/catalogo" className="block rounded-xl px-3 py-3 font-semibold text-white hover:bg-grafite">
            Catálogo completo
          </Link>

          {abas.map((a) => {
            const aberta = aba === a.id;
            return (
              <div key={a.id} className="mt-1">
                <button
                  type="button"
                  onClick={() => setAba(aberta ? null : a.id)}
                  aria-expanded={aberta}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left font-display text-lg font-extrabold uppercase tracking-wide text-white hover:bg-grafite"
                >
                  <span className="text-ouro">{a.icone}</span>
                  <span className="flex-1">{a.rotulo}</span>
                  <ChevronDown className={`h-5 w-5 text-nevoa transition-transform ${aberta ? 'rotate-180' : ''}`} />
                </button>
                {aberta ? (
                  <ul className="mb-2 ml-11 border-l border-fio">
                    {a.itens.map((i) => (
                      <li key={i.para}>
                        <Link
                          to={i.para}
                          className="flex items-center justify-between rounded-r-xl py-2.5 pl-4 pr-3 text-sm text-nevoa hover:bg-grafite hover:text-ouro-claro"
                        >
                          {i.rotulo}
                          {i.extra}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="border-t border-fio p-4">
          <Link to="/carrinho" className="btn-ouro flex h-12 items-center justify-center rounded-xl text-sm">
            Ver carrinho
          </Link>
        </div>
      </nav>
      </>,
      document.body,
      )}
    </>
  );
}
