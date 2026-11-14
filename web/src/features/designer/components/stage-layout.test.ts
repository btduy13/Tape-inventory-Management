import { beforeEach, describe, expect, it, vi } from "vitest";
import { DESIGN_PATTERNS } from "@/lib/types";
import { createInitialState, designReducer, type DesignState } from "../lib/state";
import { layoutForState } from "./stage-layout";

// jsdom has no 2D canvas: text is measured by the length fallback.
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

/** Long 3-line text + logo: repeats only once or twice on the 300mm strip. */
function longDesign(): DesignState {
  let s = createInitialState();
  s = designReducer(s, { type: "setText", text: "TÔM GIỐNG\nGIA VIỆT\nĐT: 0906 355 388" });
  s = designReducer(s, { type: "setLogo", logo: { file: new File(["x"], "l.png"), kind: "png", url: "blob:l", width: 100, height: 100 } });
  return s;
}

describe("layoutForState on a short strip (pattern thumbnails)", () => {
  it("lays every pattern out on 150mm with whole tiles inside the strip", () => {
    for (const pattern of DESIGN_PATTERNS) {
      const l = layoutForState({ ...longDesign(), pattern }, true, 150);
      expect(l.period * l.count).toBeCloseTo(600);
      // The centre row is never shifted (shifted all-over rows wrap around the strip end on purpose).
      for (const t of l.tiles.filter((x) => !x.ghost && x.row === 0)) {
        for (const b of [t.logo, t.text]) {
          if (!b) continue;
          expect(b.x).toBeGreaterThanOrEqual(-1e-6);
          expect(b.x + b.width).toBeLessThanOrEqual(600 + 1e-6);
        }
      }
    }
  });

  it("colour blocks show both a filled and a plain cell, with logo and text", () => {
    const l = layoutForState({ ...longDesign(), pattern: "blocks" }, true, 150);
    expect(l.count).toBeGreaterThanOrEqual(2);
    expect(l.tiles.some((t) => t.fill && t.logo)).toBe(true);
    expect(l.tiles.some((t) => !t.fill && t.text)).toBe(true);
  });

  it("defaults to the 300mm stage strip", () => {
    const l = layoutForState(longDesign(), true);
    expect(l.period * l.count).toBeCloseTo(1200);
  });
});
