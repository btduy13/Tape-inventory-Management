import { describe, expect, it } from "vitest";
import { DESIGN_PATTERNS } from "@/lib/types";
import { computePatternLayout, DIAGONAL_ANGLE, stripSize, type PatternInput, type PatternLayout } from "./pattern";

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

/** Axis-aligned bounds of a tile as printed (after its group transform). */
function printedBounds(t: PatternLayout["tiles"][number]) {
  const boxes = [t.logo, t.text].filter((b) => b !== null);
  const pts = boxes.flatMap((b) => [
    [b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height],
  ]);
  const tr = t.transform;
  const moved = pts.map(([x, y]) => {
    if (!tr) return [x, y];
    const r = (tr.rotation * Math.PI) / 180;
    const dx = (x - tr.pivotX) * tr.scale;
    const dy = (y - tr.pivotY) * tr.scale;
    return [tr.pivotX + tr.dx + dx * Math.cos(r) - dy * Math.sin(r), tr.pivotY + tr.dy + dx * Math.sin(r) + dy * Math.cos(r)];
  });
  const xs = moved.map((p) => p[0]);
  const ys = moved.map((p) => p[1]);
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
}

describe("repeat patterns", () => {
  it("defaults to the straight pattern (old designs)", () => {
    const l = computePatternLayout(input());
    expect(l.pattern).toBe("straight");
    expect(l.rows).toBe(1);
    expect(l.tiles.every((t) => t.transform === null && !t.ghost && t.row === 0)).toBe(true);
  });

  it("flip: turns every second tile 180° and keeps an even tile count", () => {
    for (const textWidth of [200, 330, 900]) {
      const l = computePatternLayout(input({ pattern: "flip", textWidth }));
      expect(l.count % 2).toBe(0);
      expect(l.tiles.map((t) => t.transform?.rotation ?? 0)).toEqual(l.tiles.map((_, i) => (i % 2 ? 180 : 0)));
    }
  });

  it("flip: a turned tile prints in the same place as its upright box", () => {
    const l = computePatternLayout(input({ pattern: "flip", logoAspect: 1, textOffsetY: 0.2 }));
    const t = l.tiles[1];
    const b = printedBounds(t);
    const u = printedBounds({ ...t, transform: null });
    expect(b.left).toBeCloseTo(u.left);
    expect(b.top).toBeCloseTo(u.top);
    expect(b.bottom).toBeCloseTo(u.bottom);
  });

  it("twoRows: two aligned rows at half size inside the printable band", () => {
    const base = computePatternLayout(input({ fontSize: 80 }));
    const l = computePatternLayout(input({ pattern: "twoRows", fontSize: 80 }));
    expect(l.rows).toBe(2);
    expect(l.unit).toBe(96);
    expect(l.fontSize).toBeCloseTo(40);
    const upper = l.tiles.filter((t) => t.row === 0);
    const lower = l.tiles.filter((t) => t.row === 1);
    expect(upper).toHaveLength(l.count);
    expect(lower).toHaveLength(l.count);
    expect(lower.map((t) => t.textX)).toEqual(upper.map((t) => t.textX));
    expect(upper[0].text!.y + upper[0].text!.height).toBeLessThanOrEqual(lower[0].text!.y);
    expect(lower[0].text!.y + lower[0].text!.height).toBeLessThanOrEqual(l.band.bottom + 1e-6);
    expect(l.count).toBeGreaterThanOrEqual(base.count); // half-size content repeats at least as often
  });

  it("stagger: lower row shifted half a step, wrap-around copy completes the cut tile", () => {
    const l = computePatternLayout(input({ pattern: "stagger" }));
    const upper = l.tiles.filter((t) => t.row === 0 && !t.ghost);
    const lower = l.tiles.filter((t) => t.row === 1 && !t.ghost);
    const ghosts = l.tiles.filter((t) => t.ghost);
    expect(lower).toHaveLength(l.count);
    expect(ghosts).toHaveLength(1);
    expect(lower[0].textX! - upper[0].textX!).toBeCloseTo(l.period / 2);
    // Ghost is the last lower tile moved one strip length back: seamless when the strip repeats.
    expect(ghosts[0].textX!).toBeCloseTo(lower[l.count - 1].textX! - 1200);
    // Non-ghost tiles come first, so tile indices of interactive tiles stay stable.
    expect(l.tiles.findIndex((t) => t.ghost)).toBe(2 * l.count);
  });

  it("diagonal: tilts every tile and keeps it inside the band and its tile", () => {
    for (const over of [{}, { textWidth: 1000 }, { logoAspect: 1, logoOffsetY: 0.4, textOffsetY: -0.4 }]) {
      const l = computePatternLayout(input({ pattern: "diagonal", ...over }));
      expect(l.tiles.length).toBeGreaterThan(0);
      for (const [i, t] of l.tiles.entries()) {
        expect(t.transform!.rotation).toBe(DIAGONAL_ANGLE);
        const b = printedBounds(t);
        expect(b.top).toBeGreaterThanOrEqual(l.band.top - 0.5);
        expect(b.bottom).toBeLessThanOrEqual(l.band.bottom + 0.5);
        expect(b.left).toBeGreaterThanOrEqual(i * l.period - 0.5);
        expect(b.right).toBeLessThanOrEqual((i + 1) * l.period + 0.5);
      }
    }
  });

  it("every pattern keeps content inside the strip length (seamless roll texture)", () => {
    for (const pattern of DESIGN_PATTERNS) {
      const l = computePatternLayout(input({ pattern, logoAspect: 1.5, textWidth: 500 }));
      expect(l.period * l.count).toBeCloseTo(1200);
      for (const t of l.tiles.filter((x) => !x.ghost)) {
        const b = printedBounds(t);
        expect(b.top).toBeGreaterThanOrEqual(l.band.top - 0.5);
        expect(b.bottom).toBeLessThanOrEqual(l.band.bottom + 0.5);
      }
    }
  });
});
