// Repeating pattern layout on the tape strip. Pure geometry; text width is measured by the caller.
// Content always fits the strip length: it is scaled down (`fit`) when wider than the strip, and
// every element is clamped inside its tile horizontally.
//
// Patterns (DesignPattern). Every one tiles the 300mm strip seamlessly (the 3D roll repeats the
// strip texture), so tile counts / shifts always divide the strip length.
//   straight  one row, logo + text upright (the original layout)
//   flip      one row, every second tile turned 180° (reads from both sides of the box)
//   blocks    one row of full-height cells, every second cell filled with the text ink; logo and
//             text take turns (logo in the filled cell, printed in the tape colour)
//   brick     all-over: rows of half-size tiles, every second row shifted half a step
//   grid      all-over: aligned rows of half-size tiles
//   diagonal  all-over brick with every tile tilted DIAGONAL_ANGLE degrees
// All-over patterns bleed: rows continue past the tape edges (or the border lines) and are cut
// there, like wallpaper. One-row patterns stay inside the printable band.
// Positions stay in unrotated strip coordinates; a turned tile carries a `transform` (pivot +
// rotation + shift) that the renderer applies to its group, so drag maths is the same for all.
// The logo box is the footprint of the rotated logo (`logoRotation`); the image is drawn rotated
// around the box centre.
import type { DesignPattern } from "@/lib/types";
import { PRINT_MARGIN_RATIO, PX_PER_MM, STRIP_LENGTH_MM, TEXT_LINE_HEIGHT } from "./constants";

export type StripSize = { width: number; height: number };

/** Logical strip size in px: length along X, tape width along Y. */
export function stripSize(widthMm: number, lengthMm: number = STRIP_LENGTH_MM): StripSize {
  return { width: Math.round(lengthMm * PX_PER_MM), height: Math.round(widthMm * PX_PER_MM) };
}

export type PatternInput = {
  strip: StripSize;
  /** Text width measured at `fontSize` (widest line; 0 when there is no text). */
  textWidth: number;
  /** Number of text lines (default 1). */
  textLines?: number;
  /** Requested font size in logical px (text box height). Defaults to the printable band height. */
  fontSize?: number;
  /** Logo natural aspect ratio (w/h), or null when no logo. */
  logoAspect: number | null;
  logoScale: number;
  logoOffsetX: number;
  logoOffsetY: number;
  /** Logo rotation, degrees (clockwise, Konva convention). */
  logoRotation?: number;
  textOffsetX?: number;
  textOffsetY?: number;
  repeatGapPx: number;
  pattern?: DesignPattern;
  /** Thickness of each top / bottom border line in px (0: no border). */
  borderPx?: number;
};

export type Box = { x: number; y: number; width: number; height: number };
export type Offset = { x: number; y: number };
export type Band = { top: number; bottom: number };
/** Group transform of a turned tile: scale and rotate `rotation`° around (pivotX, pivotY), then
 *  shift (dx, dy). `scale` < 1 only when a tilted tile would not fit its tile / row band. */
export type TileTransform = { pivotX: number; pivotY: number; rotation: number; scale: number; dx: number; dy: number };
export type PatternTile = {
  logo: Box | null;
  text: Box | null;
  textX: number | null;
  /** 0 = the centre row; all-over patterns add rows above (negative) and below (positive). */
  row: number;
  /** Wrap-around copy that completes a tile cut by the strip end: drawn, never interactive. */
  ghost: boolean;
  transform: TileTransform | null;
  /** Cell of the tile (full printable height); `fill` cells are printed solid in the text ink. */
  cell: Box;
  fill: boolean;
  /** Unclamped element positions (before offsets), for effective-offset maths. */
  base: { logo: Offset | null; text: Offset | null };
};

