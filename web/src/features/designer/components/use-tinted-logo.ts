"use client";
// Loads the logo object URL and returns a single-ink canvas (palette enforcement for logos).
import { useEffect, useState } from "react";
import { hexToRgb } from "../lib/palette";
import type { LogoAsset } from "../lib/state";
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

export function renderTinted(img: CanvasImageSource, w: number, h: number, ink: string): HTMLCanvasElement {
  const k = Math.min(1, MAX_SIDE / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * k));
  canvas.height = Math.max(1, Math.round(h * k));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  tintPixels(data.data, hexToRgb(ink));
  ctx.putImageData(data, 0, 0);
  return canvas;
}

export function useTintedLogo(logo: LogoAsset | null, ink: string): HTMLCanvasElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [tinted, setTinted] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!logo) {
      setImg(null);
      return;
    }
    loadImage(logo.url)
      .then((i) => !cancelled && setImg(i))
      .catch(() => !cancelled && setImg(null));
    return () => {
      cancelled = true;
    };
  }, [logo]);

  useEffect(() => {
    if (!img || !logo) {
      setTinted(null);
      return;
    }
    setTinted(renderTinted(img, logo.width, logo.height, ink));
  }, [img, logo, ink]);

  return tinted;
}
