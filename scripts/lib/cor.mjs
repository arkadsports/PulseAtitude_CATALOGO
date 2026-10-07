// A paleta de cores do site (COLORS em src/config.ts) a partir de um RGB.
// Usada por scripts/cores.mjs (a cor de cada pixel da capa) e pelo
// build-catalog (a cor das roupas fotografadas em modelo).
/** Uma cor da paleta a partir de RGB (0–255). */
export function nomeDaCor(r, g, b) {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const v = max;
  const s = max === 0 ? 0 : (max - min) / max;
  let h = 0;
  if (max !== min) {
    const d = max - min;
    const [R, G, B] = [r / 255, g / 255, b / 255];
    if (max === R) h = ((G - B) / d) % 6;
    else if (max === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  if (v < 0.22) return 'preto';
  if (s < 0.14) return v > 0.8 ? 'branco' : v < 0.35 ? 'preto' : 'cinza';
  // Tons de terra: laranja/amarelo apagados viram bege (claro) ou marrom (escuro).
  if (h >= 15 && h < 50 && s < 0.5) return v > 0.62 ? 'bege' : 'marrom';
  if (h >= 10 && h < 45 && v < 0.5) return 'marrom';
  // Vermelho claro e pouco saturado é rosa.
  if ((h < 15 || h >= 330) && s < 0.45 && v > 0.65) return 'rosa';
  if (h < 12 || h >= 345) return 'vermelho';
  if (h < 40) return 'laranja';
  if (h < 68) return 'amarelo';
  if (h < 165) return 'verde';
  if (h < 255) return 'azul';
  if (h < 290) return 'roxo';
  return 'rosa';
}
