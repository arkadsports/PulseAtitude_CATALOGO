// Configurações da loja. Tudo que muda com frequência fica aqui — texto de
// vitrine, marcas, tamanhos e preço. O resto do site lê deste arquivo.

export const STORE = {
  name: 'Pulse Atitude',
  tagline: 'Running · Training · Casual',
  /** WhatsApp com DDI + DDD, só dígitos. Ex.: '5584999999999'.
   *  Vazio = o botão abre o WhatsApp sem destinatário. PREENCHER. */
  whatsapp: '5584981045695',
  instagram: 'pulseatitude',
  leadTime: '20 a 30 dias',
};

// ---------------------------------------------------------------------------
// Textos da vitrine — as frases da campanha, num lugar só.
// ---------------------------------------------------------------------------
export const COPY = {
  manchete: 'POR QUE PAGAR MAIS NO BRASIL?',
  submanchete: 'Compramos de fora para oferecer uma condição diferente.',
  chamada: 'SE VOCÊ PODE PAGAR MENOS, POR QUE PAGAR MAIS?',
  subchamada: 'A Pulse busca lá fora para entregar uma condição melhor aqui.',
  eixos: 'RUNNING — TRAINING — CASUAL',
  atitude: 'ATITUDE QUE TE MOVE.',
  atributos: 'Performance, conforto, estilo.',
  entrega: 'Online | Envio para todo o Brasil',
};

// ---------------------------------------------------------------------------
// Preço
// ---------------------------------------------------------------------------
// Ainda não há preço definido: o campo existe no catálogo e na tela, e aparece
// como "Sob consulta" enquanto estiver vazio. Para ligar um preço, basta
// preencher aqui por marca (ou gravar "price" direto no produto do catálogo.json,
// que tem prioridade sobre esta tabela).
export const PRICES: Record<string, number> = {
  // nike: 0,
  // adidas: 0,
};

// ---------------------------------------------------------------------------
// Eixos do catálogo — os três usos que a marca vende.
// ---------------------------------------------------------------------------
export type CategorySlug = 'running' | 'training' | 'casual';

export const CATEGORIES: { slug: CategorySlug; name: string; blurb: string }[] = [
  { slug: 'running', name: 'Running', blurb: 'Para quem corre: leveza, retorno e amortecimento.' },
  { slug: 'training', name: 'Training', blurb: 'Para treinar: base firme, apoio estável, aderência.' },
  { slug: 'casual', name: 'Casual', blurb: 'Para o dia: o par que combina com tudo.' },
];

// ---------------------------------------------------------------------------
// Marcas — cada uma puxa um eixo. É desta lista que saem os filtros e o
// carrossel da abertura: a carta da marca leva para /marca/<slug>.
// ---------------------------------------------------------------------------
export type Brand = {
  slug: string;
  name: string;
  /** O eixo que a marca representa na vitrine. */
  category: CategorySlug;
  /** Frase curta da carta no carrossel. */
  tagline: string;
  /** Linha de apoio da carta. */
  blurb: string;
  /** Foto da carta: alguém usando o tênis da marca.
   *  Troque por foto de verdade em public/hero/<slug>.jpg e atualize aqui. */
  hero: string;
};

export const BRANDS: Brand[] = [
  {
    slug: 'nike',
    name: 'Nike',
    category: 'running',
    tagline: 'A PASSADA',
    blurb: 'que não pede licença',
    hero: '/hero/nike.svg',
  },
  {
    slug: 'on',
    name: 'On',
    category: 'running',
    tagline: 'LEVEZA SUÍÇA',
    blurb: 'feita para o asfalto',
    hero: '/hero/on.svg',
  },
  {
    slug: 'adidas',
    name: 'adidas',
    category: 'training',
    tagline: 'DO AQUECIMENTO',
    blurb: 'ao último movimento',
    hero: '/hero/adidas.svg',
  },
  {
    slug: 'asics',
    name: 'ASICS',
    category: 'running',
    tagline: 'AMORTECIMENTO',
    blurb: 'de quem corre de verdade',
    hero: '/hero/asics.svg',
  },
  {
    slug: 'new-balance',
    name: 'New Balance',
    category: 'casual',
    tagline: 'O CLÁSSICO',
    blurb: 'que combina com tudo',
    hero: '/hero/new-balance.svg',
  },
  {
    slug: 'puma',
    name: 'Puma',
    category: 'training',
    tagline: 'EXPLOSÃO',
    blurb: 'em cada apoio',
    hero: '/hero/puma.svg',
  },
  {
    slug: 'mizuno',
    name: 'Mizuno',
    category: 'running',
    tagline: 'ESTABILIDADE',
    blurb: 'quilômetro após quilômetro',
    hero: '/hero/mizuno.svg',
  },
  {
    slug: 'vans',
    name: 'Vans',
    category: 'casual',
    tagline: 'ATITUDE',
    blurb: 'desde sempre',
    hero: '/hero/vans.svg',
  },
];

export const brandBySlug = new Map(BRANDS.map((b) => [b.slug, b]));

// ---------------------------------------------------------------------------
// Grade de tamanhos (BR). O produto declara quais tem; a página só oferece
// esses, e é o tamanho escolhido que vai junto no botão de pedido.
// ---------------------------------------------------------------------------
export const SIZES = ['33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'];

// ---------------------------------------------------------------------------
// Onde ficam as fotos. Vazio = pasta public/img (desenvolvimento).
// Em produção, a URL pública do bucket no Cloudflare R2 — que é endereço
// público mesmo, não é segredo. Fica em VITE_IMAGE_BASE na Vercel.
// ---------------------------------------------------------------------------
const R2 = 'https://pub-dbd133e902ba4341b7a171c127db6fdb.r2.dev';
export const IMAGE_BASE =
  (import.meta.env.VITE_IMAGE_BASE as string | undefined)?.replace(/\/$/, '') || R2 || '/img';