export type PatternLayout = {
  pattern: DesignPattern;
  /** True for all-over patterns: content bleeds past the edges and is clipped to `clip`. */
  bleed: boolean;
  /** Distance between tile starts. strip.width / count, so the strip wraps seamlessly. */
  period: number;
  count: number;
  tiles: PatternTile[];
  /** Natural (unrotated) logo size after `fit`; tile logo boxes are its rotated footprint. */
  logoSize: { width: number; height: number } | null;
  logoRotation: number;
  /** Down-scale applied so one tile fits the strip (1 = no shrink). */
  fit: number;
  /** Rendered font size (one line) after `fit`. */
  fontSize: number;
  /** Text box height / font size: 1 for one line, lines x TEXT_LINE_HEIGHT for more. */
  textHeightRatio: number;
  /** Requested-to-rendered font ratio before `fit` (1/2 for all-over patterns). */
  fontScale: number;
  /** Size unit (px) for logo size and offsets: the strip height (halved for all-over patterns). */
  unit: number;
  /** Printable band (y range) for one-row content: inside the border lines and the edge margin. */
  band: Band;
  /** Area inside the border lines; everything except the borders is clipped to it. */
  clip: Band;
  borderPx: number;
  /** Offsets actually applied after clamping (fraction of `unit`), for drag / nudge maths. */
  effective: { logo: Offset | null; text: Offset | null };
};

/** Fraction of the unit a logo at scale 1 occupies. */
export const LOGO_HEIGHT_RATIO = 0.7;
/** Tilt of the diagonal pattern, degrees (negative: text rises to the right). */
export const DIAGONAL_ANGLE = -15;
/** One tile (content) may use at most this share of the strip length. */
const MAX_CONTENT_SHARE = 0.95;
/** All-over row pitch = tile height x this. Shifted rows interlock, so they can sit closer; tilted
 *  tiles leave their bounding-box corners empty, so they sit closer still. */
const ROW_PITCH = { grid: 1.25, brick: 1.1, diagonal: 0.9 } as const;

type PatternSpec = {
  allOver: boolean;
  stagger: boolean;
  flip: boolean;
  blocks: boolean;
  angle: number;
  minTiles: 1 | 2;
};
const SPECS: Record<DesignPattern, PatternSpec> = {
  straight: { allOver: false, stagger: false, flip: false, blocks: false, angle: 0, minTiles: 1 },
  flip: { allOver: false, stagger: false, flip: true, blocks: false, angle: 0, minTiles: 2 },
  blocks: { allOver: false, stagger: false, flip: false, blocks: true, angle: 0, minTiles: 2 },
  brick: { allOver: true, stagger: true, flip: false, blocks: false, angle: 0, minTiles: 1 },
  grid: { allOver: true, stagger: false, flip: false, blocks: false, angle: 0, minTiles: 1 },
  diagonal: { allOver: true, stagger: true, flip: false, blocks: false, angle: DIAGONAL_ANGLE, minTiles: 1 },
};

/** Text box height as a multiple of the font size for `lines` lines. */
export const textBoxRatio = (lines: number): number => (lines <= 1 ? 1 : lines * TEXT_LINE_HEIGHT);

/** All-over patterns print half-size tiles in many rows (the font / logo halve). */
export const isAllOverPattern = (p: DesignPattern): boolean => SPECS[p]?.allOver ?? false;

/** Printable band: inside the border lines, then the unprinted edge margin. */
export function printBand(strip: StripSize, borderPx = 0): Band {
  const m = strip.height * PRINT_MARGIN_RATIO + Math.max(0, borderPx);
  return { top: m, bottom: strip.height - m };
}

const clampRange = (v: number, lo: number, hi: number) => (hi < lo ? lo : Math.min(hi, Math.max(lo, v)));

