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
// Frases comerciais — os cards que aparecem intercalados entre os tênis.
// Cada uma tem um "tipo": o site alterna os tipos para o cliente não ver
// sempre a mesma mensagem (components/PromoCard.tsx). Para acrescentar ou
// trocar uma frase, mexa só aqui.
// ---------------------------------------------------------------------------
export type PromoTipo = 'preco' | 'economia' | 'estilo' | 'pagamento';

export const PROMOS: { tipo: PromoTipo; texto: string }[] = [
  { tipo: 'preco', texto: 'Por que pagar mais caro no Brasil?' },
  { tipo: 'preco', texto: 'Você sabia que na Pulse os tênis podem sair pelo menos 30% mais baratos?' },
  { tipo: 'preco', texto: 'Preço justo para quem sabe o que está comprando.' },
  { tipo: 'economia', texto: 'Mais tênis, menos dinheiro gasto.' },
  { tipo: 'economia', texto: 'Economize sem abrir mão do seu estilo.' },
  { tipo: 'economia', texto: 'Seu próximo tênis pode caber ainda melhor no seu bolso.' },
  { tipo: 'estilo', texto: 'Seu tênis favorito por um preço que faz sentido.' },
  { tipo: 'estilo', texto: 'Aqui, você paga menos pelo mesmo estilo.' },
  { tipo: 'pagamento', texto: 'Até 10x sem juros no cartão.' },
  { tipo: 'pagamento', texto: 'Parcele em até 10x sem juros.' },
  { tipo: 'pagamento', texto: 'Pagamento facilitado para você comprar sem pesar no bolso.' },
  { tipo: 'pagamento', texto: 'Escolha seu tênis. Divida o pagamento. Aproveite.' },
  { tipo: 'pagamento', texto: 'Encontrou o seu? Agora ficou fácil pagar.' },
];

/** A condição de pagamento em destaque nos cards de pagamento. */
export const PARCELAS = { vezes: 10, texto: 'sem juros no cartão' };

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
// ---------------------------------------------------------------------------
// Tipo de produto — tênis, camisas e bermudas. É o filtro "Produto".
// Running/Training/Casual (logo abaixo) valem só para tênis.
// ---------------------------------------------------------------------------
export type ProductKind = 'tenis' | 'camisa' | 'bermuda';

export const KINDS: { slug: ProductKind; name: string; singular: string }[] = [
  { slug: 'tenis', name: 'Tênis', singular: 'Tênis' },
  { slug: 'camisa', name: 'Camisas', singular: 'Camisa' },
  { slug: 'bermuda', name: 'Bermudas', singular: 'Bermuda' },
];

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
  /** Frase curta da carta no carrossel. */
  tagline: string;
  /** Linha de apoio da carta. */
  blurb: string;
  /** Foto da carta: alguém usando o tênis da marca ou o modelo mais conhecido.
   *  Retrato 2:3 (660×990), em public/hero/<slug>.webp. Sem ela, a galeria
   *  usa a capa do produto mais novo da marca. */
  hero?: string;
  /** Crédito da foto, quando a licença pede (CC BY-SA). CC0 não pede. */
  heroCredito?: { autor: string; licenca: string; url: string };
  /** Logo em branco, fundo transparente, para as cartas do carrossel. Sem
   *  logo, aparece o nome escrito. */
  logo?: string;
};

