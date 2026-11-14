import { describe, expect, it } from "vitest";
import { monoLogoMask, otsuThreshold } from "./logo-mono";

type Px = [number, number, number, number];
type Rect = { x: number; y: number; w: number; h: number; c: Px };

/** w x h image filled with `bg`, then each rect painted in order. */
function image(w: number, h: number, bg: Px, rects: Rect[] = []) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set(bg, i * 4);
  for (const r of rects) {
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) data.set(r.c, (y * w + x) * 4);
  }
  return { data, width: w, height: h };
}
const at = (m: Uint8ClampedArray, w: number, x: number, y: number) => m[y * w + x];

const BLUE: Px = [40, 90, 200, 255]; // flat coloured background (like a logo on a blue square)
const BROWN: Px = [160, 110, 70, 255]; // mid-tone fill
const BLACK: Px = [15, 15, 15, 255]; // outlines
const WHITE: Px = [255, 255, 255, 255];
const RED: Px = [207, 31, 39, 255];
const CLEAR: Px = [0, 0, 0, 0];

describe("monoLogoMask", () => {
  it("drops a flat coloured background and keeps the dark lines of a multi-colour logo", () => {
    // Blue square, brown body with black outline and white highlight.
    const img = image(60, 60, BLUE, [
      { x: 10, y: 10, w: 40, h: 40, c: BLACK },
      { x: 13, y: 13, w: 34, h: 34, c: BROWN },
      { x: 20, y: 20, w: 6, h: 6, c: WHITE },
    ]);
    const r = monoLogoMask(img)!;
    expect(r.bgRemoved).toBe(true);
    expect(at(r.mask, 60, 2, 2)).toBe(0); // background: no ink
    expect(at(r.mask, 60, 11, 30)).toBe(255); // black outline: ink
    expect(at(r.mask, 60, 22, 22)).toBe(0); // white highlight: no ink
  });

  it("level makes the print bolder or thinner", () => {
    const img = image(60, 60, BLUE, [
      { x: 10, y: 10, w: 40, h: 40, c: BLACK },
      { x: 13, y: 13, w: 34, h: 34, c: BROWN },
      { x: 20, y: 20, w: 6, h: 6, c: WHITE },
    ]);
    const ink = (level: number) => monoLogoMask(img, { level, invert: false })!.mask.reduce((s, v) => s + v, 0);
    expect(ink(90)).toBeGreaterThan(ink(50));
    expect(ink(10)).toBeLessThanOrEqual(ink(50));
  });

  it("invert prints the light parts", () => {
    const img = image(40, 40, CLEAR, [
      { x: 5, y: 5, w: 30, h: 30, c: BLACK },
      { x: 15, y: 15, w: 10, h: 10, c: WHITE },
    ]);
    const normal = monoLogoMask(img)!;
    const inverted = monoLogoMask(img, { level: 50, invert: true })!;
    expect(at(normal.mask, 40, 6, 6)).toBe(255);
    expect(at(normal.mask, 40, 20, 20)).toBe(0);
    expect(at(inverted.mask, 40, 6, 6)).toBe(0);
    expect(at(inverted.mask, 40, 20, 20)).toBe(255);
  });

  it("prints a one-colour logo whole, even a light one", () => {
    for (const c of [RED, WHITE]) {
      const r = monoLogoMask(image(30, 30, CLEAR, [{ x: 5, y: 5, w: 20, h: 20, c }]))!;
      expect(r.threshold).toBeNull();
      expect(at(r.mask, 30, 10, 10)).toBe(255);
      expect(at(r.mask, 30, 1, 1)).toBe(0);
    }
  });

  it("keeps transparency and treats a white JPG background like any flat background", () => {
    const r = monoLogoMask(image(40, 40, WHITE, [{ x: 10, y: 10, w: 20, h: 20, c: RED }]))!;
    expect(r.bgRemoved).toBe(true);
    expect(at(r.mask, 40, 2, 2)).toBe(0);
    expect(at(r.mask, 40, 20, 20)).toBe(255);
  });

  it("returns null when there is nothing to print", () => {
    expect(monoLogoMask(image(10, 10, CLEAR))).toBeNull();
    expect(monoLogoMask({ data: new Uint8ClampedArray(0), width: 0, height: 0 })).toBeNull();
  });
});

describe("otsuThreshold", () => {
  it("splits two clusters between them", () => {
    const hist = new Uint32Array(256);
    hist[20] = 100;
    hist[200] = 100;
    const t = otsuThreshold(hist, 200);
    expect(t).toBeGreaterThan(20);
    expect(t).toBeLessThan(200);
  });
});
