// Facts about a colour picked with the 3D eyedropper: nearest named swatch, and whether it is one
// of the design's counted print inks (same ΔE rule as the ink counter). Pure + unit-tested.
import { SWATCHES } from "./constants";
import { deltaE, hexToLab, INK_MERGE_DE } from "./logo-colors";
import { normalizeHex } from "./palette";
import { swatchName } from "./swatch-names";

export type PickedColorFacts = {
  hex: string;
  /** Nearest quick-pick swatch (ΔE76) and its Vietnamese name. */
  swatch: { hex: string; name: string; exact: boolean };
  /** 1-based position in the counted inks, or null when it is not a counted ink. */
  inkIndex: number | null;
  /** Same colour as the tape background (counted as one of the colours). */
  isBackground: boolean;
  /** Same colour as the text. */
  isText: boolean;
};

export type PickedColorContext = {
  backgroundColor: string;
  textColor: string;
  /** Counted print inks (printInks().colors): tape colour ∪ text colour ∪ logo colours. */
  inks: readonly string[];
};

const same = (a: string, b: string) => deltaE(hexToLab(a), hexToLab(b)) < INK_MERGE_DE;

export function nearestSwatch(hex: string): { hex: string; name: string; exact: boolean } {
  const lab = hexToLab(hex);
  let best: string = SWATCHES[0];
  let bestDe = Infinity;
  for (const s of SWATCHES) {
    const de = deltaE(lab, hexToLab(s));
    if (de < bestDe) {
      bestDe = de;
      best = s;
    }
  }
  return { hex: best, name: swatchName(best), exact: best === hex.toLowerCase() };
}

export function describePickedColor(raw: string, ctx: PickedColorContext): PickedColorFacts | null {
  const hex = normalizeHex(raw);
  if (!hex) return null;
  const isBackground = same(hex, ctx.backgroundColor);
  const i = isBackground ? -1 : ctx.inks.findIndex((ink) => same(hex, ink));
  return {
    hex,
    swatch: nearestSwatch(hex),
    inkIndex: i >= 0 ? i + 1 : null,
    isBackground,
    isText: same(hex, ctx.textColor),
  };
}
