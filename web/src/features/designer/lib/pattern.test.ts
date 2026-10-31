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

  it("supports logo-only designs", () => {
    const l = computePatternLayout(input({ textWidth: 0, logoAspect: 1 }));
    expect(l.count).toBeGreaterThan(0);
    expect(l.tiles[0].textX).toBeNull();
  });
});
