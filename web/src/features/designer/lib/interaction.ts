// Pure maths for canvas interaction (drag, resize, keyboard nudge). Units: offsets are a fraction
// of strip height (same as DesignState), positions/sizes are logical strip px.
import { NUDGE_STEP } from "./constants";
import { LOGO_HEIGHT_RATIO, type PatternLayout, type StripSize } from "./pattern";
import type { DesignAction } from "./state";

export type ElementKind = "logo" | "text";

/** New offsets after the element of tile `tileIndex` was moved to (x, y). */
export function offsetFromPosition(
  layout: PatternLayout,
  strip: StripSize,
  kind: ElementKind,
  tileIndex: number,
  x: number,
  y: number,
): { offsetX: number; offsetY: number } | null {
  const box = layout.tiles[tileIndex]?.[kind];
  const eff = layout.effective[kind];
  if (!box || !eff || strip.height <= 0) return null;
  return { offsetX: eff.x + (x - box.x) / strip.height, offsetY: eff.y + (y - box.y) / strip.height };
}

/** Action that moves `kind` to the given offsets. */
export function moveAction(kind: ElementKind, offsetX: number, offsetY: number): DesignAction {
  return kind === "logo"
    ? { type: "setLogoTransform", offsetX, offsetY }
    : { type: "setTextOffset", offsetX, offsetY };
}

const NUDGE_KEYS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/** Keyboard nudge for the selected element, or null when the key is not an arrow. */
export function nudgeAction(layout: PatternLayout, kind: ElementKind, key: string, big: boolean): DesignAction | null {
  const dir = NUDGE_KEYS[key];
  const eff = layout.effective[kind];
  if (!dir || !eff) return null;
  const step = NUDGE_STEP * (big ? 5 : 1);
  return moveAction(kind, eff.x + dir[0] * step, eff.y + dir[1] * step);
}

/** Logo scale that renders the logo at `height` px (inverse of the pattern layout). */
export function logoScaleFromHeight(height: number, strip: StripSize, fit: number): number {
  const denom = strip.height * LOGO_HEIGHT_RATIO * (fit > 0 ? fit : 1);
  return denom > 0 ? height / denom : 1;
}

/** Requested font size after a resize handle scaled the rendered text by `scale`. */
export function fontSizeFromScale(renderedFontSize: number, scale: number): number {
  return Math.round(renderedFontSize * (Number.isFinite(scale) && scale > 0 ? scale : 1));
}

/** Delete / Backspace removes the selected element. */
export function deleteAction(kind: ElementKind): DesignAction {
  return kind === "logo" ? { type: "setLogo", logo: null } : { type: "setText", text: "" };
}
