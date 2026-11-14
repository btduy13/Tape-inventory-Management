"use client";
// Loads the logo object URL and returns a canvas for Konva. The logo prints in its own original
// colours; only the colour-blocks pattern knocks it out in the tape colour (tintCanvas).
import { useEffect, useMemo, useState } from "react";
import type { LogoAsset } from "../lib/state";

const MAX_SIDE = 1024;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode"));
    img.src = url;
  });
}

/** Draws the image in its original colours, longest side capped at MAX_SIDE px. */
export function renderLogo(img: CanvasImageSource, w: number, h: number): HTMLCanvasElement {
  const k = Math.min(1, MAX_SIDE / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * k));
  canvas.height = Math.max(1, Math.round(h * k));
  canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Logo in one colour: the knockout used in colour blocks. Inked pixels take `color`; white parts
 *  of the logo (e.g. inside a ring) stay open so the block colour shows through, like a print. */
export function tintCanvas(src: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = src.width;
  canvas.height = src.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return src;
  ctx.drawImage(src, 0, 0);
  try {
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      // Lightness-to-alpha: white -> open, ink -> solid, anti-aliasing in between.
      const ink = 255 - Math.min(d[i], d[i + 1], d[i + 2]);
      d[i + 3] = Math.round((d[i + 3] * Math.min(255, ink * 1.4)) / 255);
    }
    ctx.putImageData(img, 0, 0);
  } catch {
    // Tainted / unreadable canvas: plain silhouette below.
  }
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

export function useLogoCanvas(logo: LogoAsset | null): HTMLCanvasElement | null {
  // Keyed by URL so a stale image is never shown for a newer logo (no sync setState in effects).
  const [loaded, setLoaded] = useState<{ url: string; img: HTMLImageElement } | null>(null);

  useEffect(() => {
    if (!logo) return;
    let cancelled = false;
    const url = logo.url;
    loadImage(url)
      .then((img) => {
        if (!cancelled) setLoaded({ url, img });
      })
      .catch(() => {
        if (!cancelled) setLoaded(null);
      });
    return () => {
      cancelled = true;
    };
  }, [logo]);

  const img = logo && loaded?.url === logo.url ? loaded.img : null;
  return useMemo(() => (img && logo ? renderLogo(img, logo.width, logo.height) : null), [img, logo]);
}
