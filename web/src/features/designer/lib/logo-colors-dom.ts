// Browser wrapper for logo-colors: decode the (already sanitized / re-encoded) logo object URL,
// downscale to <= ANALYSIS_MAX_SIDE with nearest-neighbour sampling (no new blend colours) and count
// its inks. ~65k pixels: fast enough on the main thread.
import { ANALYSIS_MAX_SIDE, analyzeLogoPixels, type LogoColorAnalysis } from "./logo-colors";

const TIMEOUT_MS = 4000;

export function analyzeLogoUrl(url: string, width: number, height: number): Promise<LogoColorAnalysis | null> {
  const work = new Promise<LogoColorAnalysis | null>((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const w0 = img.naturalWidth || width;
        const h0 = img.naturalHeight || height;
        const k = Math.min(1, ANALYSIS_MAX_SIDE / Math.max(w0, h0, 1));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(w0 * k));
        canvas.height = Math.max(1, Math.round(h0 * k));
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const d = ctx.getImageData(0, 0, canvas.width, canvas.height);
        resolve(analyzeLogoPixels({ data: d.data, width: d.width, height: d.height }));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS));
  return Promise.race([work, timeout]);
}
