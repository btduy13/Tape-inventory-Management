// Paper drink cup + black lid profiles (mm, y up from the cup base) and the vertical seal
// strip that runs over the lid and down the tapered wall. Pure + unit-tested.
import { buildRibbon, subdivide, type RibbonData, type RibbonRow, type V3 } from "./ribbon";

export const CUP_MM = {
  height: 150,
  baseRadius: 33,
  rimRadius: 46,
  /** Lid top above the cup rim. */
  lidHeight: 17,
  /** Where the seal strip ends on the wall (from the base). */
  stripStart: 42,
} as const;

/** Seal strip width as a share of the tape width (labels are narrower than carton tape). */
export const CUP_STRIP_SCALE = 0.5;
export const CUP_STRIP_MIN_MM = 10;
export const CUP_STRIP_MAX_MM = 36;
/** Gap between cup/lid and strip so the strip never z-fights the surface. */
const STRIP_GAP_MM = 0.5;

export type Pt = [number, number];

/** Outer wall radius at height y (linear taper between base and rim). */
export function cupRadiusAt(yMm: number): number {
  const t = Math.min(1, Math.max(0, yMm / CUP_MM.height));
  return CUP_MM.baseRadius + (CUP_MM.rimRadius - CUP_MM.baseRadius) * t;
}

/** Lathe profile of the white paper wall (flat base, rolled rim hidden by the lid). */
export function cupWallProfile(): Pt[] {
  const { height, baseRadius, rimRadius } = CUP_MM;
  return [
    [0.01, 0],
    [baseRadius - 1.5, 0],
    [baseRadius, 1.5],
    [rimRadius, height - 1],
    [rimRadius + 1.5, height],
    [rimRadius + 1, height + 1.5],
  ];
}

/** Outer surface of the lid: skirt over the rim, shoulder, raised ring, flat dome to the centre. */
export function cupLidOutline(): Pt[] {
  const { height: h, rimRadius: R, lidHeight } = CUP_MM;
  return [
    [R + 3, h - 6],
    [R + 3.5, h + 5],
    [R + 1, h + 8],
    [R - 4, h + 9],
    [R - 6, h + 14],
    [R - 9, h + lidHeight - 2],
    [R - 20, h + lidHeight - 0.5],
    [0.01, h + lidHeight],
  ];
}

/** Lathe profile of the lid (outline plus a thin lip under the skirt). */
export function cupLidProfile(): Pt[] {
  const { height: h, rimRadius: R } = CUP_MM;
  return [[R + 0.8, h - 6], ...cupLidOutline()];
}

/** Strip width (mm) for a tape width preset: proportional, clamped to the cup. */
export function cupStripWidthMm(tapeWidthMm: number): number {
  const w = (Number.isFinite(tapeWidthMm) ? tapeWidthMm : 0) * CUP_STRIP_SCALE;
  return Math.min(CUP_STRIP_MAX_MM, Math.max(CUP_STRIP_MIN_MM, w));
}

export type ProfilePoint = { r: number; y: number; nr: number; ny: number; along: number };

/**
 * Centre line of the strip in the (radius, y) profile plane, from `stripStart` on the wall
 * up the taper, over the lid skirt and onto the lid top, stopping before the strip edges
 * would cross the axis. Offset outwards by the gap; `along` is the arc length in mm.
 */
export function cupStripPath(stripWidthMm: number, gap = STRIP_GAP_MM, step = 3): ProfilePoint[] {
  const { height: h, stripStart } = CUP_MM;
  const wallTop = h - 6;
  const raw = subdivide(
    [[cupRadiusAt(stripStart), stripStart], [cupRadiusAt(wallTop), wallTop], ...cupLidOutline()],
    step,
  ).filter(([r]) => r >= stripWidthMm / 2 + 3);
  // Outward normal of a path going "up and over": (dy, -dr), averaged at the vertices.
  const segN = raw.slice(1).map(([r1, y1], i) => {
    const [r0, y0] = raw[i];
    const len = Math.hypot(r1 - r0, y1 - y0) || 1;
    return [(y1 - y0) / len, -(r1 - r0) / len] as Pt;
  });
  let along = 0;
  return raw.map(([r, y], i) => {
    const a = segN[Math.max(0, i - 1)];
    const b = segN[Math.min(segN.length - 1, i)];
    const l = Math.hypot(a[0] + b[0], a[1] + b[1]) || 1;
    const nr = (a[0] + b[0]) / l;
    const ny = (a[1] + b[1]) / l;
    if (i > 0) along += Math.hypot(r - raw[i - 1][0], y - raw[i - 1][1]);
    return { r: r + nr * gap, y: y + ny * gap, nr, ny, along };
  });
}

/**
 * Rows of the strip facing +z. Across the width each point keeps the profile radius
 * (x = lateral offset, z = sqrt(r^2 - x^2)), so the strip hugs the round wall instead
 * of floating as a flat plane. Side vector s = n x t = -x, so v=0 sits at +x.
 */
export function cupStripRows(stripWidthMm: number, cols = 9): RibbonRow[] {
  const half = stripWidthMm / 2;
  return cupStripPath(stripWidthMm).map(({ r, y, nr, ny, along }) => {
    const points: V3[] = [];
    const normals: V3[] = [];
    for (let j = 0; j < cols; j++) {
      const x = half - (stripWidthMm * j) / (cols - 1);
      const z = Math.sqrt(Math.max(0, r * r - x * x));
      points.push([x, y, z]);
      normals.push([(nr * x) / r, ny, (nr * z) / r]);
    }
    return { along, points, normals };
  });
}

/** Mesh data of the seal strip; the print keeps its aspect (period scales with the width). */
export function cupStripRibbon(tapeWidthMm: number, stripLengthMm: number): RibbonData {
  const width = cupStripWidthMm(tapeWidthMm);
  const scale = tapeWidthMm > 0 ? width / tapeWidthMm : 1;
  return buildRibbon(cupStripRows(width), (stripLengthMm > 0 ? stripLengthMm : 300) * scale);
}

/** Half the total cup + lid height: the group is shifted down by this to centre it. */
export const CUP_CENTER_Y_MM = (CUP_MM.height + CUP_MM.lidHeight) / 2;

/** Bounding-sphere radius (mm) of the centred cup. */
export function cupBoundingRadiusMm(): number {
  return Math.hypot(CUP_MM.rimRadius + 4, CUP_CENTER_Y_MM);
}
