// Repeating pattern layout on the tape strip. Pure geometry; text width is measured by the caller.
// Content always fits: it is scaled down (`fit`) when wider than the strip, and every element is
// clamped inside its tile horizontally and inside the printable band vertically.
//
// Patterns (DesignPattern): every one tiles the strip seamlessly (the 3D roll repeats the strip
// texture), so tile counts / shifts always divide the strip length.
//   straight  one row, every tile upright (the original layout)
//   flip      one row, every second tile turned 180° (reads from both sides of the box)
//   stagger   two rows, the lower row shifted half a step (brick layout)
//   twoRows   two aligned rows
//   diagonal  one row, each tile tilted DIAGONAL_ANGLE degrees
// Positions stay in unrotated strip coordinates; a turned tile carries a `transform` (pivot +
// rotation + shift) that the renderer applies to its group, so drag maths is the same for all.
import type { DesignPattern } from "@/lib/types";
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
  pattern?: DesignPattern;
};

export type Box = { x: number; y: number; width: number; height: number };
export type Offset = { x: number; y: number };
/** Group transform of a turned tile: scale and rotate `rotation`° around (pivotX, pivotY), then
 *  shift (dx, dy). `scale` < 1 only when offsets pull a tilted tile taller than its row band. */
export type TileTransform = { pivotX: number; pivotY: number; rotation: number; scale: number; dx: number; dy: number };
export type PatternTile = {
  logo: Box | null;
  text: Box | null;
  textX: number | null;
  /** 0 = upper (or only) row, 1 = lower row. */
  row: number;
  /** Wrap-around copy that completes a tile cut by the strip edge: drawn, never interactive. */
  ghost: boolean;
  transform: TileTransform | null;
};

export type PatternLayout = {
  pattern: DesignPattern;
  rows: number;
  /** Distance between tile starts. strip.width / count, so the strip wraps seamlessly. */
  period: number;
  count: number;
  tiles: PatternTile[];
  logoSize: { width: number; height: number } | null;
  /** Down-scale applied so one tile fits the strip (1 = no shrink). */
  fit: number;
  /** Rendered font size after `fit`. */
  fontSize: number;
  /** Requested-to-rendered font ratio before `fit` (1 / rows). */
  fontScale: number;
  /** Size unit (px) for logo size and offsets: the strip height divided by the row count. */
  unit: number;
  /** Printable band (y range) of the strip. */
  band: { top: number; bottom: number };
  /** Offsets actually applied after clamping (fraction of `unit`), for drag / nudge maths. */
  effective: { logo: Offset | null; text: Offset | null };
};

/** Fraction of the strip height a logo at scale 1 occupies. */
export const LOGO_HEIGHT_RATIO = 0.7;
/** Tilt of the diagonal pattern, degrees (negative: text rises to the right). */
export const DIAGONAL_ANGLE = -15;
/** One tile (content) may use at most this share of the strip length. */
const MAX_CONTENT_SHARE = 0.95;
/** Unprinted gap between the two rows, fraction of the strip height. */
const ROW_GAP_RATIO = 0.04;

type PatternSpec = { rows: 1 | 2; stagger: boolean; flip: boolean; angle: number; minTiles: 1 | 2 };
const SPECS: Record<DesignPattern, PatternSpec> = {
  straight: { rows: 1, stagger: false, flip: false, angle: 0, minTiles: 1 },
  flip: { rows: 1, stagger: false, flip: true, angle: 0, minTiles: 2 },
  stagger: { rows: 2, stagger: true, flip: false, angle: 0, minTiles: 1 },
  twoRows: { rows: 2, stagger: false, flip: false, angle: 0, minTiles: 1 },
  diagonal: { rows: 1, stagger: false, flip: false, angle: DIAGONAL_ANGLE, minTiles: 1 },
};

