// Logo tint: turn any logo into a single ink colour so the print stays within 3 colours.
// Images with transparency use alpha as the ink mask; opaque images use darkness.

export type Rgb = { r: number; g: number; b: number };

/** True when any pixel is not fully opaque. `data` is RGBA. */
export function hasTransparency(data: Uint8ClampedArray): boolean {
  for (let i = 3; i < data.length; i += 4) if (data[i] < 250) return true;
  return false;
}

/**
 * Tint RGBA pixels in place.
 * - transparent images: keep alpha, replace RGB with ink.
 * - opaque images: ink alpha = darkness (light pixels -> transparent), threshold-softened.
 */
export function tintPixels(data: Uint8ClampedArray, ink: Rgb, threshold = 0.5): void {
  const useAlpha = hasTransparency(data);
  for (let i = 0; i < data.length; i += 4) {
    let a = data[i + 3];
    if (!useAlpha) {
      const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
      const darkness = 1 - lum;
      // Smooth step around the threshold so anti-aliased edges stay soft.
      const t = Math.min(1, Math.max(0, (darkness - threshold + 0.1) / 0.2));
      a = Math.round(t * 255);
    }
    data[i] = ink.r;
    data[i + 1] = ink.g;
    data[i + 2] = ink.b;
    data[i + 3] = a;
  }
}
