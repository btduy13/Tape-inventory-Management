// Tape strip ("ribbon") mesh data built from rows across the strip. Pure + unit-tested.
//
// Each row is a cross-section of the strip at `along` mm from its start. Points go from
// texture v=0 to v=1, i.e. along the side vector s = n x t (t = strip direction, n = outward
// normal). With u along t and v along s, (t, s, n) is right-handed, so the print reads
// unmirrored from outside. Two consecutive rows with the same `along` are a fold
// (duplicated vertices with different normals): no quad is emitted between them.

export type V3 = [number, number, number];
export type RibbonRow = { along: number; points: V3[]; normals: V3[] };
export type RibbonData = { positions: Float32Array; normals: Float32Array; uvs: Float32Array; indices: number[] };

export function buildRibbon(rows: RibbonRow[], periodMm: number): RibbonData {
  const cols = rows[0]?.points.length ?? 0;
  const period = periodMm > 0 ? periodMm : 1;
  const positions = new Float32Array(rows.length * cols * 3);
  const normals = new Float32Array(rows.length * cols * 3);
  const uvs = new Float32Array(rows.length * cols * 2);
  rows.forEach((row, i) => {
    for (let j = 0; j < cols; j++) {
      const k = i * cols + j;
      positions.set(row.points[j], k * 3);
      normals.set(row.normals[j], k * 3);
      uvs[k * 2] = row.along / period;
      uvs[k * 2 + 1] = cols > 1 ? j / (cols - 1) : 0;
    }
  });
  const indices: number[] = [];
  for (let i = 0; i + 1 < rows.length; i++) {
    if (rows[i + 1].along === rows[i].along) continue; // fold
    for (let j = 0; j + 1 < cols; j++) {
      const a = i * cols + j;
      const b = a + cols;
      const c = a + 1;
      const d = b + 1;
      // a->b follows t, a->c follows s: (a, b, c) faces along t x s = n (outwards)
      indices.push(a, b, c, b, d, c);
    }
  }
  return { positions, normals, uvs, indices };
}

/** Split a 2D polyline so no segment is longer than `maxStep`. */
export function subdivide(pts: [number, number][], maxStep: number): [number, number][] {
  if (pts.length < 2) return pts.slice();
  const out: [number, number][] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / Math.max(1e-6, maxStep)));
    for (let k = 1; k <= n; k++) out.push([x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n]);
  }
  return out;
}

/**
 * Orientation check used by the tests: every triangle faces along its vertex normals
 * (outwards) and its UV triangle is counter-clockwise (print not mirrored on the front face).
 */
export function ribbonOrientation(r: RibbonData): { outward: boolean; unmirrored: boolean } {
  let outward = true;
  let unmirrored = true;
  const p = (k: number, c: number) => r.positions[k * 3 + c];
  for (let i = 0; i < r.indices.length; i += 3) {
    const [a, b, c] = [r.indices[i], r.indices[i + 1], r.indices[i + 2]];
    const e1 = [0, 1, 2].map((x) => p(b, x) - p(a, x));
    const e2 = [0, 1, 2].map((x) => p(c, x) - p(a, x));
    const face = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const dot = face[0] * r.normals[a * 3] + face[1] * r.normals[a * 3 + 1] + face[2] * r.normals[a * 3 + 2];
    if (!(dot > 0)) outward = false;
    const du1 = r.uvs[b * 2] - r.uvs[a * 2];
    const dv1 = r.uvs[b * 2 + 1] - r.uvs[a * 2 + 1];
    const du2 = r.uvs[c * 2] - r.uvs[a * 2];
    const dv2 = r.uvs[c * 2 + 1] - r.uvs[a * 2 + 1];
    if (!(du1 * dv2 - dv1 * du2 > 0)) unmirrored = false;
  }
  return { outward, unmirrored };
}
