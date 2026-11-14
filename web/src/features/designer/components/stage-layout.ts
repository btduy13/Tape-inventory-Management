"use client";
// Text measurement + pattern layout for a design state (browser only: uses a 2D canvas context).
import { borderPx } from "../lib/border";
import { computePatternLayout, printBand, stripSize, textBoxRatio, type PatternLayout } from "../lib/pattern";
import { textLines } from "../lib/state";
import type { DesignState } from "../lib/state";

let measureCtx: CanvasRenderingContext2D | null = null;

/** Width of the widest line of `text` (lines separated by "\n"). */
export function measureTextWidth(text: string, fontFamily: string, sizePx: number): number {
  const lines = text.split("\n").filter((l) => l.length > 0);
  if (lines.length === 0) return 0;
  if (typeof document !== "undefined") measureCtx ??= document.createElement("canvas").getContext("2d");
  const ctx = measureCtx;
  if (!ctx) return Math.max(...lines.map((l) => l.length)) * sizePx * 0.6;
  ctx.font = `bold ${sizePx}px "${fontFamily}"`;
  return Math.max(...lines.map((l) => ctx.measureText(l).width));
}

/** Layout exactly as the stage renders it. `logoReady` is false until the logo bitmap decoded. */
export function layoutForState(s: DesignState, logoReady: boolean): PatternLayout {
  const strip = stripSize(s.preset.width_mm);
  const border = borderPx(s.border, s.preset.width_mm);
  const band = printBand(strip, border);
  const lines = textLines(s.text);
  const text = lines.join("\n");
  const fontSize = Math.min(s.fontSizePx, (band.bottom - band.top) / textBoxRatio(lines.length));
  return computePatternLayout({
    strip,
    textWidth: measureTextWidth(text, s.fontFamily, fontSize),
    textLines: Math.max(1, lines.length),
    fontSize,
    logoAspect: s.logo && logoReady ? s.logo.width / s.logo.height : null,
    logoScale: s.logoScale,
    logoOffsetX: s.logoOffsetX,
    logoOffsetY: s.logoOffsetY,
    logoRotation: s.logoRotation,
    textOffsetX: s.textOffsetX,
    textOffsetY: s.textOffsetY,
    repeatGapPx: s.repeatGapPx,
    pattern: s.pattern,
    borderPx: border,
  });
}
