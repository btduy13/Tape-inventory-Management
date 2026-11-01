import { describe, expect, it } from "vitest";
import { computePatternLayout, stripSize, type PatternInput } from "./pattern";

const input = (over: Partial<PatternInput> = {}): PatternInput => ({
  strip: stripSize(48),
  textWidth: 200,
  logoAspect: null,
  logoScale: 1,
  logoOffsetX: 0,
  logoOffsetY: 0,
  repeatGapPx: 100,
  ...over,
});

describe("stripSize", () => {
  it("maps mm to logical px", () => {
    expect(stripSize(48)).toEqual({ width: 1200, height: 192 });
    expect(stripSize(72, 100)).toEqual({ width: 400, height: 288 });
  });
});

describe("computePatternLayout", () => {
  it("returns no tiles for an empty design", () => {
    expect(computePatternLayout(input({ textWidth: 0 })).tiles).toEqual([]);
  });

  it("tiles evenly so the strip repeats seamlessly", () => {
    const l = computePatternLayout(input());
    expect(l.count).toBe(4); // 1200 / 300
    expect(l.period * l.count).toBeCloseTo(1200);
    const xs = l.tiles.map((t) => t.textX!);
    for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeCloseTo(l.period);
  });

  it("places logo before text and applies offsets", () => {
    const l = computePatternLayout(input({ logoAspect: 2, logoOffsetY: 0.1, logoOffsetX: 0.05 }));
    const t = l.tiles[0];
    expect(l.logoSize!.height).toBeCloseTo(192 * 0.7);
    expect(l.logoSize!.width).toBeCloseTo(192 * 0.7 * 2);
    expect(t.textX!).toBeGreaterThan(t.logo!.x);
    expect(t.logo!.y).toBeCloseTo((192 - 192 * 0.7) / 2 + 19.2);
  });

  it("always shows at least one tile even when content is wider than the strip", () => {
    const l = computePatternLayout(input({ textWidth: 5000 }));
    expect(l.count).toBe(1);
    expect(l.period).toBe(1200);
  });

  it("shrinks long content so the logo stays on the strip (QC-01)", () => {
    const l = computePatternLayout(input({ textWidth: 1400, fontSize: 86, logoAspect: 1 }));
    expect(l.count).toBe(1);
    expect(l.fit).toBeLessThan(1);
    expect(l.fontSize).toBeCloseTo(86 * l.fit);
    const t = l.tiles[0];
    expect(t.logo!.x).toBeGreaterThanOrEqual(0);
    expect(t.text!.x + t.text!.width).toBeLessThanOrEqual(1200);
  });

  it("keeps elements inside the tile and the printable band", () => {
    const l = computePatternLayout(input({ logoAspect: 1, logoScale: 1.5, logoOffsetX: 3, logoOffsetY: 0.5, textOffsetY: -0.5 }));
    for (const [i, t] of l.tiles.entries()) {
      expect(t.logo!.x + t.logo!.width).toBeLessThanOrEqual((i + 1) * l.period + 1e-6);
      expect(t.logo!.y).toBeGreaterThanOrEqual(l.band.top);
      expect(t.logo!.y + t.logo!.height).toBeLessThanOrEqual(l.band.bottom + 1e-6);
      expect(t.text!.y).toBeCloseTo(l.band.top);
    }
    expect(l.logoSize!.height).toBeLessThanOrEqual(l.band.bottom - l.band.top);
    expect(l.effective.logo!.y).toBeLessThan(0.5);
  });

  it("moves text with offsets and reports effective offsets", () => {
    const base = computePatternLayout(input());
    const moved = computePatternLayout(input({ textOffsetX: 0.1 }));
    expect(moved.tiles[0].text!.x - base.tiles[0].text!.x).toBeCloseTo(19.2);
    expect(moved.effective.text!.x).toBeCloseTo(0.1);
  });

  it("supports logo-only designs", () => {
    const l = computePatternLayout(input({ textWidth: 0, logoAspect: 1 }));
    expect(l.count).toBeGreaterThan(0);
    expect(l.tiles[0].textX).toBeNull();
  });
});
