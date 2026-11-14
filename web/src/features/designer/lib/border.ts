// Top / bottom border lines of the tape print, drawn in the text ink (no extra ink).
//   solid    a plain line along each edge
//   stripes  hazard-style slanted stripes along each edge
// Lines are at least BORDER_MIN_MM thick (printable on the press) and at most BORDER_MAX_MM or
// BORDER_MAX_RATIO of the tape width. Stripe pitch divides the strip so the roll repeats seamlessly.
import type { DesignBorderStyle } from "@/lib/types";
import { BORDER_MAX_MM, BORDER_MAX_RATIO, BORDER_MIN_MM, PX_PER_MM } from "./constants";
import type { StripSize } from "./pattern";

export type BorderSpec = { style: DesignBorderStyle; widthMm: number };

/** Thickest allowed line on a tape width (mm, 0.5 steps). Below BORDER_MIN_MM: no border possible. */
export function maxBorderMm(tapeWidthMm: number): number {
  return Math.min(BORDER_MAX_MM, Math.floor(tapeWidthMm * BORDER_MAX_RATIO * 2) / 2);
}

export const borderAllowed = (tapeWidthMm: number): boolean => maxBorderMm(tapeWidthMm) >= BORDER_MIN_MM;

/** Line thickness in strip px (0 when there is no border). */
export function borderPx(border: BorderSpec, tapeWidthMm: number): number {
  if (border.style === "none" || !borderAllowed(tapeWidthMm)) return 0;
  const mm = Math.min(Math.max(border.widthMm, BORDER_MIN_MM), maxBorderMm(tapeWidthMm));
  return mm * PX_PER_MM;
}

export type BorderShapes = {
  /** Solid rectangles (solid lines). */
  rects: { x: number; y: number; width: number; height: number }[];
  /** Closed polygons [x0, y0, x1, y1, ...] (stripes), clipped by the renderer to `bands`. */
  stripes: number[][];
  /** Y ranges of the two border lines. */
  bands: { top: number; bottom: number }[];
  /** Stripe pitch along the strip (0 without stripes). */
  pitch: number;
};

/** Shapes for the border lines of a strip. Pure: unit-tested, rendered by the Konva stage. */
export function borderShapes(strip: StripSize, style: DesignBorderStyle, px: number): BorderShapes {
  const none: BorderShapes = { rects: [], stripes: [], bands: [], pitch: 0 };
  if (style === "none" || px <= 0) return none;
  const bands = [
    { top: 0, bottom: px },
    { top: strip.height - px, bottom: strip.height },
  ];
  if (style === "solid") {
    return { ...none, bands, rects: bands.map((b) => ({ x: 0, y: b.top, width: strip.width, height: b.bottom - b.top })) };
  }
  // Stripes: pitch about 3x the line thickness, adjusted so a whole number fits the strip.
  const n = Math.max(1, Math.round(strip.width / (px * 3)));
  const pitch = strip.width / n;
  const w = pitch / 2;
  const stripes: number[][] = [];
  for (const b of bands) {
    const t = b.bottom - b.top;
    // One extra stripe on each side covers the slant at the strip ends.
    for (let i = -1; i <= n; i++) {
      const x = i * pitch;
      stripes.push([x + t, b.top, x + t + w, b.top, x + w, b.bottom, x, b.bottom]);
    }
  }
  return { rects: [], stripes, bands, pitch };
}
