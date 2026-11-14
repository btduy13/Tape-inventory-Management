// One-ink ("1 màu") logo conversion. Pure: RGBA in, ink coverage (alpha per pixel) out, no DOM.
// Any logo, whatever its colours, becomes a single-ink stamp that prints like the reference tapes
// (logo and text in one colour, or knocked out in the tape colour inside colour blocks):
//   1. a plain background touching the border (white, blue square, any flat colour) is removed by a
//      flood fill from the border, so the logo is not printed as a solid block;
//   2. the remaining pixels are split into ink / no ink by brightness. The split point comes from
//      Otsu's method on the logo's own pixels, moved by `level` (thicker / thinner lines);
//   3. `invert` prints the light parts instead (for light artwork on a dark badge);
//   4. a logo that is already one flat colour is printed whole.
// Edges get partial alpha (anti-aliasing), so lines stay smooth at any size.
import type { PixelData } from "./logo-colors";

export type MonoOptions = {
  /** 0..100, 50 = automatic split point. Higher = more of the logo is printed (bolder). */
  level: number;
  /** Print the light parts instead of the dark ones. */
  invert: boolean;
};

export const MONO_DEFAULT: MonoOptions = { level: 50, invert: false };

export type MonoResult = {
  /** Ink coverage per pixel, 0..255 (length width * height). */
  mask: Uint8ClampedArray;
  /** A plain background touching the border was dropped. */
  bgRemoved: boolean;
  /** Brightness split point actually used (0..255), null when the logo was printed whole. */
  threshold: number | null;
};

/** Pixels at or below this alpha are empty. */
const ALPHA_EMPTY = 16;
/** RGB distance under which a pixel matches the background colour. */
const BG_DISTANCE = 56;
/** Share of the border that must match before it counts as a background. */
const BORDER_SHARE = 0.6;
/** Brightness spread (5th..95th percentile) under which the logo is one flat colour. */
const FLAT_SPREAD = 32;
/** Width of the soft edge around the split point, in brightness units. */
const SOFT = 12;
/** Split-point shift per `level` step away from 50. */
const LEVEL_STEP = 2;

const luma = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

export function monoLogoMask({ data, width: w, height: h }: PixelData, opts: MonoOptions = MONO_DEFAULT): MonoResult | null {
  const n = w * h;
  if (n === 0 || data.length < n * 4) return null;

  const bg = new Uint8Array(n);
  const bgRemoved = removeBorderBackground(data, w, h, bg);

  // Brightness histogram of the logo's own pixels.
  const hist = new Uint32Array(256);
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (bg[i] || data[i * 4 + 3] <= ALPHA_EMPTY) continue;
    hist[Math.round(luma(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]))]++;
    count++;
  }
  if (count === 0) return null;

  const mask = new Uint8ClampedArray(n);
  const flat = percentile(hist, count, 0.95) - percentile(hist, count, 0.05) < FLAT_SPREAD;
  if (flat) {
    for (let i = 0; i < n; i++) if (!bg[i]) mask[i] = data[i * 4 + 3];
    return { mask, bgRemoved, threshold: null };
  }

  const shift = (Math.min(100, Math.max(0, opts.level)) - 50) * LEVEL_STEP;
  const otsu = otsuThreshold(hist, count);
  const t = Math.min(254, Math.max(1, opts.invert ? otsu - shift : otsu + shift));
  for (let i = 0; i < n; i++) {
    const a = data[i * 4 + 3];
    if (bg[i] || a <= ALPHA_EMPTY) continue;
    const y = luma(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
    const d = opts.invert ? y - t : t - y;
    const cover = Math.min(1, Math.max(0, d / SOFT + 0.5));
    mask[i] = Math.round(cover * a);
  }
  return { mask, bgRemoved, threshold: t };
}

/** Marks a flat background connected to the border in `bg`. False when the border is not flat. */
function removeBorderBackground(data: Uint8ClampedArray, w: number, h: number, bg: Uint8Array): boolean {
  const border: number[] = [];
  for (let x = 0; x < w; x++) border.push(x, (h - 1) * w + x);
  for (let y = 1; y < h - 1; y++) border.push(y * w, y * w + w - 1);
  const opaque = border.filter((i) => data[i * 4 + 3] > 200);
  // Mostly transparent border: the background is already gone (PNG / cleaned logo).
  if (opaque.length < border.length * BORDER_SHARE) return false;

  // Reference colour: per-channel median of the opaque border.
  const med = [0, 1, 2].map((c) => {
    const v = opaque.map((i) => data[i * 4 + c]).sort((p, q) => p - q);
    return v[v.length >> 1];
  });
  const near = (i: number) => {
    const o = i * 4;
    return data[o + 3] > 200 && Math.hypot(data[o] - med[0], data[o + 1] - med[1], data[o + 2] - med[2]) < BG_DISTANCE;
  };
  const seeds = border.filter(near);
  if (seeds.length < border.length * BORDER_SHARE) return false;

  const stack = new Int32Array(w * h);
  let top = 0;
  for (const i of seeds) {
    if (bg[i]) continue;
    bg[i] = 1;
    stack[top++] = i;
  }
  while (top > 0) {
    const i = stack[--top];
    const x = i % w;
    const visit = (j: number) => {
      if (!bg[j] && near(j)) {
        bg[j] = 1;
        stack[top++] = j;
      }
    };
    if (x > 0) visit(i - 1);
    if (x < w - 1) visit(i + 1);
    if (i >= w) visit(i - w);
    if (i < w * (h - 1)) visit(i + w);
  }
  // Everything matched: a flat image, not a logo on a background.
  if (bg.every((v) => v === 1)) {
    bg.fill(0);
    return false;
  }
  return true;
}

function percentile(hist: Uint32Array, count: number, p: number): number {
  const target = count * p;
  let acc = 0;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= target) return v;
  }
  return 255;
}

/** Otsu's method: the brightness that best separates the histogram into two classes. */
export function otsuThreshold(hist: Uint32Array, count: number): number {
  let sum = 0;
  for (let v = 0; v < 256; v++) sum += v * hist[v];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let lo = 128;
  let hi = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = count - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best * (1 + 1e-9)) {
      best = between;
      lo = hi = t;
    } else if (between >= best * (1 - 1e-9)) {
      hi = t; // same score across empty bins: keep the whole gap
    }
  }
  // Split in the middle of the best gap (not hugging the dark cluster).
  return (lo + hi) / 2 + 0.5;
}
