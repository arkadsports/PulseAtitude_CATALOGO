// Card de frase comercial, intercalado entre os tênis nas grades.
// Tem o mesmo tamanho da carta de produto, para parecer parte do catálogo, e
// não leva a lugar nenhum: complementa os produtos, não os substitui.
//
// As frases e os tipos vivem em PROMOS (config.ts). "proximaPromo" as entrega
// alternando os tipos — preço, pagamento, economia, estilo — e começa num
// ponto sorteado a cada visita, para o cliente não ver sempre a mesma.
import { BadgePercent, CreditCard, Sparkles, Wallet } from 'lucide-react';
import { PARCELAS, PROMOS, STORE, type PromoTipo } from '../config';

export type Promo = { tipo: PromoTipo; texto: string };

// Pagamento aparece duas vezes no ciclo: é a condição que mais pesa na compra.
const CICLO: PromoTipo[] = ['preco', 'pagamento', 'economia', 'estilo', 'pagamento'];

const embaralhar = <T,>(lista: T[]) => {
  const l = [...lista];
  for (let i = l.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [l[i], l[j]] = [l[j], l[i]];
  }
  return l;
};

// Uma fila por tipo, embaralhada; o ciclo começa num ponto sorteado.
const filas = new Map<PromoTipo, Promo[]>();
const posicao = new Map<PromoTipo, number>();
let passo = Math.floor(Math.random() * CICLO.length);

export function proximaPromo(): Promo {
  const tipo = CICLO[passo++ % CICLO.length];
  if (!filas.has(tipo)) filas.set(tipo, embaralhar(PROMOS.filter((p) => p.tipo === tipo)));
  const fila = filas.get(tipo)!;
  const i = posicao.get(tipo) ?? 0;
  posicao.set(tipo, i + 1);
  return fila[i % fila.length];
}

const ROTULO: Record<PromoTipo, { texto: string; Icone: typeof Wallet }> = {
  preco: { texto: 'Preço Pulse', Icone: BadgePercent },
  economia: { texto: 'Economia', Icone: Wallet },
  estilo: { texto: 'Estilo', Icone: Sparkles },
  pagamento: { texto: 'Pagamento facilitado', Icone: CreditCard },
};

export default function PromoCard({ promo }: { promo: Promo }) {
  const { texto: rotulo, Icone } = ROTULO[promo.tipo];
  const pagamento = promo.tipo === 'pagamento';
  // "10x" já está no destaque: a frase de pagamento que repete o número fica menor.
  const longa = promo.texto.length > 48;

  return (
    <aside
      aria-label={`${rotulo}: ${promo.texto}`}
      className="relative flex aspect-[9/12] w-full max-w-[340px] flex-col overflow-hidden rounded-3xl border border-ouro/40 bg-carvao p-6 shadow-lg shadow-black/40"
    >
      {/* Brilho dourado, o mesmo halo da abertura */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(90% 60% at 100% 0%, rgba(215,151,42,.28) 0%, rgba(5,5,5,0) 65%), radial-gradient(70% 50% at 0% 100%, rgba(248,197,73,.12) 0%, rgba(5,5,5,0) 70%)',
        }}
      />

      <p className="relative flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-ouro">
        <Icone className="h-4 w-4" aria-hidden />
        {rotulo}
      </p>

      {pagamento ? (
        <div className="relative mt-6">
          <p className="ouro-texto font-display text-7xl font-black leading-none">{PARCELAS.vezes}x</p>
          <p className="mt-1 text-sm font-semibold uppercase tracking-[0.15em] text-white">{PARCELAS.texto}</p>
        </div>
      ) : null}

      <p
        className={`relative mt-auto font-display font-black uppercase leading-[1.05] text-white [text-wrap:balance] ${
          longa ? 'text-2xl' : 'text-3xl'
        }`}
      >
        {promo.texto}
      </p>

      <div className="relative mt-5 h-px w-16 ouro-fio" />
      <p className="relative mt-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-nevoa">
        {STORE.name}
      </p>
    </aside>
  );
}
