// Paper drink cup + black lid profiles (mm, y up from the cup base) and the tamper-seal strip:
// ONE continuous strip from the front wall, up over the lid skirt, across the lid top through
// the centre and down the back wall. The strip is built from the same lathe profile as the
// cup + lid, so it always hugs the geometry. Pure + unit-tested.
import { buildRibbon, subdivide, type RibbonData, type RibbonRow, type V3 } from "./ribbon";

export const CUP_MM = {
  height: 150,
  baseRadius: 33,
  rimRadius: 46,
  /** Lid top above the cup rim. */
  lidHeight: 13,
  /** Lid skirt reaches this far below the cup rim. */
  skirtDepth: 6,
  /** Lid skirt outer radius beyond the cup rim. */
  skirtOut: 2.5,
  /** Where the seal strip ends on the wall (from the base), on both sides. */
  stripStart: 42,
} as const;

/** Seal strip width as a share of the tape width (labels are narrower than carton tape). */
export const CUP_STRIP_SCALE = 0.5;
export const CUP_STRIP_MIN_MM = 10;
export const CUP_STRIP_MAX_MM = 36;
/** Gap between cup/lid and strip so the strip never z-fights the surface. */
export const STRIP_GAP_MM = 0.4;

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
    [cupRadiusAt(1.5), 1.5],
    [cupRadiusAt(height - 1), height - 1],
    [rimRadius + 1.5, height],
    [rimRadius + 1, height + 1.5],
  ];
}

/**
 * Outer surface of the lid from the skirt bottom to the centre of the top: skirt, rolled bead,
 * shoulder and a low dome. Convex (the direction only ever turns towards the axis), so a
 * tensioned strip touches it everywhere.
 */
export function cupLidOutline(): Pt[] {
  const { height: h, rimRadius: R, lidHeight, skirtDepth, skirtOut } = CUP_MM;
  const S = R + skirtOut;
  return [
    [S, h - skirtDepth],
    [S + 0.5, h + 2],
    [S - 0.5, h + 5],
    [R - 0.5, h + 6.8],
    [R - 4, h + 8.5],
    [R - 7, h + 9.8],
    [R - 14, h + 11.6],
    [R - 30, h + lidHeight - 0.3],
    [0, h + lidHeight],
  ];
}

/** Lathe profile of the lid (thin lip under the skirt plus the outline, nudged off the axis). */
export function cupLidProfile(): Pt[] {
  const { height: h, rimRadius: R, skirtDepth } = CUP_MM;
  const outline = cupLidOutline().map(([r, y]): Pt => [Math.max(0.01, r), y]);
  return [[R + 0.8, h - skirtDepth], ...outline];
}

/** Strip width (mm) for a tape width preset: proportional, clamped to the cup. */
export function cupStripWidthMm(tapeWidthMm: number): number {
  const w = (Number.isFinite(tapeWidthMm) ? tapeWidthMm : 0) * CUP_STRIP_SCALE;
  return Math.min(CUP_STRIP_MAX_MM, Math.max(CUP_STRIP_MIN_MM, w));
}

/**
 * Surface the strip lies on, in the (radius, y) half plane from `fromY` on the wall to the
 * lid centre: wall taper, a short 45 degree bridge from the wall out to the skirt bottom edge
 * (tape cannot follow the undercut), then the lid outline.
 */
export function cupStripSurface(fromY: number = CUP_MM.stripStart): Pt[] {
  const outline = cupLidOutline();
  const [skirtR, skirtY] = outline[0];
  const rampY = skirtY - (skirtR - cupRadiusAt(skirtY));
  return [[cupRadiusAt(fromY), fromY], [cupRadiusAt(rampY), rampY], ...outline];
}

export type ProfilePoint = { r: number; y: number; nr: number; ny: number };