/** Half extents of a w x h box rotated by `deg`. */
export function rotatedHalf(w: number, h: number, deg: number): { ex: number; ey: number } {
  const r = (deg * Math.PI) / 180;
  const c = Math.abs(Math.cos(r));
  const s = Math.abs(Math.sin(r));
  return { ex: (w * c + h * s) / 2, ey: (w * s + h * c) / 2 };
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

type Row = { index: number; cy: number; lo: number; hi: number; shift: number };

export function computePatternLayout(input: PatternInput): PatternLayout {
  const { strip, textWidth, logoAspect } = input;
  const pattern: DesignPattern = input.pattern && input.pattern in SPECS ? input.pattern : "straight";
  const spec = SPECS[pattern];
  const h = strip.height;
  const borderPx = Math.max(0, Math.min(input.borderPx ?? 0, h / 4));
  const band = printBand(strip, borderPx);
  const clip = { top: borderPx, bottom: h - borderPx };
  const bandH = band.bottom - band.top;
  const unit = spec.allOver ? h / 2 : h;
  const fontScale = spec.allOver ? 0.5 : 1;
  const cap = spec.allOver ? bandH / 2 : bandH; // tallest element
  const logoRotation = Number.isFinite(input.logoRotation) ? (input.logoRotation as number) : 0;

  const hasText = textWidth > 0;
  const lines = Math.max(1, Math.round(input.textLines ?? 1));
  const textHeightRatio = textBoxRatio(lines);
  const requestedFont = input.fontSize ?? bandH / textHeightRatio;
  const rawFont = Math.min(requestedFont * fontScale, cap / textHeightRatio);
  // `textWidth` was measured at the requested size: scale it with the font actually used.
  const rawTextW = hasText && requestedFont > 0 ? textWidth * (rawFont / requestedFont) : 0;

  // Logo: natural size, then shrink so the rotated footprint fits the element cap.
  let nh = logoAspect && logoAspect > 0 ? Math.min(unit * LOGO_HEIGHT_RATIO * input.logoScale, cap) : 0;
  let nw = nh * (logoAspect ?? 0);
  if (nh > 0) {
    const k = Math.min(1, cap / (2 * rotatedHalf(nw, nh, logoRotation).ey));
    nh *= k;
    nw *= k;
  }
  const hasLogo = nh > 0;
  const foot = hasLogo ? rotatedHalf(nw, nh, logoRotation) : { ex: 0, ey: 0 };
  const rawLogoW = 2 * foot.ex;
  const rawLogoH = 2 * foot.ey;

  const base = { pattern, bleed: spec.allOver, fontScale, textHeightRatio, unit, band, clip, borderPx, logoRotation };
  const empty = { tiles: [], logoSize: null, fit: 1, fontSize: rawFont, effective: { logo: null, text: null } };
  if (!hasText && !hasLogo) return { ...base, period: strip.width, count: 0, ...empty };

  // Colour blocks hold one element per cell when there are both; the others hold logo + text.
  const split = spec.blocks && hasText && hasLogo;
  const rawGap = hasText && hasLogo && !split ? unit * 0.15 : 0;
  const rawContent = split ? Math.max(rawLogoW, rawTextW) : rawLogoW + rawGap + rawTextW;
  const rawHeight = Math.max(rawLogoH, hasText ? rawFont * textHeightRatio : 0);
  const turned = rotatedHalf(rawContent, rawHeight, spec.angle);
  const fitW = (strip.width * MAX_CONTENT_SHARE) / spec.minTiles / (2 * turned.ex);
  const fit = Math.min(1, fitW);

  const logoSize = hasLogo ? { width: nw * fit, height: nh * fit } : null;
  const lw = rawLogoW * fit;
  const lh = rawLogoH * fit;
  const textW = rawTextW * fit;
  const fontSize = rawFont * fit;
  const textH = fontSize * textHeightRatio;
  const gap = rawGap * fit;

  const tileWidth = 2 * turned.ex * fit + Math.max(0, input.repeatGapPx);
  let count = Math.max(spec.minTiles, Math.floor(strip.width / Math.max(1, tileWidth)));
  if (spec.minTiles === 2 && count % 2 === 1) count -= 1; // alternating pairs must wrap seamlessly
  const period = strip.width / count;

  const rows: Row[] = [];
  if (!spec.allOver) {
    rows.push({ index: 0, cy: (band.top + band.bottom) / 2, lo: band.top, hi: band.bottom, shift: 0 });
  } else {
    const ratio = pattern === "diagonal" ? ROW_PITCH.diagonal : spec.stagger ? ROW_PITCH.brick : ROW_PITCH.grid;
    const pitch = Math.max(1, 2 * turned.ey * fit * ratio);
    const mid = h / 2;
    const reach = Math.ceil((mid - clip.top + pitch / 2) / pitch);
    for (const k of [0, ...Array.from({ length: reach }, (_, j) => [-(j + 1), j + 1]).flat()]) {
      const cy = mid + k * pitch;
      if (cy + pitch / 2 <= clip.top || cy - pitch / 2 >= clip.bottom) continue;
      rows.push({ index: k, cy, lo: cy - pitch / 2, hi: cy + pitch / 2, shift: spec.stagger && k % 2 !== 0 ? period / 2 : 0 });
    }
  }

  const tiles: PatternTile[] = [];
  const ghosts: PatternTile[] = [];
  for (const r of rows) {
    const place = (tile0: number, x: number, w: number, bh: number, ox: number, oy: number): Box => ({
      x: clampRange(x + ox * unit, tile0, tile0 + period - w),
      y: clampRange(r.cy - bh / 2 + oy * unit, r.lo, r.hi - bh),
      width: w,
      height: bh,
    });
    // A shifted row has one tile cut by the strip end: its wrap-around copy starts before 0.
    for (let i = r.shift > 0 ? -1 : 0; i < count; i++) {
      const tile0 = i * period + r.shift;
      const even = i % 2 === 0;
      const showLogo = hasLogo && (!split || even);
      const showText = hasText && (!split || !even);
      const w = (showLogo ? lw : 0) + (showLogo && showText ? gap : 0) + (showText ? textW : 0);
      const start = tile0 + (period - w) / 2;
      const logoBase = showLogo ? { x: start, y: r.cy - lh / 2 } : null;
      const textBase = showText ? { x: start + (showLogo ? lw + gap : 0), y: r.cy - textH / 2 } : null;
      const logo = logoBase ? place(tile0, logoBase.x, lw, lh, input.logoOffsetX, input.logoOffsetY) : null;
      const text = textBase ? place(tile0, textBase.x, textW, textH, input.textOffsetX ?? 0, input.textOffsetY ?? 0) : null;
      const rotation = spec.flip && !even ? 180 : spec.angle;
      const tile: PatternTile = {
        logo,
        text,
        textX: text ? text.x : null,
        row: r.index,
        ghost: i < 0,
        transform: rotation !== 0 ? tileTransform({ logo, text }, rotation, tile0, period, spec.allOver ? null : r) : null,
        cell: { x: tile0, y: clip.top, width: period, height: clip.bottom - clip.top },
        fill: spec.blocks && even,
        base: { logo: logoBase, text: textBase },
      };
      (tile.ghost ? ghosts : tiles).push(tile);
    }
  }
  tiles.push(...ghosts);

  // Effective offsets: from the first centre-row tile that shows the element (same for all tiles).
  const effectiveOf = (kind: "logo" | "text"): Offset | null => {
    const t = tiles.find((x) => x.row === 0 && !x.ghost && x[kind] && x.base[kind]);
    const box = t?.[kind];
    const b = t?.base[kind];
    return box && b ? { x: (box.x - b.x) / unit, y: (box.y - b.y) / unit } : null;
  };
  const effective = { logo: effectiveOf("logo"), text: effectiveOf("text") };
  return { ...base, period, count, tiles, logoSize, fit, fontSize, effective };
}

/** Pivot at the content centre; shrink / shift so the turned content stays inside its tile (and,
 *  for one-row patterns, inside the row band; all-over rows bleed instead). */
function tileTransform(
  t: Pick<PatternTile, "logo" | "text">,
  rotation: number,
  tile0: number,
  period: number,
  row: Pick<Row, "lo" | "hi"> | null,
): TileTransform | null {
  const u = union(t);
  if (!u) return null;
  const pivotX = u.x + u.width / 2;
  const pivotY = u.y + u.height / 2;
  const half = rotatedHalf(u.width, u.height, rotation);
  const scale = Math.min(1, period / (2 * half.ex), row ? (row.hi - row.lo) / (2 * half.ey) : 1);
  const ex = half.ex * scale;
  const ey = half.ey * scale;
  return {
    pivotX,
    pivotY,
    rotation,
    scale,
    dx: clampRange(pivotX, tile0 + ex, tile0 + period - ex) - pivotX,
    dy: row ? clampRange(pivotY, row.lo + ey, row.hi - ey) - pivotY : 0,
  };
}
