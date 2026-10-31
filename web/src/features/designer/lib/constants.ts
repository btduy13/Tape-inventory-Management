// Designer constants. Pure values, safe on server and client.

/** Logical pixels per millimetre of tape on the 2D strip (export resolution base). */
export const PX_PER_MM = 4;

/** Length of tape shown on the strip / used as the 3D texture period, in mm. */
export const STRIP_LENGTH_MM = 300;

/** Maximum distinct print colours (background + text + accent). */
export const MAX_COLORS = 3;

export const MAX_TEXT_LENGTH = 60;
export const MIN_FONT_SIZE_PX = 12;
export const MAX_FONT_SIZE_PX = 200;
export const MIN_REPEAT_GAP_PX = 0;
export const MAX_REPEAT_GAP_PX = 400;
export const MIN_LOGO_SCALE = 0.2;
export const MAX_LOGO_SCALE = 1.5;
/** Logo offset limits, as a fraction of strip height. */
export const MAX_LOGO_OFFSET = 0.5;

export const MAX_LOGO_BYTES = 5 * 1024 * 1024;

/** System fonts with full Vietnamese glyph coverage (no web font download, CSP-safe). */
export const FONT_FAMILIES = ["Arial", "Tahoma", "Verdana", "Times New Roman", "Georgia"] as const;
export type FontFamily = (typeof FONT_FAMILIES)[number];

/** Quick-pick swatches commonly printed on tape. */
export const SWATCHES = [
  "#ffffff", "#000000", "#c8102e", "#0033a0", "#007a33",
  "#ffcd00", "#ff6a13", "#6d2077", "#8b5a2b", "#d9c3a0",
] as const;

/** Default export pixel ratio for the PNG preview (relative to logical size). */
export const EXPORT_PIXEL_RATIO = 2;
