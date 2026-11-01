"use client";
// Text measurement + pattern layout for a design state (browser only: uses a 2D canvas context).
import { computePatternLayout, printBand, stripSize, type PatternLayout } from "../lib/pattern";
import type { DesignState } from "../lib/state";

let measureCtx: CanvasRenderingContext2D | null = null;

export function measureTextWidth(text: string, fontFamily: string, sizePx: number): number {
  if (!text) return 0;
  if (typeof document !== "undefined") measureCtx ??= document.createElement("canvas").getContext("2d");
  if (!measureCtx) return text.length * sizePx * 0.6;
  measureCtx.font = `bold ${sizePx}px "${fontFamily}"`;
  return measureCtx.measureText(text).width;
}

/** Layout exactly as the stage renders it. `logoReady` is false until the logo bitmap decoded. */
export function layoutForState(s: DesignState, logoReady: boolean): PatternLayout {
  const strip = stripSize(s.preset.width_mm);
  const band = printBand(strip);
  const fontSize = Math.min(s.fontSizePx, band.bottom - band.top);
  const text = s.text.trim();
  return computePatternLayout({
    strip,
    textWidth: measureTextWidth(text, s.fontFamily, fontSize),
    fontSize,
    logoAspect: s.logo && logoReady ? s.logo.width / s.logo.height : null,
    logoScale: s.logoScale,
    logoOffsetX: s.logoOffsetX,
    logoOffsetY: s.logoOffsetY,
    textOffsetX: s.textOffsetX,
    textOffsetY: s.textOffsetY,
    repeatGapPx: s.repeatGapPx,
  });
}