export const BRANDS: Brand[] = [
  {
    slug: 'nike',
    name: 'Nike',
    tagline: 'A PASSADA',
    blurb: 'que não pede licença',
    hero: '/hero/nike.webp',
    logo: '/marcas/nike.png',
  },
  {
    slug: 'on',
    name: 'On',
    tagline: 'LEVEZA SUÍÇA',
    blurb: 'feita para o asfalto',
    hero: '/hero/on.webp',
    heroCredito: { autor: 'Matti Blume', licenca: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:OutDoor_2018,_Friedrichshafen_(1X7A0305).jpg' },
    logo: '/marcas/on.png',
  },
  {
    slug: 'adidas',
    name: 'Adidas',
    tagline: 'DO AQUECIMENTO',
    blurb: 'ao último movimento',
    hero: '/hero/adidas.webp',
    heroCredito: { autor: 'Ksharks2', licenca: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Adidas_Samba_original_sneaker_March-_2024.jpg' },
    logo: '/marcas/adidas.png',
  },
  {
    slug: 'asics',
    name: 'ASICS',
    tagline: 'AMORTECIMENTO',
    blurb: 'de quem corre de verdade',
    hero: '/hero/asics.webp',
    heroCredito: { autor: 'Petar Milošević', licenca: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Human_running_gait_-_terminal_swing_to_heel_strike_(runner_with_Asics_Metaspeed_Edge_Paris_-_2024_Ljubljana_Marathon).jpg' },
    logo: '/marcas/asics.png',
  },
  {
    slug: 'new-balance',
    name: 'New Balance',
    tagline: 'O CLÁSSICO',
    blurb: 'que combina com tudo',
    hero: '/hero/new-balance.webp',
    logo: '/marcas/new-balance.png',
  },
  {
    slug: 'puma',
    name: 'Puma',
    tagline: 'EXPLOSÃO',
    blurb: 'em cada apoio',
    hero: '/hero/puma.webp',
    logo: '/marcas/puma.png',
  },
  {
    slug: 'mizuno',
    name: 'Mizuno',
    tagline: 'ESTABILIDADE',
    blurb: 'quilômetro após quilômetro',
    hero: '/hero/mizuno.webp',
    heroCredito: { autor: 'Ssu', licenca: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Mizuno_Wave_Horizon_5_running_shoe.jpg' },
    logo: '/marcas/mizuno.png',
  },
  {
    slug: 'vans',
    name: 'Vans',
    tagline: 'ATITUDE',
    blurb: 'desde sempre',
    hero: '/hero/vans.webp',
    heroCredito: { autor: 'Downtowngal', licenca: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Vans_sneakers_and_socks.jpg' },
    logo: '/marcas/vans.png',
  },
  // Marcas que só têm roupa (camisas e bermudas) por enquanto.
  {
    slug: 'under-armour',
    name: 'Under Armour',
    tagline: 'PROTEJA',
    blurb: 'o seu treino',
    hero: '/hero/under-armour.webp',
    heroCredito: { autor: 'Scroogebz', licenca: 'CC BY 4.0', url: 'https://commons.wikimedia.org/wiki/File:Ebenezer_Addo-Kufuor_UA_HumbleStayHungry_2025.jpg' },
    logo: '/marcas/under-armour.png',
  },
  {
    slug: 'arcteryx',
    name: "Arc'teryx",
    tagline: 'FEITA',
    blurb: 'para a trilha',
    hero: '/hero/arcteryx.webp',
    heroCredito: { autor: 'Matti Blume', licenca: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:OutDoor_2018,_Friedrichshafen_(1X7A0364).jpg' },
    logo: '/marcas/arcteryx.png',
  },
  {
    slug: 'gymshark',
    name: 'Gymshark',
    tagline: 'DO TREINO',
    blurb: 'para o dia',
    hero: '/hero/gymshark.webp',
    heroCredito: { autor: 'JamesDPerrett', licenca: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Ben_Francis.jpg' },
    logo: '/marcas/gymshark.png',
  },
  {
    slug: 'alo',
    name: 'Alo',
    tagline: 'LEVEZA',
    blurb: 'em movimento',
    hero: '/hero/alo.webp',
    heroCredito: { autor: 'ajay_suresh', licenca: 'CC BY 4.0', url: 'https://commons.wikimedia.org/wiki/File:Alo_Yoga_-_Georgetown_(55263670962).jpg' },
  },
  // Roupa sem marca escrita pelo fornecedor: melhor "outras" que chutar.
  {
    slug: 'outras',
    name: 'Outras marcas',
    tagline: 'PERFORMANCE',
    blurb: 'com preço justo',
  },
];

export const brandBySlug = new Map(BRANDS.map((b) => [b.slug, b]));

// ---------------------------------------------------------------------------
// Cores — saem da foto de capa (scripts/cores.mjs) e viram o filtro "Cor".
// A bolinha usa "hex"; o slug é o que fica no catálogo e na URL (?cor=azul).
// ---------------------------------------------------------------------------
export const COLORS: { slug: string; name: string; hex: string }[] = [
  { slug: 'preto', name: 'Preto', hex: '#111111' },
  { slug: 'branco', name: 'Branco', hex: '#F5F5F5' },
  { slug: 'cinza', name: 'Cinza', hex: '#8E8E8E' },
  { slug: 'bege', name: 'Bege', hex: '#D9C3A0' },
  { slug: 'marrom', name: 'Marrom', hex: '#6F4A2E' },
  { slug: 'vermelho', name: 'Vermelho', hex: '#D32F2F' },
  { slug: 'rosa', name: 'Rosa', hex: '#F28DB2' },
  { slug: 'laranja', name: 'Laranja', hex: '#F57C00' },
  { slug: 'amarelo', name: 'Amarelo', hex: '#F4D03F' },
  { slug: 'verde', name: 'Verde', hex: '#2E9E5B' },
  { slug: 'azul', name: 'Azul', hex: '#1E6FD9' },
  { slug: 'roxo', name: 'Roxo', hex: '#7B4BC4' },
];

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
