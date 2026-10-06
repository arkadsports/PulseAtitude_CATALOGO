// Como as grades de tênis aparecem: "compacta" (3 por linha no celular, mais
// no computador, com a carta pequena) ou "ampla" (a carta 3D grande).
// No celular a compacta é o padrão — com a carta grande o cliente via um tênis
// por vez. A escolha vale para o site todo e fica guardada no navegador.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type Ctx = { compacta: boolean; setCompacta: (v: boolean) => void };

const CHAVE = 'pulse:grade';
const GradeContext = createContext<Ctx | null>(null);

function inicial(): boolean {
  try {
    const salvo = localStorage.getItem(CHAVE);
    if (salvo === 'compacta') return true;
    if (salvo === 'ampla') return false;
  } catch {
    // sem armazenamento: cai no padrão pelo tamanho da tela
  }
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;
}

export function GradeProvider({ children }: { children: ReactNode }) {
  const [compacta, setCompacta] = useState(inicial);
  const [escolheu, setEscolheu] = useState(false);

  // Só grava quando o cliente escolhe: quem nunca mexeu segue o padrão da tela.
  useEffect(() => {
    if (!escolheu) return;
    try {
      localStorage.setItem(CHAVE, compacta ? 'compacta' : 'ampla');
    } catch {
      // sem armazenamento: vale só nesta visita
    }
  }, [compacta, escolheu]);

  const value = useMemo<Ctx>(
    () => ({
      compacta,
      setCompacta: (v) => {
        setEscolheu(true);
        setCompacta(v);
      },
    }),
    [compacta],
  );
  return <GradeContext.Provider value={value}>{children}</GradeContext.Provider>;
}

export function useGrade() {
  const ctx = useContext(GradeContext);
  if (!ctx) throw new Error('useGrade fora do GradeProvider');
  return ctx;
}
