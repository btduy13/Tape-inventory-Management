// Logo clean-up for the preview (pure, RGBA in / RGBA out, no DOM):
//   1. an opaque image whose border is mostly near-white gets that white background removed
//      (flood fill from the border, so white inside the logo stays), and the anti-aliased ring
//      next to it is "un-whitened" (colour-to-alpha) so no white halo shows on coloured tape;
//   2. transparent / removed margins are trimmed to the logo bounds plus a small padding.
// The customer's original file is still what staff receive; this only changes what is drawn on
// the tape, so the logo fills its box, prints no white rectangle and can be knocked out.
import type { PixelData } from "./logo-colors";

export type CleanedPixels = {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  /** A white background was made transparent. */
  bgRemoved: boolean;
  /** Empty margins were cut off. */
  trimmed: boolean;
};

/** Near-white in RGB (fast; matches logo-colors' Lab rule closely enough for JPG backgrounds). */
const isNearWhite = (r: number, g: number, b: number) => {
  const lo = Math.min(r, g, b);
  return lo >= 225 && Math.max(r, g, b) - lo <= 18;
};
/** Pixels with alpha at or below this are empty when trimming. */
const ALPHA_EMPTY = 16;
/** Most of the border must be near-white before it is treated as a background. */
const BORDER_WHITE_SHARE = 0.6;

/** Returns the cleaned pixels, or null when nothing would change (or nothing would be left). */
export function cleanLogoPixels({ data: src, width: w, height: h }: PixelData): CleanedPixels | null {
  const n = w * h;
  if (n === 0 || src.length < n * 4) return null;
  const data = new Uint8ClampedArray(src.subarray(0, n * 4));

  let translucent = 0;
  for (let i = 0; i < n; i++) if (data[i * 4 + 3] < 250) translucent++;
  const bgRemoved = translucent < n * 0.01 && removeWhiteBackground(data, w, h);

  // Bounds of the visible pixels.
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] <= ALPHA_EMPTY) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return null; // nothing visible: keep the original
  const pad = Math.max(2, Math.round(0.02 * Math.max(x1 - x0 + 1, y1 - y0 + 1)));
  x0 = Math.max(0, x0 - pad);
  y0 = Math.max(0, y0 - pad);
  x1 = Math.min(w - 1, x1 + pad);
  y1 = Math.min(h - 1, y1 + pad);
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;
  const trimmed = cw < w * 0.99 || ch < h * 0.99;
  if (!bgRemoved && !trimmed) return null;

  const out = new Uint8ClampedArray(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    const from = ((y0 + y) * w + x0) * 4;
    out.set(data.subarray(from, from + cw * 4), y * cw * 4);
  }
  return { data: out, width: cw, height: ch, bgRemoved, trimmed };
}

/** Flood-fills the border-connected near-white background to transparent, then un-whitens the
 *  two-pixel ring around it. Mutates `data`; false (untouched) when the border is not white. */
function removeWhiteBackground(data: Uint8ClampedArray, w: number, h: number): boolean {
  const white = (i: number) => isNearWhite(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
  const border: number[] = [];
  for (let x = 0; x < w; x++) border.push(x, (h - 1) * w + x);
  for (let y = 1; y < h - 1; y++) border.push(y * w, y * w + w - 1);
  const seeds = border.filter(white);
  if (seeds.length < border.length * BORDER_WHITE_SHARE) return false;

  const removed = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let top = 0;
  for (const i of seeds) {
    if (removed[i]) continue;
    removed[i] = 1;
    stack[top++] = i;
  }
  while (top > 0) {
    const i = stack[--top];
    const x = i % w;
    const y = (i - x) / w;
    const visit = (j: number) => {
      if (!removed[j] && white(j)) {
        removed[j] = 1;
        stack[top++] = j;
      }
    };
    if (x > 0) visit(i - 1);
    if (x < w - 1) visit(i + 1);
    if (y > 0) visit(i - w);
    if (y < h - 1) visit(i + w);
  }
  if (!removed.some((v) => v === 0)) return false; // all white: not a logo on a background

  // Ring distance 1 and 2 from the removed area: anti-aliasing blended with white.
  const ring = new Uint8Array(w * h);
  const touches = (i: number, test: (j: number) => boolean) => {
    const x = i % w;
    return (x > 0 && test(i - 1)) || (x < w - 1 && test(i + 1)) || (i >= w && test(i - w)) || (i < w * (h - 1) && test(i + w));
  };
  for (let i = 0; i < w * h; i++) if (!removed[i] && touches(i, (j) => removed[j] === 1)) ring[i] = 1;
  for (let i = 0; i < w * h; i++) if (!removed[i] && !ring[i] && touches(i, (j) => ring[j] === 1)) ring[i] = 2;
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    if (removed[i]) {
      data[o + 3] = 0;
      continue;
    }
    if (!ring[i]) continue;
    // Colour-to-alpha against white: the least-white channel sets the opacity.
    const a = Math.max(255 - data[o], 255 - data[o + 1], 255 - data[o + 2]) / 255;
    if (a >= 0.999) continue;
    if (a <= 0.02) {
      data[o + 3] = 0;
      continue;
    }
    for (let c = 0; c < 3; c++) data[o + c] = (data[o + c] - 255 * (1 - a)) / a;
    data[o + 3] = Math.round(data[o + 3] * a);
  }
  return true;
}
