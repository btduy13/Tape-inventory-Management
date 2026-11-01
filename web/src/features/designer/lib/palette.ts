// Colour helpers + max-3-colour palette rules.
import { MAX_COLORS } from "./constants";

const HEX6 = /^#[0-9a-f]{6}$/;
const HEX3 = /^#[0-9a-f]{3}$/;

/** Normalise "#ABC" / "#aabbcc" / "aabbcc" to "#aabbcc"; null when invalid. */
export function normalizeHex(input: string | null | undefined): string | null {
  if (typeof input !== "string") return null;
  let v = input.trim().toLowerCase();
  if (!v.startsWith("#")) v = `#${v}`;
  if (HEX3.test(v)) v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  return HEX6.test(v) ? v : null;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = normalizeHex(hex) ?? "#000000";
  return {
    r: Number.parseInt(h.slice(1, 3), 16),
    g: Number.parseInt(h.slice(3, 5), 16),
    b: Number.parseInt(h.slice(5, 7), 16),
  };
}

export type PaletteInput = {
  backgroundColor: string;
  textColor: string;
};

/** Distinct design colours in role order (background, text). Never more than MAX_COLORS. */
export function paletteColors(p: PaletteInput): string[] {
  const out: string[] = [];
  for (const c of [p.backgroundColor, p.textColor]) {
    const n = normalizeHex(c);
    if (n && !out.includes(n)) out.push(n);
  }
  return out.slice(0, MAX_COLORS);
}

/** Relative luminance (WCAG) for contrast warnings. */
function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** True when text would be hard to read on the background (UX warning only). */
export function isLowContrast(fg: string, bg: string): boolean {
  return contrastRatio(fg, bg) < 2;
}