/** Offset a profile polyline outwards by `gap` (averaged vertex normals; axis point stays on the axis). */
function offsetProfile(raw: Pt[], gap: number): ProfilePoint[] {
  // Outward normal of a path going "up and over": (dy, -dr).
  const segN = raw.slice(1).map(([r1, y1], i): Pt => {
    const [r0, y0] = raw[i];
    const len = Math.hypot(r1 - r0, y1 - y0) || 1;
    return [(y1 - y0) / len, -(r1 - r0) / len];
  });
  return raw.map(([r, y], i) => {
    const a = segN[Math.max(0, i - 1)];
    const b = segN[Math.min(segN.length - 1, i)];
    const l = Math.hypot(a[0] + b[0], a[1] + b[1]) || 1;
    const nr = (a[0] + b[0]) / l;
    const ny = (a[1] + b[1]) / l;
    return { r: r <= 1e-9 ? 0 : r + nr * gap, y: y + ny * gap, nr, ny };
  });
}

export type StripCentre = ProfilePoint & { side: 1 | -1; along: number };

/**
 * Centre line of the seal strip: front wall (+z) up to the lid centre, then mirrored down the
 * back (-z). `along` is the arc length in mm (strictly increasing, continuous over the top).
 */
export function cupStripPath(gap = STRIP_GAP_MM, step = 2): StripCentre[] {
  const half = offsetProfile(subdivide(cupStripSurface(), step), gap);
  const front = half.map((p) => ({ ...p, side: 1 as const }));
  const back = half
    .slice(0, -1)
    .reverse()
    .map((p) => ({ ...p, side: -1 as const }));
  let along = 0;
  return [...front, ...back].map((p, i, all) => {
    if (i > 0) {
      const q = all[i - 1];
      along += Math.hypot(p.r * p.side - q.r * q.side, p.y - q.y);
    }
    return { ...p, along };
  });
}

/** Ray-casting point-in-polygon test in the (radius, y) plane. */
function inside(poly: Pt[], r: number, y: number): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ri, yi] = poly[i];
    const [rj, yj] = poly[j];
    if (yi > y !== yj > y && r < ((rj - ri) * (y - yi)) / (yj - yi) + ri) hit = !hit;
  }
  return hit;
}

/** Closed (radius, y) polygon of the offset solid the strip wraps (wall from the base, lid, axis). */
function stripSolid(gap: number): Pt[] {
  const surface = offsetProfile(subdivide(cupStripSurface(0), 2), gap).map((p): Pt => [p.r, p.y]);
  return [[0, -1], [surface[0][0], -1], ...surface];
}

/**
 * Rows of the strip. Each row starts at its centre-line point; a point `x` mm to the side is
 * pushed inwards along the centre-line normal until it lands on the (offset) surface, so the
 * strip wraps the round wall, the skirt and the domed top alike. Side vector s = n x t = -x on
 * every face (front going up, top going back, back going down), so v=0 sits at +x and the print
 * reads unmirrored from outside on both sides.
 */
export function cupStripRows(stripWidthMm: number, cols = 9, gap = STRIP_GAP_MM): RibbonRow[] {
  const half = stripWidthMm / 2;
  const solid = stripSolid(gap);
  return cupStripPath(gap).map(({ r, y, nr, ny, side, along }) => {
    const points: V3[] = [];
    const normals: V3[] = [];
    for (let j = 0; j < cols; j++) {
      const x = half - (stripWidthMm * j) / (cols - 1);
      const at = (d: number): V3 => [x, y - d * ny, side * (r - d * nr)];
      const isIn = (d: number) => {
        const [px, py, pz] = at(d);
        return inside(solid, Math.hypot(px, pz), py);
      };
      let lo = 0;
      let hi = Math.abs(x) + 1;
      if (x !== 0 && !isIn(lo)) {
        for (let k = 0; k < 40; k++) {
          const mid = (lo + hi) / 2;
          if (isIn(mid)) hi = mid;
          else lo = mid;
        }
      }
      const p = at(x === 0 ? 0 : lo);
      const rho = Math.hypot(p[0], p[2]);
      points.push(p);
      normals.push(rho > 1e-6 ? [(nr * p[0]) / rho, ny, (nr * p[2]) / rho] : [0, ny, side * nr]);
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
  return Math.hypot(CUP_MM.rimRadius + CUP_MM.skirtOut + 1.5, CUP_CENTER_Y_MM);
}
