// Repeating pattern layout on the tape strip. Pure geometry; text width is measured by the caller.
// Content always fits: it is scaled down (`fit`) when wider than the strip, and every element is
// clamped inside its tile horizontally and inside the printable band vertically.
import { PRINT_MARGIN_RATIO, PX_PER_MM, STRIP_LENGTH_MM } from "./constants";

export type StripSize = { width: number; height: number };

/** Logical strip size in px: length along X, tape width along Y. */
export function stripSize(widthMm: number, lengthMm: number = STRIP_LENGTH_MM): StripSize {
  return { width: Math.round(lengthMm * PX_PER_MM), height: Math.round(widthMm * PX_PER_MM) };
}

export type PatternInput = {
  strip: StripSize;
  /** Text width measured at `fontSize` (0 when there is no text). */
  textWidth: number;
  /** Requested font size in logical px (text box height). Defaults to 90% of the strip height. */
  fontSize?: number;
  /** Logo natural aspect ratio (w/h), or null when no logo. */
  logoAspect: number | null;
  logoScale: number;
  logoOffsetX: number;
  logoOffsetY: number;
  textOffsetX?: number;
  textOffsetY?: number;
  repeatGapPx: number;
};

export type Box = { x: number; y: number; width: number; height: number };
export type Offset = { x: number; y: number };
export type PatternTile = { logo: Box | null; text: Box | null; textX: number | null };

export type PatternLayout = {
  /** Distance between tile starts. strip.width / count, so the strip wraps seamlessly. */
  period: number;
  count: number;
  tiles: PatternTile[];
  logoSize: { width: number; height: number } | null;
  /** Down-scale applied so one tile fits the strip (1 = no shrink). */
  fit: number;
  /** Rendered font size after `fit`. */
  fontSize: number;
  /** Printable band (y range) of the strip. */
  band: { top: number; bottom: number };
  /** Offsets actually applied after clamping (fraction of strip height), for drag / nudge maths. */
  effective: { logo: Offset | null; text: Offset | null };
};

/** Fraction of the strip height a logo at scale 1 occupies. */
export const LOGO_HEIGHT_RATIO = 0.7;
/** One tile (content) may use at most this share of the strip length. */
const MAX_CONTENT_SHARE = 0.95;

export function printBand(strip: StripSize): { top: number; bottom: number } {
  const m = strip.height * PRINT_MARGIN_RATIO;
  return { top: m, bottom: strip.height - m };
}

const clampRange = (v: number, lo: number, hi: number) => (hi < lo ? lo : Math.min(hi, Math.max(lo, v)));

export function computePatternLayout(input: PatternInput): PatternLayout {
  const { strip, textWidth, logoAspect } = input;
  const h = strip.height;
  const band = printBand(strip);
  const bandH = band.bottom - band.top;
  const hasText = textWidth > 0;
  const rawFont = Math.min(input.fontSize ?? bandH, bandH);

  const rawLogoH = logoAspect && logoAspect > 0 ? Math.min(h * LOGO_HEIGHT_RATIO * input.logoScale, bandH) : 0;
  const rawLogoW = rawLogoH * (logoAspect ?? 0);
  const hasLogo = rawLogoH > 0;

  const empty = { tiles: [], logoSize: null, fit: 1, fontSize: rawFont, band, effective: { logo: null, text: null } };
  if (!hasText && !hasLogo) return { period: strip.width, count: 0, ...empty };

  const rawGap = hasText && hasLogo ? h * 0.15 : 0;
  const rawContent = rawLogoW + rawGap + (hasText ? textWidth : 0);
  const fit = rawContent > 0 ? Math.min(1, (strip.width * MAX_CONTENT_SHARE) / rawContent) : 1;

  const logoSize = hasLogo ? { width: rawLogoW * fit, height: rawLogoH * fit } : null;
  const textW = hasText ? textWidth * fit : 0;
  const fontSize = rawFont * fit;
  const gap = rawGap * fit;
  const contentWidth = (logoSize?.width ?? 0) + gap + textW;

  const tileWidth = contentWidth + Math.max(0, input.repeatGapPx);
  const count = Math.max(1, Math.floor(strip.width / Math.max(1, tileWidth)));
  const period = strip.width / count;

  const place = (i: number, baseX: number, w: number, bh: number, ox: number, oy: number): Box => {
    const tile0 = i * period;
    return {
      x: clampRange(baseX + ox * h, tile0, tile0 + period - w),
      y: clampRange((h - bh) / 2 + oy * h, band.top, band.bottom - bh),
      width: w,
      height: bh,
    };
  };

  const tiles: PatternTile[] = [];
  for (let i = 0; i < count; i++) {
    const start = i * period + (period - contentWidth) / 2;
    const logo = logoSize
      ? place(i, start, logoSize.width, logoSize.height, input.logoOffsetX, input.logoOffsetY)
      : null;
    const textStart = start + (logoSize ? logoSize.width + gap : 0);
    const text = hasText
      ? place(i, textStart, textW, fontSize, input.textOffsetX ?? 0, input.textOffsetY ?? 0)
      : null;
    tiles.push({ logo, text, textX: text ? text.x : null });
  }

  // Effective offsets of tile 0 (identical for every tile).
  const start0 = (period - contentWidth) / 2;
  const t0 = tiles[0];
  const effective = {
    logo: t0.logo && logoSize ? { x: (t0.logo.x - start0) / h, y: (t0.logo.y - (h - logoSize.height) / 2) / h } : null,
    text: t0.text
      ? { x: (t0.text.x - start0 - (logoSize ? logoSize.width + gap : 0)) / h, y: (t0.text.y - (h - fontSize) / 2) / h }
      : null,
  };
  return { period, count, tiles, logoSize, fit, fontSize, band, effective };
}
