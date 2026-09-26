// Carta de produto que inclina com o mouse (efeito 3D).
//
// Diferenças em relação ao original publicado:
//   • sem "use client" — aqui é Vite, não Next; a diretiva vira aviso do Rollup;
//   • "logoUrl" é opcional: nem toda marca tem um SVG à mão;
//   • "photos" manda no número de bolinhas, que antes era fixo em 4;
//   • "sizes" desenha os tamanhos disponíveis, que é o que o cliente procura;
//   • o preço usa o ouro da marca e aceita "Sob consulta";
//   • "fallbackUrl" troca a foto que não carregou — o catálogo entra no ar
//     antes de todas as fotos subirem, e carta sem imagem fica quebrada.
import * as React from 'react';
import { cn } from '@/lib/utils';

interface InteractiveProductCardProps extends React.HTMLAttributes<HTMLDivElement> {
  imageUrl: string;
  logoUrl?: string;
  title: string;
  description: string;
  /** Texto pronto: "R$ 899,90" ou "Sob consulta". */
  price: string;
  /** Tamanhos disponíveis, na ordem em que devem aparecer. */
  sizes?: string[];
  /** Quantas fotos o produto tem — vira as bolinhas do rodapé. */
  photos?: number;
  /** Selo no alto da carta: "Running", "Lançamento"… */
  badge?: string;
  /** Desenho usado quando a foto não carrega. */
  fallbackUrl?: string;
}

export function InteractiveProductCard({
  className,
  imageUrl,
  logoUrl,
  title,
  description,
  price,
  sizes,
  photos = 4,
  badge,
  fallbackUrl,
  ...props
}: InteractiveProductCardProps) {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [style, setStyle] = React.useState<React.CSSProperties>({});
  const [src, setSrc] = React.useState(imageUrl);
  const [urlAnterior, setUrlAnterior] = React.useState(imageUrl);

  // A mesma carta troca de produto quando o filtro muda: volta para a foto boa.
  // Ajuste durante a renderização, não em efeito — não há sistema externo aqui.
  if (urlAnterior !== imageUrl) {
    setUrlAnterior(imageUrl);
    setSrc(imageUrl);
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const { left, top, width, height } = cardRef.current.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;

    const rotateX = ((y - height / 2) / (height / 2)) * -8; // inclina no máximo 8°
    const rotateY = ((x - width / 2) / (width / 2)) * 8;

    setStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`,
      transition: 'transform 0.1s ease-out',
    });
  };

  const handleMouseLeave = () => {
    setStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      transition: 'transform 0.4s ease-in-out',
    });
  };

  const bolinhas = Math.min(Math.max(photos, 1), 6);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ ...style, transformStyle: 'preserve-3d' }}
      className={cn(
        'group relative w-full max-w-[340px] aspect-[9/12] rounded-3xl bg-[#111] shadow-lg',
        'ring-1 ring-white/10 hover:ring-[#D7972A]/50',
        className,
      )}
      {...props}
    >
      {/* Foto — cresce um pouco para não mostrar a borda quando inclina. */}
      <img
        src={src}
        alt={title}
        loading="lazy"
        onError={() => {
          if (fallbackUrl && src !== fallbackUrl) setSrc(fallbackUrl);
        }}
        className="absolute inset-0 h-full w-full object-cover rounded-3xl transition-transform duration-300 group-hover:scale-110"
        style={{ transform: 'translateZ(-20px) scale(1.1)' }}
      />
      {/* Véu escuro: o texto tem de ler sobre qualquer foto. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/40 rounded-3xl" />

      {/* Conteúdo, à frente da foto */}
      <div className="absolute inset-0 p-5 flex flex-col" style={{ transform: 'translateZ(40px)' }}>
        {/* Cabeçalho de vidro */}
        <div className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
          <div className="flex min-w-0 flex-col">
            <h3 className="truncate text-lg font-bold text-white">{title}</h3>
            <p className="truncate text-xs text-white/70">{description}</p>
          </div>
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-4 w-auto shrink-0 opacity-90" />
          ) : null}
        </div>

        {/* Preço, logo abaixo do cabeçalho */}
        <div className="absolute top-[108px] left-5 flex items-center gap-2">
          <div className="rounded-full bg-gradient-to-br from-[#F8C549] to-[#B7781A] px-4 py-1.5 text-sm font-bold text-black shadow-lg shadow-black/40">
            {price}
          </div>
          {badge ? (
            <div className="rounded-full border border-white/15 bg-black/50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/85 backdrop-blur-sm">
              {badge}
            </div>
          ) : null}
        </div>

        {/* Tamanhos disponíveis + bolinhas, empurrados para baixo */}
        <div className="mt-auto flex w-full flex-col gap-3">
          {sizes?.length ? (
            <div className="flex flex-wrap justify-center gap-1">
              {sizes.slice(0, 8).map((s) => (
                <span
                  key={s}
                  className="rounded-md border border-white/15 bg-black/45 px-1.5 py-0.5 text-[11px] font-semibold text-white/85 backdrop-blur-sm"
                >
                  {s}
                </span>
              ))}
              {sizes.length > 8 ? (
                <span className="px-1 text-[11px] font-semibold text-white/60">+{sizes.length - 8}</span>
              ) : null}
            </div>
          ) : null}

          <div className="flex w-full justify-center gap-2 pb-2">
            {Array.from({ length: bolinhas }).map((_, index) => (
              <div
                key={index}
                className={cn('h-1.5 w-1.5 rounded-full', index === 0 ? 'bg-[#F8C549]' : 'bg-white/30')}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
