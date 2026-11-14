import { describe, expect, it } from "vitest";
import { cleanLogoPixels } from "./logo-clean";

type Px = [number, number, number, number];
/** w x h image filled with `bg`, with a `box` rectangle of `fg`. */
function image(w: number, h: number, bg: Px, fg: Px, box: { x: number; y: number; w: number; h: number }) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const inBox = x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h;
      data.set(inBox ? fg : bg, (y * w + x) * 4);
    }
  }
  return { data, width: w, height: h };
}
const at = (r: { data: Uint8ClampedArray; width: number }, x: number, y: number) =>
  Array.from(r.data.subarray((y * r.width + x) * 4, (y * r.width + x) * 4 + 4));

const WHITE: Px = [255, 255, 255, 255];
const RED: Px = [200, 20, 30, 255];
const CLEAR: Px = [0, 0, 0, 0];
const NONE = { x: 0, y: 0, w: 0, h: 0 };

describe("cleanLogoPixels", () => {
  it("removes a white JPG-style background and trims to the logo", () => {
    const r = cleanLogoPixels(image(100, 60, WHITE, RED, { x: 30, y: 20, w: 40, h: 20 }))!;
    expect(r.bgRemoved).toBe(true);
    expect(r.trimmed).toBe(true);
    // 40 x 20 logo + 2px padding (2% rounds below the 2px minimum) on each side.
    expect([r.width, r.height]).toEqual([44, 24]);
    expect(at(r, 0, 0)[3]).toBe(0); // padding is transparent
    expect(at(r, 22, 12)).toEqual(RED); // logo kept
  });

  it("keeps white inside the logo (not connected to the border)", () => {
    const img = image(50, 50, WHITE, RED, { x: 10, y: 10, w: 30, h: 30 });
    for (let y = 20; y < 30; y++) for (let x = 20; x < 30; x++) img.data.set(WHITE, (y * 50 + x) * 4);
    const r = cleanLogoPixels(img)!;
    expect(at(r, Math.floor(r.width / 2), Math.floor(r.height / 2))).toEqual(WHITE);
  });

  it("un-whitens the anti-aliased edge (no white halo)", () => {
    const img = image(40, 40, WHITE, RED, { x: 10, y: 10, w: 20, h: 20 });
    img.data.set([228, 138, 143, 255], (15 * 40 + 9) * 4); // half-blended pink just outside the logo
    const r = cleanLogoPixels(img)!;
    // The kept edge pixel widens the bounds to x = 9: the crop starts at (9 - 2, 10 - 2).
    const edge = at(r, 9 - 7, 15 - 8);
    expect(edge[3]).toBeGreaterThan(0);
    expect(edge[3]).toBeLessThan(255);
    expect(edge[0]).toBeGreaterThan(edge[1] + 100); // still red, not pinkish white
  });

  it("trims transparent margins of a PNG without touching its colours", () => {
    const r = cleanLogoPixels(image(80, 80, CLEAR, RED, { x: 20, y: 30, w: 40, h: 20 }))!;
    expect(r.bgRemoved).toBe(false);
    expect(r.trimmed).toBe(true);
    expect([r.width, r.height]).toEqual([44, 24]);
    expect(at(r, 22, 12)).toEqual(RED);
  });

  it("leaves images that need nothing, or are all white / empty, alone", () => {
    expect(cleanLogoPixels(image(20, 20, RED, RED, NONE))).toBeNull(); // full-bleed, opaque, not white
    expect(cleanLogoPixels(image(20, 20, WHITE, WHITE, NONE))).toBeNull(); // nothing but white
    expect(cleanLogoPixels(image(20, 20, CLEAR, CLEAR, NONE))).toBeNull(); // nothing visible
    // Coloured background: only white backgrounds are removed.
    expect(cleanLogoPixels(image(20, 20, [0, 51, 160, 255], RED, { x: 5, y: 5, w: 10, h: 10 }))).toBeNull();
  });
});
