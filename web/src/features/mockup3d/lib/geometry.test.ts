import { describe, expect, it } from "vitest";
import {
  CARTON_FLAP_MM, CARTON_MM, MAX_OUTER_RADIUS_MM, cartonLayout, cartonStripRows, rollGeometry, rollOuterRadiusMm, textureRepeat, toUnits,
} from "./geometry";
import { buildRibbon, ribbonOrientation, subdivide } from "./ribbon";
import { hasWebGL } from "./webgl";

describe("roll geometry", () => {
  it("computes outer radius from length x thickness", () => {
    // 100 m x 45 mic around a 44 mm core radius: sqrt(44^2 + 4500/pi) ~= 58.1 mm
    expect(rollOuterRadiusMm(100, 45, 44)).toBeCloseTo(Math.sqrt(44 ** 2 + 4500 / Math.PI), 6);
    expect(rollOuterRadiusMm(200, 50, 44)).toBeGreaterThan(rollOuterRadiusMm(100, 45, 44));
    expect(rollOuterRadiusMm(100000, 200, 44)).toBe(MAX_OUTER_RADIUS_MM);
    expect(rollOuterRadiusMm(-5, 45, 44)).toBe(44);
  });

  it("builds scene units for presets", () => {
    const g = rollGeometry({ width_mm: 72, length_m: 100, thickness_mic: 50 });
    expect(g.width).toBeCloseTo(0.72);
    expect(g.innerRadius).toBeCloseTo(0.38);
    expect(g.coreOuterRadius).toBeCloseTo(0.44);
    expect(g.outerRadius).toBeGreaterThan(g.coreOuterRadius);
    expect(g.circumferenceMm).toBeCloseTo(2 * Math.PI * g.outerRadius * 100);
  });

  it("texture repeat guards bad input", () => {
    expect(textureRepeat(600, 300)).toBe(2);
    expect(textureRepeat(600, 0)).toBe(1);
    expect(textureRepeat(0, 300)).toBe(1);
  });
});

describe("carton tape strip", () => {
  const rows = cartonStripRows(48, 0);
  const ribbon = buildRibbon(rows, 300);
  const { length, depth, height } = CARTON_MM;

  it("runs along the full length of the top and folds down both short ends", () => {
    const xs = rows.map((r) => r.points[0][0]);
    expect(Math.min(...xs)).toBeCloseTo(-length / 2);
    expect(Math.max(...xs)).toBeCloseTo(length / 2);
    const top = rows.filter((r) => r.normals[0][1] === 1);
    expect(top).toHaveLength(2);
    for (const r of top) expect(r.points[0][1]).toBeCloseTo(height / 2);
    expect(rows[0].points[0][1]).toBeCloseTo(height / 2 - CARTON_FLAP_MM);
    expect(rows.at(-1)!.points[0][1]).toBeCloseTo(height / 2 - CARTON_FLAP_MM);
    expect(rows.at(-1)!.along).toBe(2 * CARTON_FLAP_MM + length);
    // centred on the seam, width = tape width, never wider than the box
    expect(rows[2].points[0][2] + rows[2].points[1][2]).toBeCloseTo(0);
    expect(rows[2].points[0][2] - rows[2].points[1][2]).toBeCloseTo(48);
    const wide = cartonStripRows(9999, 0);
    expect(wide[2].points[0][2] - wide[2].points[1][2]).toBeCloseTo(depth);
  });

  it("sits just outside the box (gap avoids z-fighting)", () => {
    const r = cartonStripRows(48, 0.6);
    expect(r[2].points[0][1]).toBeCloseTo(height / 2 + 0.6);
    expect(r.at(-1)!.points[0][0]).toBeCloseTo(length / 2 + 0.6);
  });

  it("emits no quads across the folds (3 faces x 2 triangles)", () => {
    expect(ribbon.indices).toHaveLength(3 * 6);
  });

  it("u grows along the strip; faces point outwards and the print is not mirrored", () => {
    expect(ribbonOrientation(ribbon)).toEqual({ outward: true, unmirrored: true });
    expect(ribbon.uvs[ribbon.uvs.length - 2]).toBeCloseTo((2 * CARTON_FLAP_MM + length) / 300);
  });

  it("layout keeps box + roll inside the bounding sphere", () => {
    const preset = { width_mm: 48, length_m: 100, thickness_mic: 45 };
    const l = cartonLayout(preset);
    const R = rollGeometry(preset).outerRadius;
    expect(l.rollPosition[1] + R + l.offsetY).toBeLessThanOrEqual(l.radius);
    expect(l.floorY).toBeCloseTo(-toUnits(height) / 2 + l.offsetY);
    expect(l.rollPosition[0] - R).toBeGreaterThan(-toUnits(length) / 2);
    // roll rests on top of the box
    expect(l.rollPosition[1] - R).toBeGreaterThan(toUnits(height) / 2);
  });
});

describe("ribbon builder", () => {
  it("subdivides long segments", () => {
    const pts = subdivide([[0, 0], [0, 10]], 3);
    expect(pts).toHaveLength(5);
    expect(pts.at(-1)).toEqual([0, 10]);
  });

  it("maps u to distance / period and v across the columns", () => {
    const n: [number, number, number] = [0, 0, 1];
    const r = buildRibbon(
      [
        { along: 0, points: [[0, 0, 0], [0, 1, 0]], normals: [n, n] },
        { along: 20, points: [[20, 0, 0], [20, 1, 0]], normals: [n, n] },
      ],
      10,
    );
    expect(Array.from(r.uvs)).toEqual([0, 0, 0, 1, 2, 0, 2, 1]);
    expect(ribbonOrientation(r)).toEqual({ outward: true, unmirrored: true });
  });

  it("detects a mirrored layout", () => {
    const n: [number, number, number] = [0, 0, -1];
    const r = buildRibbon(
      [
        { along: 0, points: [[0, 0, 0], [0, 1, 0]], normals: [n, n] },
        { along: 1, points: [[1, 0, 0], [1, 1, 0]], normals: [n, n] },
      ],
      1,
    );
    expect(ribbonOrientation(r).outward).toBe(false);
  });
});

describe("hasWebGL", () => {
  it("detects support and failure", () => {
    expect(hasWebGL(() => ({ getContext: (id: string) => (id === "webgl" ? {} : null) }))).toBe(true);
    expect(hasWebGL(() => ({ getContext: () => null }))).toBe(false);
    expect(hasWebGL(() => null)).toBe(false);
    expect(
      hasWebGL(() => ({
        getContext: () => {
          throw new Error("blocked");
        },
      })),
    ).toBe(false);
  });
});
