// Carrossel "coverflow": as cartas giram em 3D em volta da carta central.
//
// Diferenças em relação ao original publicado:
//   • sem "use client" — aqui é Vite, não Next;
//   • as cores de destaque saem de "accent" (padrão: o ouro da Pulse), no lugar
//     do bege fixo do original;
//   • "items" é obrigatório e o catálogo de pratos que vinha de exemplo saiu —
//     quem manda as cartas é a lista de marcas em config.ts;
//   • as distâncias encolhem no celular: com 330px fixos a carta vizinha saía
//     da tela em telefone;
//   • "logo" opcional: quando vem, a logo toma o lugar do título escrito.
import React, { useState, useEffect, useCallback, useRef } from 'react';

const ChevronLeftIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);

export interface CarouselItem {
  tag?: string;
  titleLine1: string;
  titleLine2?: string;
  desc?: string;
  img: string;
  /** Logo da marca (branca, fundo transparente). Substitui o título escrito. */
  logo?: string;
  ctaText?: string;
  ctaUrl?: string;
}

export interface CoverFlowCarouselProps {
  items: CarouselItem[];
  sectionLabel?: string;
  autoplay?: boolean;
  autoplayDelay?: number;
  className?: string;
  /** Cor de destaque: fio, bolinha ativa e botão. Padrão: o ouro da logo. */
  accent?: string;
  accentDark?: string;
  onCtaClick?: (item: CarouselItem) => void;
}

/** Largura em que o carrossel passa a usar as distâncias curtas. */
const ESTREITO = 720;

