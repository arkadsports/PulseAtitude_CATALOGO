// O carrinho: vários tênis, cada um com tamanho e quantidade, num pedido só.
// Fica guardado no navegador (localStorage) — fechar a página não perde nada.
// Não há pagamento aqui: o carrinho termina numa mensagem de WhatsApp.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type CartItem = {
  /** id do produto, como no catalog.json */
  id: string;
  /** tamanho escolhido; o mesmo tênis em dois tamanhos são dois itens */
  size: string;
  qty: number;
};

type Ctx = {
  items: CartItem[];
  /** soma das quantidades — o número no ícone do cabeçalho */
  count: number;
  add: (id: string, size: string, qty?: number) => void;
  setQty: (id: string, size: string, qty: number) => void;
  setSize: (id: string, size: string, novo: string) => void;
  remove: (id: string, size: string) => void;
  clear: () => void;
};

const CHAVE = 'pulse:carrinho';
const MAX_QTD = 10;
const CartContext = createContext<Ctx | null>(null);

function ler(): CartItem[] {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? '[]');
    return Array.isArray(salvo)
      ? salvo.filter((i) => i && typeof i.id === 'string' && typeof i.size === 'string' && i.qty > 0)
      : [];
  } catch {
    return []; // navegador sem armazenamento (aba anônima, bloqueio): carrinho só desta visita
  }
}

const mesmo = (i: CartItem, id: string, size: string) => i.id === id && i.size === size;

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(ler);

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(items));
    } catch {
      // sem armazenamento: segue funcionando nesta visita
    }
  }, [items]);

  // Outra aba mexeu no carrinho: esta acompanha.
  useEffect(() => {
    const ouvir = (e: StorageEvent) => {
      if (e.key === CHAVE) setItems(ler());
    };
    window.addEventListener('storage', ouvir);
    return () => window.removeEventListener('storage', ouvir);
  }, []);

  const value = useMemo<Ctx>(() => {
    const limitar = (q: number) => Math.max(1, Math.min(MAX_QTD, Math.round(q)));
    return {
      items,
      count: items.reduce((s, i) => s + i.qty, 0),
      add: (id, size, qty = 1) =>
        setItems((atual) =>
          atual.some((i) => mesmo(i, id, size))
            ? atual.map((i) => (mesmo(i, id, size) ? { ...i, qty: limitar(i.qty + qty) } : i))
            : [...atual, { id, size, qty: limitar(qty) }],
        ),
      setQty: (id, size, qty) =>
        setItems((atual) => atual.map((i) => (mesmo(i, id, size) ? { ...i, qty: limitar(qty) } : i))),
      // Trocar para um tamanho que já está no carrinho junta os dois itens.
      setSize: (id, size, novo) =>
        setItems((atual) => {
          const item = atual.find((i) => mesmo(i, id, size));
          if (!item || novo === size) return atual;
          const resto = atual.filter((i) => !mesmo(i, id, size));
          const existente = resto.find((i) => mesmo(i, id, novo));
          return existente
            ? resto.map((i) => (i === existente ? { ...i, qty: limitar(i.qty + item.qty) } : i))
            : atual.map((i) => (i === item ? { ...i, size: novo } : i));
        }),
      remove: (id, size) => setItems((atual) => atual.filter((i) => !mesmo(i, id, size))),
      clear: () => setItems([]),
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart fora do CartProvider');
  return ctx;
}

/** O carrinho em texto curto, para URL: "id:tamanho:qtd,id:tamanho:qtd" (":" e não ".": há tamanho 36.5). */
export const codificarItens = (items: CartItem[]) =>
  items.map((i) => `${i.id}:${i.size}:${i.qty}`).join(',');

/** O inverso de codificarItens — o que a página /pedido e a api/c.js leem. */
export function decodificarItens(texto: string): CartItem[] {
  return texto
    .split(',')
    .map((parte) => {
      const [id, size, qty] = parte.split(':');
      return {
        id: (id ?? '').replace(/[^\w-]/g, ''),
        size: (size ?? '').replace(/[^\d.,]/g, '').slice(0, 5),
        qty: Math.max(1, Math.min(10, Number(qty) || 1)),
      };
    })
    .filter((i) => i.id)
    .slice(0, 30);
}
