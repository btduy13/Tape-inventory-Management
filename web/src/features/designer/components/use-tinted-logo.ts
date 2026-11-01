"use client";
// Loads the logo object URL and returns a canvas for Konva: original colours, or a single ink
// (palette enforcement) when the user picks "tint".
import { useEffect, useMemo, useState } from "react";
import { hexToRgb } from "../lib/palette";
import type { LogoAsset, LogoColorMode } from "../lib/state";
import { tintPixels } from "../lib/tint";

const MAX_SIDE = 1024;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode"));
    img.src = url;
  });
}

/** Draws the image (max MAX_SIDE px) and tints it when `ink` is given. */
export function renderLogo(img: CanvasImageSource, w: number, h: number, ink: string | null): HTMLCanvasElement {
  const k = Math.min(1, MAX_SIDE / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * k));
  canvas.height = Math.max(1, Math.round(h * k));
  const ctx = canvas.getContext("2d", { willReadFrequently: ink !== null });
  if (!ctx) return canvas;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  if (ink) {
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    tintPixels(data.data, hexToRgb(ink));
    ctx.putImageData(data, 0, 0);
  }
  return canvas;
}

export function useTintedLogo(logo: LogoAsset | null, ink: string, mode: LogoColorMode = "tint"): HTMLCanvasElement | null {
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
  const tintInk = mode === "tint" ? ink : null;
  return useMemo(
    () => (img && logo ? renderLogo(img, logo.width, logo.height, tintInk) : null),
    [img, logo, tintInk],
  );
}
