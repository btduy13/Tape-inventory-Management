// Export helpers: PNG blob from the registered stage renderer, design JSON blob, download.
import { EXPORT_PIXEL_RATIO } from "./constants";
import { toDesignJson } from "./design-json";
import type { DesignStore } from "./store";

export function canvasToBlob(canvas: HTMLCanvasElement, type = "image/png"): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("export_failed"))), type);
  });
}

/** PNG of the current strip. Rejects when the canvas is not mounted yet. */
export async function exportDesignPng(store: DesignStore, pixelRatio = EXPORT_PIXEL_RATIO): Promise<Blob> {
  const renderer = store.getRenderer();
  if (!renderer) throw new Error("designer_not_ready");
  return canvasToBlob(renderer.toCanvas(pixelRatio));
}

export function exportDesignJsonBlob(store: DesignStore): Blob {
  return new Blob([JSON.stringify(toDesignJson(store.getState()), null, 2)], { type: "application/json" });
}

/** Trigger a browser download for a blob (user-initiated export only). */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
