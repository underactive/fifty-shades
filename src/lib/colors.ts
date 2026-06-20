// Color utilities: hex parsing, HSL conversion, ROYGBIV ordering, and
// WCAG-correct readable text color for label tags.

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Hsl {
  h: number; // 0..360
  s: number; // 0..1
  l: number; // 0..1
}

/** Saturation below this reads as a neutral (black / white / gray). */
export const NEUTRAL_SATURATION = 0.12;

/**
 * Hue angle (in the non-spectral magenta gap between violet and red) where the
 * color wheel is "cut" for ROYGBIV ordering. Rotating hues by this seam makes
 * crimson reds (~350°) and orange-reds (~10°) group together at the start,
 * instead of a raw hue sort scattering wrap-around reds after violet.
 */
const ROYGBIV_SEAM = 330;

/** Hue rotated so the rainbow runs red -> violet -> magenta from 0. */
function seamHue(h: number): number {
  return (h - ROYGBIV_SEAM + 360) % 360;
}

/** Normalize to a 6-digit lowercase hex without '#'; bad input -> '000000'. */
export function normalizeHex(hex: string): string {
  let h = (hex || '').trim().replace(/^#/, '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return '000000';
  return h.toLowerCase();
}

export function hexToRgb(hex: string): Rgb {
  const h = normalizeHex(hex);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function hexToHsl(hex: string): Hsl {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
}

export function isNeutral(hex: string): boolean {
  return hexToHsl(hex).s < NEUTRAL_SATURATION;
}

/**
 * Comparator that yields ROYGBIV order: chromatic colors first, sorted by hue
 * (red -> violet), with lightness as a tiebreaker; neutrals collected at the
 * end, sorted dark -> light.
 */
export function roygbivCompareHex(a: string, b: string): number {
  const ha = hexToHsl(a);
  const hb = hexToHsl(b);
  const na = ha.s < NEUTRAL_SATURATION;
  const nb = hb.s < NEUTRAL_SATURATION;
  if (na !== nb) return na ? 1 : -1;
  if (na && nb) return ha.l - hb.l;
  return seamHue(ha.h) - seamHue(hb.h) || ha.l - hb.l;
}

/** Stable ROYGBIV sort over an arbitrary item list keyed by its hex. */
export function sortByRoygbiv<T>(items: T[], getHex: (item: T) => string): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => roygbivCompareHex(getHex(a.item), getHex(b.item)) || a.index - b.index)
    .map((x) => x.item);
}

function channel(c: number): number {
  const cs = c / 255;
  return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance, 0 (black) .. 1 (white). */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Pick #fff or near-black for legible text over a colored background. */
export function readableTextColor(hex: string): string {
  const l = relativeLuminance(hex);
  const contrastWhite = 1.05 / (l + 0.05);
  const contrastBlack = (l + 0.05) / 0.05;
  return contrastWhite >= contrastBlack ? '#ffffff' : '#161616';
}
