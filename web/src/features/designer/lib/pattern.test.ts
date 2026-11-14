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
  const visible = (l: PatternLayout) => l.tiles.filter((t) => !t.ghost);

  it("defaults to the straight pattern (old designs)", () => {
    const l = computePatternLayout(input());
    expect(l.pattern).toBe("straight");
    expect(l.bleed).toBe(false);
    expect(l.tiles.every((t) => t.transform === null && !t.ghost && t.row === 0 && !t.fill)).toBe(true);
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

  it("blocks: even cells filled, logo and text take turns, cells cover the tape", () => {
    const l = computePatternLayout(input({ pattern: "blocks", logoAspect: 1 }));
    expect(l.count % 2).toBe(0);
    expect(l.tiles.map((t) => t.fill)).toEqual(l.tiles.map((_, i) => i % 2 === 0));
    expect(l.tiles.map((t) => [t.logo !== null, t.text !== null])).toEqual(l.tiles.map((_, i) => [i % 2 === 0, i % 2 === 1]));
    expect(l.tiles.reduce((w, t) => w + t.cell.width, 0)).toBeCloseTo(1200);
    expect(l.tiles[0].cell).toMatchObject({ y: 0, height: 192 });
    // Each element is centred in its own cell; effective offsets come from the first cell showing it.
    for (const e of [l.effective.logo!, l.effective.text!]) {
      expect(e.x).toBeCloseTo(0);
      expect(e.y).toBeCloseTo(0);
    }
  });

  it("blocks: text only alternates filled and plain cells with the text in every cell", () => {
    const l = computePatternLayout(input({ pattern: "blocks" }));
    expect(l.tiles.every((t) => t.text !== null && t.logo === null)).toBe(true);
    expect(l.tiles.filter((t) => t.fill)).toHaveLength(l.count / 2);
  });

  it("brick: half-size rows, every second row shifted half a step, bleeding past the edges", () => {
    const l = computePatternLayout(input({ pattern: "brick", fontSize: 80 }));
    expect(l.bleed).toBe(true);
    expect(l.unit).toBe(96);
    expect(l.fontSize).toBeCloseTo(40);
    const rows = [...new Set(l.tiles.map((t) => t.row))].sort((a, b) => a - b);
    expect(rows.length).toBeGreaterThanOrEqual(3);
    const r0 = visible(l).filter((t) => t.row === 0);
    const r1 = visible(l).filter((t) => t.row === 1);
    expect(r0).toHaveLength(l.count);
    expect(r1[0].textX! - r0[0].textX!).toBeCloseTo(l.period / 2);
    // Outer rows are cut by the tape edges (clipped by the renderer).
    const ys = l.tiles.map((t) => t.text!.y);
    expect(Math.min(...ys)).toBeLessThan(l.clip.top);
    // Wrap-around copies come last so interactive tile indices stay stable.
    const firstGhost = l.tiles.findIndex((t) => t.ghost);
    expect(l.tiles.slice(firstGhost).every((t) => t.ghost)).toBe(true);
    for (const g of l.tiles.filter((t) => t.ghost)) {
      const twin = visible(l).filter((t) => t.row === g.row).at(-1)!;
      expect(g.textX!).toBeCloseTo(twin.textX! - 1200);
    }
  });

  it("grid: aligned rows", () => {
    const l = computePatternLayout(input({ pattern: "grid" }));
    expect(l.tiles.some((t) => t.ghost)).toBe(false);
    const xs = (row: number) => l.tiles.filter((t) => t.row === row).map((t) => t.textX);
    expect(xs(1)).toEqual(xs(0));
    expect(xs(-1)).toEqual(xs(0));
  });

  it("diagonal: all-over brick of tilted tiles that stay inside their tile", () => {
    for (const over of [{}, { textWidth: 1000 }, { logoAspect: 1, logoOffsetY: 0.4, textOffsetY: -0.4 }]) {
      const l = computePatternLayout(input({ pattern: "diagonal", ...over }));
      expect(l.bleed).toBe(true);
      expect(visible(l).length).toBeGreaterThan(0);
      for (const t of visible(l)) {
        expect(t.transform!.rotation).toBe(DIAGONAL_ANGLE);
        const b = printedBounds(t);
        const tile0 = t.cell.x;
        expect(b.left).toBeGreaterThanOrEqual(tile0 - 0.5);
        expect(b.right).toBeLessThanOrEqual(tile0 + l.period + 0.5);
      }
    }
  });

  it("one-row patterns keep content inside the band; every pattern wraps the strip seamlessly", () => {
    for (const pattern of DESIGN_PATTERNS) {
      const l = computePatternLayout(input({ pattern, logoAspect: 1.5, textWidth: 500 }));
      expect(l.period * l.count).toBeCloseTo(1200);
      if (l.bleed) continue;
      for (const t of visible(l)) {
        const b = printedBounds(t);
        expect(b.top).toBeGreaterThanOrEqual(l.band.top - 0.5);
        expect(b.bottom).toBeLessThanOrEqual(l.band.bottom + 0.5);
      }
    }
  });
});

describe("multi-line text", () => {
  it("text box covers every line and the font shrinks to fit the band", () => {
    const one = computePatternLayout(input({ fontSize: 80 }));
    const three = computePatternLayout(input({ fontSize: 80, textLines: 3 }));
    expect(one.textHeightRatio).toBe(1);
    expect(three.textHeightRatio).toBeCloseTo(3.45);
    const box = three.tiles[0].text!;
    expect(box.height).toBeCloseTo(three.fontSize * three.textHeightRatio);
    expect(box.y).toBeGreaterThanOrEqual(three.band.top - 1e-6);
    expect(box.y + box.height).toBeLessThanOrEqual(three.band.bottom + 1e-6);
    expect(three.fontSize).toBeLessThan(80);
  });
});

describe("border lines and logo rotation", () => {
  it("border shrinks the printable band and sets the clip inside the lines", () => {
    const l = computePatternLayout(input({ borderPx: 12, logoAspect: 1 }));
    expect(l.clip).toEqual({ top: 12, bottom: 180 });
    expect(l.band.top).toBeCloseTo(12 + 9.6);
    const t = l.tiles[0];
    expect(t.logo!.y).toBeGreaterThanOrEqual(l.band.top);
    expect(t.logo!.y + t.logo!.height).toBeLessThanOrEqual(l.band.bottom + 1e-6);
    expect(l.tiles[0].cell).toMatchObject({ y: 12, height: 168 });
  });

  it("rotated logo: the box is the rotated footprint, still inside the band", () => {
    const flat = computePatternLayout(input({ logoAspect: 3, logoScale: 0.5 }));
    const turned = computePatternLayout(input({ logoAspect: 3, logoScale: 0.5, logoRotation: 90 }));
    expect(turned.logoRotation).toBe(90);
    const f = flat.tiles[0].logo!;
    const r = turned.tiles[0].logo!;
    expect(r.height).toBeGreaterThan(f.height);
    expect(r.width).toBeLessThan(f.width);
    expect(r.y).toBeGreaterThanOrEqual(turned.band.top - 1e-6);
    expect(r.y + r.height).toBeLessThanOrEqual(turned.band.bottom + 1e-6);
    // The footprint of the natural size matches the box.
    expect(turned.logoSize!.width).toBeCloseTo(r.height);
  });
});