export function CoverFlowCarousel({
  items,
  sectionLabel = 'MARCAS',
  autoplay = true,
  autoplayDelay = 5000,
  className = '',
  accent = '#D7972A',
  accentDark = '#8A540B',
  onCtaClick,
}: CoverFlowCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [estreito, setEstreito] = useState(false);
  const touchStartX = useRef(0);
  const total = items.length;

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const goToSlide = (idx: number) => {
    setCurrentIndex(idx % total);
  };

  useEffect(() => {
    const medir = () => setEstreito(window.innerWidth < ESTREITO);
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, []);

  useEffect(() => {
    if (!autoplay || isHovered || total <= 1) return;
    const interval = setInterval(nextSlide, autoplayDelay);
    return () => clearInterval(interval);
  }, [autoplay, autoplayDelay, isHovered, nextSlide, total]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'ArrowRight') nextSlide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 45) {
      if (diff < 0) nextSlide();
      else prevSlide();
    }
  };

  if (!items || items.length === 0) return null;

  // Distâncias das cartas vizinhas. No celular elas encostam mais, senão somem.
  const d1 = estreito ? 170 : 285;
  const d2 = estreito ? 300 : 510;
  const cartaW = estreito ? 250 : 330;
  const cartaH = estreito ? 380 : 500;

  return (
    <section
      className={`relative w-full flex items-center justify-center overflow-hidden py-12 select-none ${className}`}
      style={{
        minHeight: estreito ? 620 : 760,
        backgroundColor: '#050505',
        color: '#ffffff',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Fundo: a própria foto da carta central, desfocada. */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <img
          src={items[currentIndex]?.img}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'brightness(0.22) blur(32px)',
            transform: 'scale(1.15)',
            transition: 'opacity 1000ms ease, filter 1000ms ease',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at center, rgba(5,5,5,0.3) 0%, rgba(5,5,5,0.94) 100%)',
          }}
        />
      </div>

      <div className="relative w-full max-w-6xl mx-auto px-4 z-10 flex flex-col items-center">
        {sectionLabel && (
          <div className="flex items-center gap-3 mb-8">
            <span
              style={{ width: '36px', height: '1px', background: `linear-gradient(90deg, transparent, ${accent})` }}
            />
            <h3
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color: accent,
                margin: 0,
              }}
            >
              {sectionLabel}
            </h3>
            <span
              style={{ width: '36px', height: '1px', background: `linear-gradient(90deg, ${accent}, transparent)` }}
            />
          </div>
        )}

        {/* Palco 3D */}
        <div
          className="relative w-full flex justify-center items-center mb-8"
          style={{ perspective: '1400px', height: cartaH + 20 }}
        >
          {items.map((item, idx) => {
            const offset = (idx - currentIndex + total) % total;

            let transform = 'translateX(0px) scale(0.4) rotateY(0deg)';
            let opacity = 0;
            let zIndex = 0;
            let filter = 'brightness(0.4) blur(2px)';
            let isCenter = false;

            if (offset === 0) {
              isCenter = true;
              transform = 'translateX(0px) scale(1) rotateY(0deg)';
              opacity = 1;
              zIndex = 30;
              filter = 'brightness(1)';
            } else if (offset === 1) {
              transform = `translateX(${d1}px) scale(0.84) rotateY(-24deg)`;
              opacity = 0.65;
              zIndex = 20;
              filter = 'brightness(0.75)';
            } else if (offset === 2) {
              transform = `translateX(${d2}px) scale(0.68) rotateY(-38deg)`;
              opacity = 0.38;
              zIndex = 10;
              filter = 'brightness(0.55) blur(1px)';
            } else if (offset === total - 1) {
              transform = `translateX(-${d1}px) scale(0.84) rotateY(24deg)`;
              opacity = 0.65;
              zIndex = 20;
              filter = 'brightness(0.75)';
            } else if (offset === total - 2) {
              transform = `translateX(-${d2}px) scale(0.68) rotateY(38deg)`;
              opacity = 0.38;
              zIndex = 10;
              filter = 'brightness(0.55) blur(1px)';
            }

            return (
              <div
                key={idx}
                onClick={() => !isCenter && goToSlide(idx)}
                style={{
                  position: 'absolute',
                  width: cartaW,
                  height: cartaH,
                  borderRadius: '18px',
                  overflow: 'hidden',
                  backgroundColor: '#121212',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  transform,
                  opacity,
                  zIndex,
                  filter,
                  transformOrigin: 'center center',
                  transition: 'all 800ms cubic-bezier(0.25, 1, 0.5, 1)',
                  boxShadow: isCenter
                    ? `0 25px 60px rgba(0,0,0,0.9), 0 0 35px ${accent}40`
                    : '0 15px 35px rgba(0,0,0,0.5)',
                  cursor: isCenter ? 'default' : 'pointer',
                }}
              >
                <img
                  src={item.img}
                  alt={item.titleLine1}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />

                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.1) 25%, rgba(0,0,0,0.7) 60%, rgba(0,0,0,0.97) 100%)',
                    pointerEvents: 'none',
                    zIndex: 10,
                  }}
                />

                {/* Carta lateral: só a logo, para a marca ser reconhecida de longe.
                    Na carta do centro ela sai daqui e entra no título, abaixo. */}
                {item.logo ? (
                  <img
                    src={item.logo}
                    alt=""
                    aria-hidden
                    style={{
                      position: 'absolute',
                      left: '50%',
                      bottom: '22%',
                      transform: 'translateX(-50%)',
                      height: '64px',
                      maxWidth: '70%',
                      objectFit: 'contain',
                      zIndex: 15,
                      opacity: isCenter ? 0 : 0.85,
                      transition: 'opacity 500ms ease',
                      filter: 'drop-shadow(0 3px 10px rgba(0,0,0,0.9))',
                      pointerEvents: 'none',
                    }}
                  />
                ) : null}

                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    padding: '20px 18px 22px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    textAlign: 'center',
                    zIndex: 20,
                    opacity: isCenter ? 1 : 0,
                    transform: isCenter ? 'translateY(0px)' : 'translateY(16px)',
                    transition: 'opacity 500ms ease, transform 500ms ease',
                    pointerEvents: isCenter ? 'auto' : 'none',
                  }}
                >
                  <div style={{ textAlign: 'right', width: '100%', paddingRight: '4px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        letterSpacing: '0.06em',
                        color: 'rgba(255,255,255,0.9)',
                        textShadow: '0 2px 6px rgba(0,0,0,0.8)',
                      }}
                    >
                      {item.tag}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '3px',
                      marginTop: 'auto',
                      paddingBottom: '4px',
                    }}
                  >
                    <h2
                      style={{
                        fontSize: '1.65rem',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        color: '#ffffff',
                        margin: 0,
                        lineHeight: 1.1,
                        textShadow: '0 3px 12px rgba(0,0,0,0.95)',
                      }}
                    >
                      {item.logo ? (
                        <img
                          src={item.logo}
                          alt={item.titleLine1}
                          style={{
                            display: 'block',
                            height: '64px',
                            maxWidth: '220px',
                            objectFit: 'contain',
                            margin: '0 auto 6px',
                            filter: 'drop-shadow(0 3px 10px rgba(0,0,0,0.9))',
                          }}
                        />
                      ) : (
                        item.titleLine1
                      )}
                    </h2>

                    {item.titleLine2 && (
                      <span
                        style={{
                          fontSize: '1.1rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: '#f3f0ea',
                          lineHeight: 1.2,
                          textShadow: '0 3px 10px rgba(0,0,0,0.9)',
                        }}
                      >
                        {item.titleLine2}
                      </span>
                    )}

                    <div
                      style={{
                        width: '34px',
                        height: '2px',
                        backgroundColor: accent,
                        borderRadius: '2px',
                        margin: '5px auto 4px',
                        boxShadow: `0 0 8px ${accent}b3`,
                      }}
                    />

                    {item.desc && (
                      <p
                        style={{
                          fontSize: '0.82rem',
                          fontStyle: 'italic',
                          color: 'rgba(255,255,255,0.9)',
                          maxWidth: '280px',
                          margin: '0 0 10px',
                          lineHeight: 1.3,
                          textShadow: '0 2px 8px rgba(0,0,0,0.9)',
                        }}
                      >
                        {item.desc}
                      </p>
                    )}

                    <a
                      href={item.ctaUrl || '#'}
                      onClick={(e) => {
                        if (onCtaClick) {
                          e.preventDefault();
                          onCtaClick(item);
                        }
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '7px 18px',
                        borderRadius: '9999px',
                        background: `linear-gradient(135deg, #F8C549 0%, ${accentDark} 100%)`,
                        color: '#0a0a0a',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        textDecoration: 'none',
                        boxShadow: `0 4px 14px rgba(0,0,0,0.4), 0 0 15px ${accent}4d`,
                        cursor: 'pointer',
                        transition: 'transform 200ms ease, box-shadow 200ms ease',
                      }}
                    >
                      <span>{item.ctaText || 'Ver modelos'}</span>
                      <ArrowRightIcon />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={prevSlide}
          aria-label="Marca anterior"
          style={{
            position: 'absolute',
            left: estreito ? '4px' : '24px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            backgroundColor: 'rgba(0,0,0,0.55)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(8px)',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            zIndex: 40,
            transition: 'all 200ms ease',
          }}
        >
          <ChevronLeftIcon />
        </button>

        <button
          onClick={nextSlide}
          aria-label="Próxima marca"
          style={{
            position: 'absolute',
            right: estreito ? '4px' : '24px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            backgroundColor: 'rgba(0,0,0,0.55)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(8px)',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            zIndex: 40,
            transition: 'all 200ms ease',
          }}
        >
          <ChevronRightIcon />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', zIndex: 30 }}>
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goToSlide(idx)}
              aria-label={`Ir para a carta ${idx + 1}`}
              style={{
                height: '8px',
                width: idx === currentIndex ? '28px' : '8px',
                borderRadius: '9999px',
                backgroundColor: idx === currentIndex ? accent : 'rgba(255,255,255,0.25)',
                border: 'none',
                cursor: 'pointer',
                boxShadow: idx === currentIndex ? `0 0 10px ${accent}b3` : 'none',
                transition: 'all 300ms ease',
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export const Component = CoverFlowCarousel;
export default CoverFlowCarousel;