/** Two-row patterns print each row at half the tape width (the font / logo halve too). */
export const isTwoRowPattern = (p: DesignPattern): boolean => SPECS[p].rows === 2;

export function printBand(strip: StripSize): { top: number; bottom: number } {
  const m = strip.height * PRINT_MARGIN_RATIO;
  return { top: m, bottom: strip.height - m };
}

const clampRange = (v: number, lo: number, hi: number) => (hi < lo ? lo : Math.min(hi, Math.max(lo, v)));

type Band = { top: number; bottom: number };

function rowBands(strip: StripSize, rows: number): Band[] {
  const band = printBand(strip);
  if (rows === 1) return [band];
  const mid = (band.top + band.bottom) / 2;
  const g = (strip.height * ROW_GAP_RATIO) / 2;
  return [
    { top: band.top, bottom: mid - g },
    { top: mid + g, bottom: band.bottom },
  ];
}

/** Half extents of a w x h box rotated by `deg`. */
function rotatedHalf(w: number, h: number, deg: number): { ex: number; ey: number } {
  const r = (deg * Math.PI) / 180;
  const c = Math.abs(Math.cos(r));
  const s = Math.abs(Math.sin(r));
  return { ex: (w * c + h * s) / 2, ey: (w * s + h * c) / 2 };
}

export function computePatternLayout(input: PatternInput): PatternLayout {
  return layoutPass(input);
}

function union(t: Pick<PatternTile, "logo" | "text">): Box | null {
  const boxes = [t.logo, t.text].filter((b): b is Box => b !== null);
  if (boxes.length === 0) return null;
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  const r = Math.max(...boxes.map((b) => b.x + b.width));
  const b = Math.max(...boxes.map((b) => b.y + b.height));
  return { x, y, width: r - x, height: b - y };
}

