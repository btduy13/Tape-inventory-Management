// Bubble-tea / plastic cup profile (mm, y up from the cup base). Pure + unit-tested.

export const CUP_MM = {
  height: 150,
  baseRadius: 29,
  rimRadius: 45,
  lidHeight: 28,
  strawRadius: 5,
  strawTop: 215,
  /** Liquid fill level. */
  fill: 128,
} as const;

/** Sticker band never taller than this (keeps it on the straight wall). */
export const CUP_BAND_MAX_MM = 110;
/** Gap between cup wall and band so the band never z-fights the wall. */
const BAND_GAP_MM = 0.8;

/** Outer wall radius at height y (linear taper between base and rim). */
export function cupRadiusAt(yMm: number): number {
  const t = Math.min(1, Math.max(0, yMm / CUP_MM.height));
  return CUP_MM.baseRadius + (CUP_MM.rimRadius - CUP_MM.baseRadius) * t;
}

export type Pt = [number, number];

/** Lathe profile of the cup wall (open top, flat base, rolled rim). */
export function cupWallProfile(): Pt[] {
  const { height, baseRadius, rimRadius } = CUP_MM;
  return [
    [0.01, 0],
    [baseRadius - 2, 0],
    [baseRadius, 2],
    [rimRadius, height - 2],
    [rimRadius + 2, height],
    [rimRadius + 1, height + 1.5],
  ];
}

/** Lathe profile of the liquid inside the cup (slightly inset from the wall). */
export function cupLiquidProfile(inset = 1.5): Pt[] {
  const bottom = 3;
  const top = CUP_MM.fill;
  return [
    [0.01, bottom],
    [cupRadiusAt(bottom) - inset, bottom],
    [cupRadiusAt(top) - inset, top],
    [0.01, top],
  ];
}

/** Dome lid profile with a straw hole at the top. */
export function cupLidProfile(steps = 10): Pt[] {
  const { height, rimRadius, lidHeight, strawRadius } = CUP_MM;
  const base = height + 1;
  const pts: Pt[] = [[rimRadius + 2.5, base], [rimRadius + 1, base + 3]];
  const domeR = rimRadius - 1;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * (Math.PI / 2);
    const x = Math.max(strawRadius + 1, domeR * Math.cos(a));
    pts.push([x, base + 3 + (lidHeight - 3) * Math.sin(a)]);
  }
  return pts;
}

export type CupBand = { radiusTop: number; radiusBottom: number; heightMm: number; centerYMm: number; circumferenceMm: number };

/** Sticker band of the tape (width = tape width) wrapped around the middle of the wall. */
export function cupBand(tapeWidthMm: number): CupBand {
  const heightMm = Math.min(CUP_BAND_MAX_MM, Math.max(10, tapeWidthMm || 0));
  const centerYMm = CUP_MM.height * 0.48;
  const y0 = centerYMm - heightMm / 2;
  const y1 = centerYMm + heightMm / 2;
  const radiusBottom = cupRadiusAt(y0) + BAND_GAP_MM;
  const radiusTop = cupRadiusAt(y1) + BAND_GAP_MM;
  return { radiusTop, radiusBottom, heightMm, centerYMm, circumferenceMm: Math.PI * (radiusTop + radiusBottom) };
}

/** Half the total cup + lid + straw height: the group is shifted down by this to centre it. */
export const CUP_CENTER_Y_MM = CUP_MM.strawTop / 2;

/** Bounding-sphere radius (mm) of the centred cup. */
export function cupBoundingRadiusMm(): number {
  return Math.hypot(CUP_MM.rimRadius + 2.5, CUP_CENTER_Y_MM);
}
