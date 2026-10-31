import { describe, expect, it } from "vitest";
import {
  CARTON_MM, MAX_OUTER_RADIUS_MM, cartonTapeSegments, rollGeometry, rollOuterRadiusMm, textureRepeat, toUnits,
} from "./geometry";
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

describe("carton tape segments", () => {
  it("covers top + front + back faces", () => {
    const segs = cartonTapeSegments(0);
    expect(segs.map((s) => s.name)).toEqual(["top", "front", "back"]);
    expect(segs[0].lengthMm).toBe(CARTON_MM.depth);
    expect(segs[0].position[1]).toBeCloseTo(toUnits(CARTON_MM.height) / 2);
    expect(segs[1].position[2]).toBeCloseTo(toUnits(CARTON_MM.depth) / 2);
    expect(segs[2].position[2]).toBeCloseTo(-toUnits(CARTON_MM.depth) / 2);
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
