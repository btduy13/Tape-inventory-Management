"use client";
// Loads the logo object URL and returns canvases for Konva / thumbnails:
//   useLogoCanvas  the logo in its original colours;
//   usePrintLogo   the logo as it prints: one-ink (logo-mono.ts) unless the customer chose the
//                  logo's own colours, plus its knockout for colour blocks (tape colour).
import { useEffect, useMemo, useState } from "react";
import { monoLogoMask, type MonoOptions } from "../lib/logo-mono";
import { hexToRgb } from "../lib/palette";
import type { DesignState, LogoAsset } from "../lib/state";

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

/** The logo in one ink: `color` where the logo prints, transparent elsewhere, cropped to the
 *  printed part (a removed background leaves no empty margin, so the logo fills its box). */
export function monoCanvas(src: HTMLCanvasElement, color: string, opts: MonoOptions): HTMLCanvasElement {
  const read = src.getContext("2d", { willReadFrequently: true });
  if (!read) return src;
  try {
    const w = src.width;
    const h = src.height;
    const px = read.getImageData(0, 0, w, h);
    const res = monoLogoMask({ data: px.data, width: w, height: h }, opts);
    const box = res ? inkBounds(res.mask, w, h) : null;
    const canvas = document.createElement("canvas");
    if (!res || !box) {
      canvas.width = w;
      canvas.height = h;
      return canvas; // nothing to print
    }
    canvas.width = box.w;
    canvas.height = box.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return src;
    const out = ctx.createImageData(box.w, box.h);
    const { r, g, b } = hexToRgb(color);
    for (let y = 0; y < box.h; y++) {
      for (let x = 0; x < box.w; x++) {
        const o = (y * box.w + x) * 4;
        out.data[o] = r;
        out.data[o + 1] = g;
        out.data[o + 2] = b;
        out.data[o + 3] = res.mask[(box.y + y) * w + box.x + x];
      }
    }
    ctx.putImageData(out, 0, 0);
    return canvas;
  } catch {
    return src; // unreadable canvas: show the original rather than nothing
  }
}

/** Bounds of the printed pixels plus a 2% margin, or null when nothing prints. */
function inkBounds(mask: Uint8ClampedArray, w: number, h: number): { x: number; y: number; w: number; h: number } | null {
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x] <= 16) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return null;
  const pad = Math.max(2, Math.round(0.02 * Math.max(x1 - x0, y1 - y0)));
  x0 = Math.max(0, x0 - pad);
  y0 = Math.max(0, y0 - pad);
  x1 = Math.min(w - 1, x1 + pad);
  y1 = Math.min(h - 1, y1 + pad);
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/**
 * Logo in one colour for the colour-block knockout. `lightness`: white parts of a full-colour
 * logo stay open (block colour shows through, like a print); off for a one-ink logo, whose ink
 * alone defines the shape (it may itself be white).
 */
export function tintCanvas(src: HTMLCanvasElement, color: string, lightness = true): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = src.width;
  canvas.height = src.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return src;
  ctx.drawImage(src, 0, 0);
  if (lightness) {
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
  const w = logo?.width ?? 0;
  const h = logo?.height ?? 0;
  return useMemo(() => (img && w > 0 && h > 0 ? renderLogo(img, w, h) : null), [img, w, h]);
}

/** The logo as it prints (one-ink or original colours) and its colour-block knockout. */
export function usePrintLogo(s: DesignState): { logo: HTMLCanvasElement | null; knockout: HTMLCanvasElement | null } {
  const raw = useLogoCanvas(s.logo);
  const { on, invert, level } = s.logoMono;
  const color = s.logoMono.color ?? s.textColor;
  const logo = useMemo(
    () => (raw && on ? monoCanvas(raw, color, { invert, level }) : raw),
    [raw, on, color, invert, level],
  );
  const knockout = useMemo(() => (logo ? tintCanvas(logo, s.backgroundColor, !on) : null), [logo, s.backgroundColor, on]);
  return { logo, knockout };
}
