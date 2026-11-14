import { describe, expect, it } from "vitest";
import { borderAllowed, borderPx, borderShapes, maxBorderMm } from "./border";
import { stripSize } from "./pattern";

describe("border limits", () => {
  it("lines are at least 3mm and at most 8mm / 20% of the tape width", () => {
    expect(maxBorderMm(48)).toBe(8);
    expect(maxBorderMm(24)).toBe(4.5);
    expect(maxBorderMm(12)).toBe(2);
    expect(borderAllowed(12)).toBe(false);
    expect(borderAllowed(24)).toBe(true);
  });
  it("converts to strip px and clamps to the allowed range", () => {
    expect(borderPx({ style: "none", widthMm: 5 }, 48)).toBe(0);
    expect(borderPx({ style: "solid", widthMm: 2 }, 48)).toBe(12); // 3mm minimum
    expect(borderPx({ style: "stripes", widthMm: 20 }, 48)).toBe(32); // 8mm maximum
    expect(borderPx({ style: "solid", widthMm: 3 }, 12)).toBe(0); // too narrow for any line
  });
});

describe("borderShapes", () => {
  const strip = stripSize(48);
  it("solid: one full-length line on each edge", () => {
    const s = borderShapes(strip, "solid", 12);
    expect(s.rects).toEqual([
      { x: 0, y: 0, width: 1200, height: 12 },
      { x: 0, y: 180, width: 1200, height: 12 },
    ]);
    expect(s.stripes).toEqual([]);
  });
  it("stripes: a whole number of slanted stripes per strip (seamless roll)", () => {
    const s = borderShapes(strip, "stripes", 16);
    expect(s.pitch).toBeGreaterThan(0);
    expect(1200 / s.pitch).toBeCloseTo(Math.round(1200 / s.pitch));
    expect(s.bands).toEqual([{ top: 0, bottom: 16 }, { top: 176, bottom: 192 }]);
    // Each band gets n + 2 stripes; every stripe stays within its band vertically.
    expect(s.stripes.length % 2).toBe(0);
    for (const p of s.stripes) {
      const ys = p.filter((_, i) => i % 2 === 1);
      const band = s.bands.find((b) => b.top === ys[0])!;
      expect(Math.min(...ys)).toBe(band.top);
      expect(Math.max(...ys)).toBe(band.bottom);
    }
  });
  it("none: nothing to draw", () => {
    expect(borderShapes(strip, "none", 12)).toEqual({ rects: [], stripes: [], bands: [], pitch: 0 });
  });
});
