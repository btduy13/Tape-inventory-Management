import { describe, expect, it } from "vitest";
import { Euler, Quaternion, Vector3 } from "three";
import {
  CARTON_MM, MAX_OUTER_RADIUS_MM, cartonTapeSegments, rollGeometry, rollOuterRadiusMm, textureOffset, textureRepeat, toUnits,
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
  it("is one continuous strip: back flap, top seam, front flap", () => {
    const segs = cartonTapeSegments(0);
    expect(segs.map((s) => s.name)).toEqual(["back", "top", "front"]);
    const top = segs[1];
    expect(top.lengthMm).toBe(CARTON_MM.depth);
    expect(top.position[1]).toBeCloseTo(toUnits(CARTON_MM.height) / 2);
    expect(segs[2].position[2]).toBeCloseTo(toUnits(CARTON_MM.depth) / 2);
    expect(segs[0].position[2]).toBeCloseTo(-toUnits(CARTON_MM.depth) / 2);
    // texture phase continues from one segment to the next
    for (let i = 1; i < segs.length; i++) expect(segs[i].startMm).toBe(segs[i - 1].startMm + segs[i - 1].lengthMm);
  });

  it("orients each plane so u follows the strip and the print is not mirrored", () => {
    const want: Record<string, { u: number[]; n: number[] }> = {
      back: { u: [0, 1, 0], n: [0, 0, -1] },
      top: { u: [0, 0, 1], n: [0, 1, 0] },
      front: { u: [0, -1, 0], n: [0, 0, 1] },
    };
    for (const seg of cartonTapeSegments()) {
      const q = new Quaternion().setFromEuler(new Euler(...seg.rotation));
      const u = new Vector3(1, 0, 0).applyQuaternion(q);
      const v = new Vector3(0, 1, 0).applyQuaternion(q);
      const n = new Vector3(0, 0, 1).applyQuaternion(q);
      expect(u.toArray().map((x) => Math.round(x) + 0)).toEqual(want[seg.name].u);
      expect(n.toArray().map((x) => Math.round(x) + 0)).toEqual(want[seg.name].n);
      // right-handed (u x v = outward normal) => text reads unmirrored from outside
      expect(new Vector3().crossVectors(u, v).dot(n)).toBeCloseTo(1);
    }
  });

  it("texture offset wraps and guards bad input", () => {
    expect(textureOffset(80, 300)).toBeCloseTo(80 / 300);
    expect(textureOffset(450, 300)).toBeCloseTo(0.5);
    expect(textureOffset(80, 0)).toBe(0);
    expect(textureOffset(Number.NaN, 300)).toBe(0);
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
