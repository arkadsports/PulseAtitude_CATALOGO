// Carrega public/data/catalog.json uma vez e entrega para todas as páginas.
// É o único ponto que sabe de onde vêm os produtos: trocar a origem (Yupoo,
// planilha, banco) não mexe em nenhuma tela.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { IMAGE_BASE, PRICES, STORE, brandBySlug, type CategorySlug } from '../config';

export type Product = {
  /** Código do produto — é ele que vai no pedido. */
  id: string;
  name: string;
  /** slug da marca, como em config.ts */
  brand: string;
  category: CategorySlug;
  /** Cor da peça, do jeito que o cliente enxerga: "Preto / Ouro". */
  colorway?: string;
  /** Slugs de COLORS (config.ts), da cor que mais aparece para a que menos. */
  colors?: string[];
  /** Tamanhos que existem. Só estes aparecem na página. */
  sizes: string[];
  /** Quantas fotos existem no bucket para este produto. */
  photos: number;
  /** Índice da foto de capa. Padrão: a primeira. */
  cover?: number;
  /** Preço em reais. null/ausente = "Sob consulta". */
  price?: number | null;
  tags?: string[];
};

export type Catalog = {
  generatedAt: string;
  /** true enquanto o catálogo for a semente de exemplo, não a base de verdade. */
  demo?: boolean;
  products: Product[];
};

type Ctx = {
  ready: boolean;
  error: string | null;
  catalog: Catalog;
  productById: Map<string, Product>;
  productsByBrand: Map<string, Product[]>;
  productsByCategory: Map<string, Product[]>;
};

const empty: Catalog = { generatedAt: '', products: [] };
const CatalogContext = createContext<Ctx | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Catalog>(empty);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/catalog.json')
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((c: Catalog) => {
        setCatalog(c);
        setReady(true);
      })
      .catch(() =>
        setError('Não foi possível carregar o catálogo. Rode "npm run build-catalog" e recarregue a página.'),
      );
  }, []);

  const value = useMemo<Ctx>(() => {
    const productsByBrand = new Map<string, Product[]>();
    const productsByCategory = new Map<string, Product[]>();
    for (const p of catalog.products) {
      const b = productsByBrand.get(p.brand) ?? [];
      b.push(p);
      productsByBrand.set(p.brand, b);
      const c = productsByCategory.get(p.category) ?? [];
      c.push(p);
      productsByCategory.set(p.category, c);
    }
    return {
      ready,
      error,
      catalog,
      productsByBrand,
      productsByCategory,
      productById: new Map(catalog.products.map((p) => [p.id, p])),
    };
  }, [catalog, ready, error]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog precisa estar dentro de <CatalogProvider>');
  return ctx;
}

// ---------- Fotos ----------
/** Endereço de uma foto: .../<id>/<índice>-<thumb|full>.webp */
export const img = (id: string, index: number, size: 'thumb' | 'full') =>
  `${IMAGE_BASE}/${id}/${index}-${size}.webp`;

export const cover = (p: Product, size: 'thumb' | 'full' = 'thumb') => img(p.id, p.cover ?? 0, size);

// ---------- Preço ----------
export const money = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Preço do produto, ou undefined enquanto não houver. O produto manda; a
 *  tabela por marca em config.ts é o padrão. */
export function priceOf(p: Product): number | undefined {
  if (typeof p.price === 'number') return p.price;
  return PRICES[p.brand];
}

export const priceLabel = (p: Product) => {
  const v = priceOf(p);
  return v === undefined ? 'Sob consulta' : money(v);
};

// ---------- Pedido ----------
/** Nome para o cliente ler: marca + modelo, sem repetir ("On Cloud 5", não "On On Cloud 5"). */
export function nomeCompleto(p: Product) {
  const marca = brandBySlug.get(p.brand)?.name ?? p.brand;
  return p.name.toLowerCase().startsWith(marca.toLowerCase() + ' ') ? p.name : `${marca} ${p.name}`;
}

/** Link do pedido no WhatsApp, já com o tamanho escolhido na página. Sem
 *  tamanho, o campo vai em branco para o cliente completar — nunca chutamos
 *  um número.
 *
 *  A foto: o wa.me só leva texto, então a mensagem termina com o link
 *  /p/<id> (api/p.js), e o WhatsApp mostra a foto do tênis na pré-visualização
 *  desse link, na conversa com a loja. */
export function whatsappLink(p: Product, size?: string) {
  const origem = typeof window === 'undefined' ? '' : window.location.origin;
  const linhas = [
    `Olá! Quero concluir meu pedido na ${STORE.name}:`,
    '',
    `*${nomeCompleto(p)}*`,
    p.colorway ? `Cor: ${p.colorway}` : null,
    `Tamanho: ${size ?? ''}`,
    `Código: ${p.id}`,
    `Preço: ${priceLabel(p)}`,
    '',
    `${origem}/p/${p.id}${size ? `?t=${encodeURIComponent(size)}` : ''}`,
  ].filter((l) => l !== null);
  const texto = encodeURIComponent(linhas.join('\n'));
  return STORE.whatsapp ? `https://wa.me/${STORE.whatsapp}?text=${texto}` : `https://wa.me/?text=${texto}`;
}

// ---------- Busca ----------
export const normalize = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Busca simples: todas as palavras precisam aparecer no texto do produto. */
export function searchProducts(products: Product[], q: string) {
  const words = normalize(q).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return products.filter((p) => {
    const marca = brandBySlug.get(p.brand)?.name ?? p.brand;
    const hay = normalize([p.id, p.name, marca, p.category, p.colorway, ...(p.tags ?? [])].join(' '));
    return words.every((w) => hay.includes(w));
  });
}

/** Ordena tamanhos como número, não como texto ("9" antes de "10"). */
export const sortSizes = (sizes: string[]) =>
  [...sizes].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
