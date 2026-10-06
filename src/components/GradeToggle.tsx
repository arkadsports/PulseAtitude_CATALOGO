// Os dois botões que trocam a grade: compacta (3 por linha no celular) ou ampla.
import { LayoutGrid, Square } from 'lucide-react';
import { useGrade } from '../lib/grade';

export default function GradeToggle({ className = '' }: { className?: string }) {
  const { compacta, setCompacta } = useGrade();
  const botao = (ligado: boolean) =>
    `grid h-9 w-9 place-items-center rounded-full transition-colors ${
      ligado ? 'bg-gradient-to-br from-ouro-claro to-ouro-escuro text-black' : 'text-nevoa hover:text-white'
    }`;
  return (
    <div
      role="group"
      aria-label="Como ver os tênis"
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border border-fio bg-grafite p-1 ${className}`}
    >
      <button
        type="button"
        aria-pressed={compacta}
        aria-label="Ver em grade: vários tênis por linha"
        title="Grade: vários por linha"
        onClick={() => setCompacta(true)}
        className={botao(compacta)}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-pressed={!compacta}
        aria-label="Ver ampliado: cartas grandes"
        title="Ampliado: cartas grandes"
        onClick={() => setCompacta(false)}
        className={botao(!compacta)}
      >
        <Square className="h-4 w-4" />
      </button>
    </div>
  );
}
