// /carrinho — os pares escolhidos e o envio do pedido pelo WhatsApp.
// /pedido?i=… — o pedido como chega à loja: quem toca no link da mensagem vê
// a foto, o tamanho e a quantidade de cada item (ver lib/pedido.ts).
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ImageUp, MessageCircle, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { PARCELAS, STORE } from '../config';
import { decodificarItens, useCart, type CartItem } from '../lib/cart';
import { cover, nomeCompleto, priceLabel, sortSizes, useCatalog, type Product } from '../lib/catalog';
import {
  fotosDoPedido,
  podeEnviarFotos,
  textoDoPedido,
  whatsappDoPedido,
  type LinhaDoPedido,
} from '../lib/pedido';

const SEM_FOTO = '/sem-foto.svg';
const cair = (e: React.SyntheticEvent<HTMLImageElement>) => {
  if (!e.currentTarget.src.endsWith(SEM_FOTO)) e.currentTarget.src = SEM_FOTO;
};

/** Itens do carrinho com o produto ao lado; o que sumiu do catálogo fica de fora. */
function useLinhas(itens: CartItem[]) {
  const { productById } = useCatalog();
  return useMemo(
    () =>
      itens.flatMap((i) => {
        const produto = productById.get(i.id);
        return produto ? [{ ...i, produto }] : [];
      }),
    [itens, productById],
  );
}