function layoutPass(input: PatternInput): PatternLayout {
  const { strip, textWidth, logoAspect } = input;
  const pattern: DesignPattern = input.pattern && input.pattern in SPECS ? input.pattern : "straight";
  const spec = SPECS[pattern];
  const h = strip.height;
  const band = printBand(strip);
  const bands = rowBands(strip, spec.rows);
  const rowH = bands[0].bottom - bands[0].top;
  const unit = h / spec.rows;
  const fontScale = 1 / spec.rows;
  const hasText = textWidth > 0;
  const requestedFont = input.fontSize ?? band.bottom - band.top;
  const rawFont = Math.min(requestedFont * fontScale, rowH);
  // `textWidth` was measured at the requested size: scale it with the font actually used.
  const rawTextW = hasText && requestedFont > 0 ? textWidth * (rawFont / requestedFont) : 0;

  const rawLogoH = logoAspect && logoAspect > 0 ? Math.min(unit * LOGO_HEIGHT_RATIO * input.logoScale, rowH) : 0;
  const rawLogoW = rawLogoH * (logoAspect ?? 0);
  const hasLogo = rawLogoH > 0;

  const base = { pattern, rows: spec.rows, fontScale, unit, band };
  const empty = { tiles: [], logoSize: null, fit: 1, fontSize: rawFont, effective: { logo: null, text: null } };
  if (!hasText && !hasLogo) return { ...base, period: strip.width, count: 0, ...empty };

  const rawGap = hasText && hasLogo ? unit * 0.15 : 0;
  const rawContent = rawLogoW + rawGap + rawTextW;
  const rawHeight = Math.max(rawLogoH, hasText ? rawFont : 0);
  const turned = rotatedHalf(rawContent, rawHeight, spec.angle);
  const fitW = rawContent > 0 ? (strip.width * MAX_CONTENT_SHARE) / spec.minTiles / (2 * turned.ex) : 1;
  const fitH = spec.angle !== 0 ? rowH / (2 * turned.ey) : 1;
  const fit = Math.min(1, fitW, fitH);

  const logoSize = hasLogo ? { width: rawLogoW * fit, height: rawLogoH * fit } : null;
  const textW = rawTextW * fit;
  const fontSize = rawFont * fit;
  const gap = rawGap * fit;
  const contentWidth = (logoSize?.width ?? 0) + gap + textW;

  const tileWidth = 2 * turned.ex * fit + Math.max(0, input.repeatGapPx);
  let count = Math.max(spec.minTiles, Math.floor(strip.width / Math.max(1, tileWidth)));
  if (spec.flip && count % 2 === 1) count -= 1; // upright / turned pairs must wrap seamlessly
  const period = strip.width / count;

  const tiles: PatternTile[] = [];
  const ghosts: PatternTile[] = [];
  for (let row = 0; row < spec.rows; row++) {
    const rb = bands[row];
    const cy = (rb.top + rb.bottom) / 2;
    const shift = spec.stagger && row === 1 ? period / 2 : 0;
    const place = (tile0: number, baseX: number, w: number, bh: number, ox: number, oy: number): Box => ({
      x: clampRange(baseX + ox * unit, tile0, tile0 + period - w),
      y: clampRange(cy - bh / 2 + oy * unit, rb.top, rb.bottom - bh),
      width: w,
      height: bh,
    });
    // A shifted row has one tile cut by the strip end: its wrap-around copy starts before 0.
    for (let i = shift > 0 ? -1 : 0; i < count; i++) {
      const tile0 = i * period + shift;
      const start = tile0 + (period - contentWidth) / 2;
      const logo = logoSize ? place(tile0, start, logoSize.width, logoSize.height, input.logoOffsetX, input.logoOffsetY) : null;
      const textStart = start + (logoSize ? logoSize.width + gap : 0);
      const text = hasText ? place(tile0, textStart, textW, fontSize, input.textOffsetX ?? 0, input.textOffsetY ?? 0) : null;
      const rotation = spec.flip && i % 2 !== 0 ? 180 : spec.angle;
      const tile: PatternTile = {
        logo,
        text,
        textX: text ? text.x : null,
        row,
        ghost: i < 0,
        transform: rotation !== 0 ? tileTransform({ logo, text }, rotation, tile0, period, rb) : null,
      };
      (tile.ghost ? ghosts : tiles).push(tile);
    }
  }
  tiles.push(...ghosts);

  // Effective offsets of tile 0 (identical for every tile).
  const cy0 = (bands[0].top + bands[0].bottom) / 2;
  const start0 = (period - contentWidth) / 2;
  const t0 = tiles[0];
  const effective = {
    logo: t0.logo && logoSize ? { x: (t0.logo.x - start0) / unit, y: (t0.logo.y - (cy0 - logoSize.height / 2)) / unit } : null,
    text: t0.text
      ? { x: (t0.text.x - start0 - (logoSize ? logoSize.width + gap : 0)) / unit, y: (t0.text.y - (cy0 - fontSize / 2)) / unit }
      : null,
  };
  return { ...base, period, count, tiles, logoSize, fit, fontSize, effective };
}

/** Pivot at the content centre; shrink / shift so the turned content stays inside its tile and row band. */
function tileTransform(t: Pick<PatternTile, "logo" | "text">, rotation: number, tile0: number, period: number, rb: Band): TileTransform | null {
  const u = union(t);
  if (!u) return null;
  const pivotX = u.x + u.width / 2;
  const pivotY = u.y + u.height / 2;
  const half = rotatedHalf(u.width, u.height, rotation);
  const scale = Math.min(1, (rb.bottom - rb.top) / (2 * half.ey), period / (2 * half.ex));
  const ex = half.ex * scale;
  const ey = half.ey * scale;
  return {
    pivotX,
    pivotY,
    rotation,
    scale,
    dx: clampRange(pivotX, tile0 + ex, tile0 + period - ex) - pivotX,
    dy: clampRange(pivotY, rb.top + ey, rb.bottom - ey) - pivotY,
  };
}
