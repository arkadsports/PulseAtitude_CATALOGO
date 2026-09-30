// Página do produto: galeria à esquerda, ficha e pedido à direita.
// O tamanho escolhido aqui é o que viaja no botão do WhatsApp — é isso que
// transforma a visita em pedido sem ninguém ter de digitar o número do pé.
// "Concluir pedido" leva nome, cor, tamanho, código e o link do produto, cuja
// pré-visualização mostra a foto do tênis na conversa (veja whatsappLink).
import { useEffect, useMemo, useRef, useState, type MouseEvent, type SyntheticEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, MessageCircle, X } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { CATEGORIES, STORE, brandBySlug } from '../config';
import { cover, img, nomeCompleto, priceLabel, sortSizes, useCatalog, whatsappLink } from '../lib/catalog';

const SEM_FOTO = '/sem-foto.svg';

export default function ProductPage() {
  const { id = '' } = useParams();
  const { ready, productById, productsByBrand } = useCatalog();
  const produto = productById.get(id);

  const [foto, setFoto] = useState(produto?.cover ?? 0);
  const [tamanho, setTamanho] = useState<string>();
  const [zoom, setZoom] = useState(false);
  // Tentou concluir sem tamanho: o seletor pisca e pede o número.
  const [pedeTamanho, setPedeTamanho] = useState(false);
  const seletor = useRef<HTMLFieldSetElement>(null);
  const [idAnterior, setIdAnterior] = useState(produto?.id);

  // Trocar de produto sem sair da rota — ou o catálogo chegar depois da tela —
  // reinicia galeria, tamanho e zoom. Ajuste durante a renderização, não em
  // efeito: não há sistema externo para sincronizar.
  if (idAnterior !== produto?.id) {
    setIdAnterior(produto?.id);
    setFoto(produto?.cover ?? 0);
    setTamanho(undefined);
    setZoom(false);
    setPedeTamanho(false);
  }

  const tamanhos = useMemo(() => (produto ? sortSizes(produto.sizes) : []), [produto]);

  const relacionados = useMemo(() => {
    if (!produto) return [];
    return (productsByBrand.get(produto.brand) ?? []).filter((p) => p.id !== produto.id).slice(0, 4);
  }, [produto, productsByBrand]);

  // Setas do teclado andam na galeria; Esc fecha o zoom.
  useEffect(() => {
    if (!produto) return;
    const total = Math.max(produto.photos, 1);
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoom(false);
      if (e.key === 'ArrowRight') setFoto((i) => (i + 1) % total);
      if (e.key === 'ArrowLeft') setFoto((i) => (i - 1 + total) % total);
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [produto]);

  if (!ready) return <p className="py-24 text-center text-nevoa">Carregando…</p>;

  if (!produto) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center">
        <p className="text-nevoa">Produto não encontrado.</p>
        <Link to="/catalogo" className="mt-4 inline-block text-ouro-claro">
          Voltar ao catálogo
        </Link>
      </div>
    );
  }

  const marca = brandBySlug.get(produto.brand);
  const eixo = CATEGORIES.find((c) => c.slug === produto.category);
  const total = Math.max(produto.photos, 1);
  // Concluir sem escolher o tamanho, quando o par tem tamanhos, não abre o
  // WhatsApp: leva o cliente ao seletor. Pedido pela metade atrasa todo mundo.
  const concluir = (e: MouseEvent<HTMLAnchorElement>) => {
    if (tamanhos.length > 0 && !tamanho) {
      e.preventDefault();
      setPedeTamanho(true);
      seletor.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };
  const cair = (e: SyntheticEvent<HTMLImageElement>) => {
    const alvo = e.currentTarget;
    if (!alvo.src.endsWith(SEM_FOTO)) alvo.src = SEM_FOTO;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-nevoa">
        <Link to="/catalogo" className="inline-flex items-center gap-1 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Catálogo
        </Link>
        {marca ? (
          <>
            <span aria-hidden>/</span>
            <Link to={`/marca/${marca.slug}`} className="hover:text-white">
              {marca.name}
            </Link>
          </>
        ) : null}
      </nav>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* ---------- Galeria ---------- */}
        <div>
          <button
            type="button"
            onClick={() => setZoom(true)}
            className="relative block w-full cursor-zoom-in overflow-hidden rounded-2xl border border-fio bg-grafite"
            aria-label="Ampliar a foto"
          >
            <img
              src={img(produto.id, foto, 'full')}
              alt={produto.name}
              onError={cair}
              className="aspect-square w-full object-contain"
            />
            {total > 1 ? (
              <span className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1 text-xs text-white backdrop-blur-sm">
                {foto + 1} / {total}
              </span>
            ) : null}
          </button>

          {total > 1 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
              {Array.from({ length: total }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setFoto(i)}
                  aria-current={i === foto}
                  aria-label={`Foto ${i + 1}`}
                  className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-grafite transition-colors ${
                    i === foto ? 'border-ouro' : 'border-transparent hover:border-fio'
                  }`}
                >
                  <img
                    src={img(produto.id, i, 'thumb')}
                    alt=""
                    loading="lazy"
                    onError={cair}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* ---------- Ficha e pedido ---------- */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          {marca ? (
            <Link
              to={`/marca/${marca.slug}`}
              className="text-sm font-bold uppercase tracking-[0.25em] text-ouro hover:text-ouro-claro"
            >
              {marca.name}
            </Link>
          ) : null}

          <h1 className="mt-2 font-display text-[clamp(2rem,4.5vw,3.25rem)] font-black uppercase leading-none text-white">
            {produto.name}
          </h1>

          {produto.colorway ? <p className="mt-2 text-lg text-nevoa">{produto.colorway}</p> : null}

          <p className="mt-6 font-display text-4xl font-extrabold text-ouro-claro">{priceLabel(produto)}</p>

          {/* Tamanhos — só os que existem para este par. */}
          <fieldset
            ref={seletor}
            className={`mt-8 rounded-2xl transition-shadow ${pedeTamanho && !tamanho ? 'ring-2 ring-ouro ring-offset-8 ring-offset-black' : ''}`}
          >
            <legend className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-nevoa">
              Tamanho (BR)
            </legend>
            {tamanhos.length === 0 ? (
              <p className="text-sm text-nevoa">Tamanhos sob consulta.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tamanhos.map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={tamanho === t}
                    onClick={() => setTamanho(tamanho === t ? undefined : t)}
                    className={`h-12 min-w-14 rounded-xl border text-base font-bold transition-colors ${
                      tamanho === t
                        ? 'border-ouro bg-gradient-to-br from-ouro-claro to-ouro-escuro text-black'
                        : 'border-fio bg-grafite text-white hover:border-ouro'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </fieldset>

          {/* Resumo do pedido: o que vai na mensagem, com a foto que aparece na conversa. */}
          <div className="mt-7 flex items-center gap-4 rounded-2xl border border-fio bg-carvao p-3">
            <img
              src={cover(produto)}
              alt=""
              onError={cair}
              className="h-20 w-20 shrink-0 rounded-xl bg-grafite object-cover"
            />
            <div className="min-w-0 text-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ouro">Seu pedido</p>
              <p className="truncate font-semibold text-white">{nomeCompleto(produto)}</p>
              <p className="text-nevoa">
                {[produto.colorway, tamanho ? `Tamanho ${tamanho}` : tamanhos.length ? 'Tamanho: escolha acima' : null]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          </div>

          <a
            href={whatsappLink(produto, tamanho)}
            onClick={concluir}
            target="_blank"
            rel="noreferrer"
            className="btn-ouro mt-4 flex h-14 items-center justify-center gap-2 rounded-xl text-base"
          >
            <MessageCircle className="h-5 w-5" aria-hidden />
            {tamanho ? `Concluir pedido · tamanho ${tamanho}` : 'Concluir pedido no WhatsApp'}
          </a>

          <p
            role={pedeTamanho && !tamanho ? 'alert' : undefined}
            className={`mt-2 text-center text-xs ${pedeTamanho && !tamanho ? 'font-semibold text-ouro-claro' : 'text-nevoa'}`}
          >
            {pedeTamanho && !tamanho
              ? 'Escolha o tamanho para concluir o pedido.'
              : 'Abre o WhatsApp da Pulse com o pedido escrito e a foto do tênis.'}
          </p>

          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-fio pt-6 text-sm">
            <div>
              <dt className="text-nevoa">Código</dt>
              <dd className="font-semibold text-white">{produto.id}</dd>
            </div>
            <div>
              <dt className="text-nevoa">Tipo</dt>
              <dd className="font-semibold text-white">{eixo?.name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-nevoa">Prazo</dt>
              <dd className="font-semibold text-white">{STORE.leadTime}</dd>
            </div>
            <div>
              <dt className="text-nevoa">Envio</dt>
              <dd className="font-semibold text-white">Todo o Brasil</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* ---------- Da mesma marca ---------- */}
      {relacionados.length > 0 ? (
        <section className="mt-20">
          <h2 className="mb-6 font-display text-2xl font-extrabold uppercase text-white">
            Mais de {marca?.name ?? 'a marca'}
          </h2>
          <div className="grid justify-items-center gap-6 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
            {relacionados.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ) : null}

      {/* ---------- Tela cheia ---------- */}
      {zoom ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Fotos de ${produto.name}`}
          onClick={() => setZoom(false)}
        >
          <button
            type="button"
            onClick={() => setZoom(false)}
            aria-label="Fechar"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white"
          >
            <X className="h-5 w-5" />
          </button>

          {total > 1 ? (
            <>
              <button
                type="button"
                aria-label="Foto anterior"
                onClick={(e) => {
                  e.stopPropagation();
                  setFoto((i) => (i - 1 + total) % total);
                }}
                className="absolute left-3 flex h-14 w-11 items-center justify-center rounded-xl bg-white/10 text-white"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                aria-label="Próxima foto"
                onClick={(e) => {
                  e.stopPropagation();
                  setFoto((i) => (i + 1) % total);
                }}
                className="absolute right-3 flex h-14 w-11 items-center justify-center rounded-xl bg-white/10 text-white"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          ) : null}

          <img
            src={img(produto.id, foto, 'full')}
            alt={produto.name}
            onError={cair}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] max-w-full object-contain"
          />
          <span className="absolute bottom-5 text-sm text-nevoa">
            {foto + 1} / {total}
          </span>
        </div>
      ) : null}
    </div>
  );
}
