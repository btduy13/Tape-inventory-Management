// Browser wrapper for logo-clean: decode the logo object URL onto a canvas (SVGs are rasterised at
// CLEAN_MAX_SIDE), clean it, and return a PNG object URL of the result. Null when nothing changed,
// the browser cannot do it, or it takes too long (the original is then shown as-is).
import { cleanLogoPixels } from "./logo-clean";

export type CleanedLogo = { url: string; width: number; height: number; bgRemoved: boolean; trimmed: boolean };
export type LogoCleaner = (url: string, width: number, height: number) => Promise<CleanedLogo | null>;

/** Longest side processed / produced (enough for a sharp on-screen preview). */
export const CLEAN_MAX_SIDE = 1200;
const TIMEOUT_MS = 5000;

export const cleanLogoUrl: LogoCleaner = (url, width, height) => {
  const work = new Promise<CleanedLogo | null>((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const w0 = img.naturalWidth || width;
        const h0 = img.naturalHeight || height;
        // Upscale small SVGs too (vector): rasterise at the working size.
        const k = Math.min(CLEAN_MAX_SIDE / Math.max(w0, h0, 1), 4);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(w0 * k));
        canvas.height = Math.max(1, Math.round(h0 * k));
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const d = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const res = cleanLogoPixels({ data: d.data, width: d.width, height: d.height });
        if (!res) return resolve(null);
        const out = document.createElement("canvas");
        out.width = res.width;
        out.height = res.height;
        const octx = out.getContext("2d");
        if (!octx) return resolve(null);
        const img2 = octx.createImageData(res.width, res.height);
        img2.data.set(res.data);
        octx.putImageData(img2, 0, 0);
        out.toBlob((blob) => {
          if (!blob) return resolve(null);
          resolve({ url: URL.createObjectURL(blob), width: res.width, height: res.height, bgRemoved: res.bgRemoved, trimmed: res.trimmed });
        }, "image/png");
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS));
  return Promise.race([work, timeout]);
};
