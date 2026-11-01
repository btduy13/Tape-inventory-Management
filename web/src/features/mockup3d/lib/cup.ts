// Paper drink cup + black lid profiles (mm, y up from the cup base) and the tamper-seal strip:
// ONE continuous strip from the front wall, up over the lid skirt, across the lid top through
// the centre and down the back wall. The strip is built from the same lathe profile as the
// cup + lid, so it always hugs the geometry. Pure + unit-tested.
import { buildRibbon, subdivide, type RibbonData, type RibbonRow, type V3 } from "./ribbon";

/**
 * Real 500 ml (16 oz) milk-tea paper cup: top Ø90 mm, bottom Ø60 mm, height 150 mm,
 * domed lid ~12 mm above the rim. Same mm system as the roll and the carton (true scale).
 */
export const CUP_MM = {
  height: 150,
  baseRadius: 30,
  rimRadius: 45,
  /** Lid top above the cup rim. */
  lidHeight: 12,
  /** Lid skirt reaches this far below the cup rim. */
  skirtDepth: 6,
  /** Lid skirt outer radius beyond the cup rim. */
  skirtOut: 2.5,
  /** Where the seal strip ends on the wall (from the base), on both sides. */
  stripStart: 42,
} as const;

/**
 * Seal strip width = the REAL tape width (true scale), capped at 60 mm. Where the strip ends on
 * the wall the cup is only Ø68 mm (radius 34 mm at `stripStart`): a strip wider than the wall
 * diameter cannot wrap it at all, and at 60 mm it already wraps ~100 degrees of the wall.
 * Wider tape (72 / 75 / 80 mm) is shown at 60 mm and the viewer says so.
 */
export const CUP_STRIP_MAX_MM = 60;
export const CUP_STRIP_MIN_MM = 5;
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
    [R - 14, h + lidHeight - 1.1],
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

/** Strip width (mm) on the cup: the real tape width, capped to what can wrap the cup. */
export function cupStripWidthMm(tapeWidthMm: number): number {
  const w = Number.isFinite(tapeWidthMm) ? tapeWidthMm : 0;
  return Math.min(CUP_STRIP_MAX_MM, Math.max(CUP_STRIP_MIN_MM, w));
}

/** True when the tape is wider than the cup can take (shown narrower than real). */
export function cupStripCapped(tapeWidthMm: number): boolean {
  return Number.isFinite(tapeWidthMm) && tapeWidthMm > CUP_STRIP_MAX_MM;
}

/** Odd column count (centre column on the centre line), ~4 mm apart so wide strips stay round. */
export function cupStripCols(stripWidthMm: number): number {
  return Math.max(9, 2 * Math.ceil(Math.max(0, stripWidthMm) / 8) + 1);
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

/**
 * Section of the (offset) strip surface by the plane X = x: a polyline in the (z, y) plane from
 * the front wall, over the lid, down the back wall. Monotonic, so columns built on it never fold.
 */
function columnSection(x: number, gap: number): Pt[] {
  const half = offsetProfile(subdivide(cupStripSurface(), 1), gap);
  const ax = Math.abs(x);
  const front: Pt[] = [];
  for (let i = 0; i < half.length; i++) {
    const { r, y } = half[i];
    if (r > ax) {
      front.push([Math.sqrt(r * r - ax * ax), y]);
      continue;
    }
    // the plane leaves the lid here: close the section on the plane's own apex (z = 0)
    const prev = half[i - 1];
    const t = prev ? (prev.r - ax) / (prev.r - r || 1) : 0;
    front.push([0, prev ? prev.y + (y - prev.y) * t : y]);
    break;
  }
  const back = front.slice(0, -1).reverse().map(([z, y]): Pt => [-z, y]);
  return [...front, ...back];
}

/** Nearest point on a polyline to `q`, searching forward from segment `from` (keeps order). */
function nearestOnPolyline(poly: Pt[], q: Pt, from: number): { seg: number; t: number; p: Pt } {
  let best = { seg: from, t: 0, p: poly[from], d: Infinity };
  for (let i = from; i + 1 < poly.length; i++) {
    const [z0, y0] = poly[i];
    const [z1, y1] = poly[i + 1];
    const dz = z1 - z0, dy = y1 - y0;
    const t = Math.max(0, Math.min(1, ((q[0] - z0) * dz + (q[1] - y0) * dy) / (dz * dz + dy * dy || 1)));
    const p: Pt = [z0 + t * dz, y0 + t * dy];
    const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
    if (d < best.d) best = { seg: i, t, p, d };
  }
  return best;
}

/**
 * Rows of the strip. A column `x` mm to the side of the centre line runs on the section of the
 * cup + lid surface by the plane X = x; each row takes the point of that section nearest to the
 * row's centre-line point (forward only, so rows never cross even on the concave wall-to-skirt
 * bridge). The strip thus wraps the round wall, the skirt and the domed top at its real width.
 * Side vector s = n x t = -x on every face (front going up, top going back, back going down),
 * so v=0 sits at +x and the print reads unmirrored from outside on both sides.
 */
export function cupStripRows(stripWidthMm: number, cols = cupStripCols(stripWidthMm), gap = STRIP_GAP_MM): RibbonRow[] {
  const half = stripWidthMm / 2;
  const path = cupStripPath(gap);
  const xs = Array.from({ length: cols }, (_, j) => (cols > 1 ? half - (stripWidthMm * j) / (cols - 1) : 0));
  const sections = xs.map((x) => (x === 0 ? null : columnSection(x, gap)));
  const cursor = xs.map(() => 0);
  const lastKey = xs.map(() => -Infinity);
  return path.map(({ r, y, nr, ny, side, along }) => {
    const points: V3[] = [];
    const normals: V3[] = [];
    xs.forEach((x, j) => {
      const sec = sections[j];
      let p: V3 = [x, y, side * r];
      if (sec) {
        const hit = nearestOnPolyline(sec, [side * r, y], cursor[j]);
        // strictly forward along the column (tiny step if the nearest point did not move)
        const key = hit.seg + hit.t;
        const k = key > lastKey[j] ? key : lastKey[j] + 1e-3;
        const seg = Math.min(sec.length - 2, Math.floor(k));
        const t = Math.min(1, k - seg);
        cursor[j] = seg;
        lastKey[j] = k;
        const [z0, y0] = sec[seg];
        const [z1, y1] = sec[seg + 1];
        p = [x, y0 + (y1 - y0) * t, z0 + (z1 - z0) * t];
      }
      const rho = Math.hypot(p[0], p[2]);
      points.push(p);
      normals.push(rho > 1e-6 ? [(nr * p[0]) / rho, ny, (nr * p[2]) / rho] : [0, ny, side * nr]);
    });
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