export function CartPage() {
  const { ready } = useCatalog();
  const { items, setQty, setSize, remove, clear } = useCart();
  const linhas = useLinhas(items);
  const pares = linhas.reduce((s, l) => s + l.qty, 0);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [fotosNoAparelho] = useState(podeEnviarFotos);

  const enviarComFotos = async () => {
    setErro('');
    setEnviando(true);
    try {
      const files = await fotosDoPedido(linhas);
      await navigator.share({ files, text: textoDoPedido(linhas) });
    } catch (e) {
      // Fechar o compartilhamento sem escolher ninguém não é erro.
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        setErro('Não deu para anexar as fotos neste aparelho. Use "Enviar pedido no WhatsApp".');
      }
    } finally {
      setEnviando(false);
    }
  };

  if (!ready) return <p className="py-24 text-center text-nevoa">Carregando…</p>;

  if (!linhas.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-ouro" aria-hidden />
        <h1 className="mt-4 font-display text-3xl font-extrabold uppercase text-white">Seu carrinho está vazio</h1>
        <p className="mt-2 text-nevoa">Escolha o tênis e o tamanho, e toque em "Adicionar ao carrinho".</p>
        <Link to="/catalogo" className="btn-ouro mt-8 inline-block rounded-full px-8 py-3 text-sm">
          Ver o catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="ouro-texto font-display text-[clamp(2rem,5vw,3.25rem)] font-black uppercase leading-none">
        Carrinho
      </h1>
      <p className="mt-2 text-nevoa">
        {pares} {pares === 1 ? 'par' : 'pares'} · o pedido é concluído pelo WhatsApp da {STORE.name}.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <ul className="divide-y divide-fio rounded-2xl border border-fio bg-carvao">
          {linhas.map((l) => (
            <ItemDoCarrinho
              key={`${l.id}|${l.size}`}
              linha={l}
              onQty={(q) => setQty(l.id, l.size, q)}
              onSize={(t) => setSize(l.id, l.size, t)}
              onRemove={() => remove(l.id, l.size)}
            />
          ))}
        </ul>

        {/* Resumo e envio */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-ouro/40 bg-carvao p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ouro">Resumo</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-nevoa">Itens</dt>
                <dd className="font-semibold text-white">{linhas.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-nevoa">Pares</dt>
                <dd className="font-semibold text-white">{pares}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-nevoa">Pagamento</dt>
                <dd className="font-semibold text-ouro-claro">
                  até {PARCELAS.vezes}x {PARCELAS.texto.replace(' no cartão', '')}
                </dd>
              </div>
            </dl>

            <a
              href={whatsappDoPedido(linhas)}
              target="_blank"
              rel="noreferrer"
              className="btn-ouro mt-5 flex h-14 items-center justify-center gap-2 rounded-xl text-base"
            >
              <MessageCircle className="h-5 w-5" aria-hidden />
              Enviar pedido no WhatsApp
            </a>
            <p className="mt-2 text-center text-xs text-nevoa">
              A mensagem leva o link do pedido, e o WhatsApp mostra a foto de cada tênis.
            </p>

            {fotosNoAparelho ? (
              <>
                <button
                  type="button"
                  onClick={enviarComFotos}
                  disabled={enviando}
                  className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-ouro text-sm font-bold uppercase tracking-wider text-ouro-claro transition-colors hover:bg-ouro hover:text-black disabled:opacity-60"
                >
                  <ImageUp className="h-4 w-4" aria-hidden />
                  {enviando ? 'Preparando as fotos…' : 'Enviar com as fotos'}
                </button>
                <p className="mt-2 text-center text-xs text-nevoa">
                  Manda uma foto por item. Escolha o WhatsApp e o contato da {STORE.name}.
                </p>
              </>
            ) : null}
            {erro ? (
              <p role="alert" className="mt-3 text-center text-xs font-semibold text-ouro-claro">
                {erro}
              </p>
            ) : null}
          </div>

          <div className="mt-4 flex justify-between text-sm">
            <Link to="/catalogo" className="text-nevoa hover:text-white">
              ← Continuar comprando
            </Link>
            <button type="button" onClick={clear} className="text-nevoa hover:text-white">
              Esvaziar
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ItemDoCarrinho({
  linha,
  onQty,
  onSize,
  onRemove,
}: {
  linha: LinhaDoPedido;
  onQty: (q: number) => void;
  onSize: (t: string) => void;
  onRemove: () => void;
}) {
  const p = linha.produto;
  const tamanhos = sortSizes(p.sizes.includes(linha.size) ? p.sizes : [...p.sizes, linha.size]);
  return (
    <li className="flex gap-4 p-4">
      <Link to={`/produto/${p.id}`} className="shrink-0">
        <img
          src={cover(p)}
          alt=""
          onError={cair}
          className="h-24 w-24 rounded-xl bg-grafite object-cover sm:h-28 sm:w-28"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <Link to={`/produto/${p.id}`} className="line-clamp-2 font-semibold text-white hover:text-ouro-claro">
          {nomeCompleto(p)}
        </Link>
        <p className="text-xs text-nevoa">
          {[p.colorway, `Cód. ${p.id}`].filter(Boolean).join(' · ')}
        </p>
        <p className="mt-1 text-sm font-bold text-ouro-claro">{priceLabel(p)}</p>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          {tamanhos.length === 0 || (tamanhos.length === 1 && !tamanhos[0]) ? (
            <span className="text-xs text-nevoa">Tamanho sob consulta</span>
          ) : (
          <label className="flex items-center gap-2 text-xs text-nevoa">
            Tam.
            <select
              value={linha.size}
              onChange={(e) => onSize(e.target.value)}
              className="h-9 rounded-lg border border-fio bg-grafite px-2 text-sm font-semibold text-white focus:border-ouro focus:outline-none"
            >
              {tamanhos.map((t) => (
                <option key={t || 'escolha'} value={t}>
                  {t || 'Escolha'}
                </option>
              ))}
            </select>
          </label>
          )}

          <div className="flex items-center rounded-lg border border-fio bg-grafite" role="group" aria-label="Quantidade">
            <button
              type="button"
              aria-label="Menos um"
              onClick={() => onQty(linha.qty - 1)}
              disabled={linha.qty <= 1}
              className="grid h-9 w-9 place-items-center text-white disabled:opacity-30"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center text-sm font-bold text-white" aria-live="polite">
              {linha.qty}
            </span>
            <button
              type="button"
              aria-label="Mais um"
              onClick={() => onQty(linha.qty + 1)}
              disabled={linha.qty >= 10}
              className="grid h-9 w-9 place-items-center text-white disabled:opacity-30"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={onRemove}
            aria-label={`Tirar ${nomeCompleto(p)} do carrinho`}
            className="ml-auto grid h-9 w-9 place-items-center rounded-lg text-nevoa hover:bg-grafite hover:text-white"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </li>
  );
}

/** O pedido aberto pelo link da mensagem: fotos grandes, tamanho e quantidade. */
export function OrderPage() {
  const [params] = useSearchParams();
  const { ready } = useCatalog();
  const { add } = useCart();
  const itens = useMemo(() => decodificarItens(params.get('i') ?? ''), [params]);
  const linhas = useLinhas(itens);
  const pares = linhas.reduce((s, l) => s + l.qty, 0);
  const [copiado, setCopiado] = useState(false);

  if (!ready) return <p className="py-24 text-center text-nevoa">Carregando…</p>;
  if (!linhas.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <p className="text-nevoa">Pedido vazio ou com produtos que saíram do catálogo.</p>
        <Link to="/catalogo" className="mt-4 inline-block text-ouro-claro">
          Ver o catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-ouro">{STORE.name}</p>
      <h1 className="ouro-texto mt-1 font-display text-[clamp(2rem,5vw,3.25rem)] font-black uppercase leading-none">
        Pedido
      </h1>
      <p className="mt-2 text-nevoa">
        {linhas.length} {linhas.length === 1 ? 'item' : 'itens'} · {pares} {pares === 1 ? 'par' : 'pares'}
      </p>

      <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
        {linhas.map((l, i) => (
          <PedidoItem key={`${l.id}|${l.size}`} linha={l} numero={i + 1} />
        ))}
      </ul>

      <button
        type="button"
        onClick={() => {
          for (const l of linhas) add(l.id, l.size, l.qty);
          setCopiado(true);
        }}
        className="mt-10 rounded-full border border-ouro px-8 py-3 text-sm font-bold uppercase tracking-wider text-ouro-claro transition-colors hover:bg-ouro hover:text-black"
      >
        {copiado ? 'No seu carrinho ✓' : 'Colocar estes itens no meu carrinho'}
      </button>
      {copiado ? (
        <Link to="/carrinho" className="ml-4 text-sm text-nevoa hover:text-white">
          Ver carrinho →
        </Link>
      ) : null}
    </div>
  );
}

function PedidoItem({ linha, numero }: { linha: CartItem & { produto: Product }; numero: number }) {
  const p = linha.produto;
  return (
    <li className="overflow-hidden rounded-2xl border border-fio bg-carvao">
      <Link to={`/produto/${p.id}`} className="relative block">
        <img src={cover(p, 'full')} alt={nomeCompleto(p)} onError={cair} className="aspect-square w-full bg-grafite object-cover" />
        <span className="absolute left-2 top-2 grid h-7 min-w-7 place-items-center rounded-full bg-black/75 px-2 text-xs font-bold text-ouro-claro">
          {numero}
        </span>
      </Link>
      <div className="p-3">
        <p className="line-clamp-2 text-sm font-semibold text-white">{nomeCompleto(p)}</p>
        <p className="mt-1 text-xs text-nevoa">{[p.colorway, `Cód. ${p.id}`].filter(Boolean).join(' · ')}</p>
        <p className="mt-2 text-sm font-bold text-ouro-claro">
          Tam. {linha.size || '—'} · Qtd {linha.qty}
        </p>
      </div>
    </li>
  );
}
