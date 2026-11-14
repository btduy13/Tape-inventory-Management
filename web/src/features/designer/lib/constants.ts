// Designer constants. Pure values, safe on server and client.

/** Logical pixels per millimetre of tape on the 2D strip (export resolution base). */
export const PX_PER_MM = 4;

/** Length of tape shown on the strip / used as the 3D texture period, in mm. */
export const STRIP_LENGTH_MM = 300;

/** Maximum distinct print colours (background + text + accent). */
export const MAX_COLORS = 3;
/** Above this many inks the exact count means nothing to a customer: show "hơn 6" instead. */
export const INK_DISPLAY_CAP = 6;

export const MAX_TEXT_LENGTH = 120;
/** Print text lines (Enter starts a new line), e.g. name / phone / address. */
export const MAX_TEXT_LINES = 4;
/** Line height of multi-line print text, times the font size. */
export const TEXT_LINE_HEIGHT = 1.15;
export const MIN_FONT_SIZE_PX = 12;
export const MAX_FONT_SIZE_PX = 200;
export const MIN_REPEAT_GAP_PX = 0;
export const MAX_REPEAT_GAP_PX = 400;
export const MIN_LOGO_SCALE = 0.2;
export const MAX_LOGO_SCALE = 1.5;
/** Vertical offset limit for logo / text, as a fraction of strip height. */
export const MAX_LOGO_OFFSET = 0.5;
/** Horizontal offset limit for logo / text (fraction of strip height); the layout clamps further to the tile. */
export const MAX_OFFSET_X = 3;
/** Unprinted margin at each tape edge, as a fraction of tape width. Content stays inside the band. */
export const PRINT_MARGIN_RATIO = 0.05;
/** Narrower tapes print only the straight pattern (too little room for the others). */
export const MIN_PATTERN_WIDTH_MM = 48;
/** Border lines: thinnest printable line, thickest line, and max share of the tape width. */
export const BORDER_MIN_MM = 3;
export const BORDER_MAX_MM = 8;
export const BORDER_MAX_RATIO = 0.2;
/** Logo rotation range, degrees (either way). */
export const MAX_LOGO_ROTATION = 180;
/** Keyboard nudge step (fraction of strip height); Shift multiplies by 5. */
export const NUDGE_STEP = 0.02;
/** WEBP / GIF logos are re-encoded to PNG client-side, capped to this many px per side. */
export const CONVERT_MAX_SIDE = 2000;

export const MAX_LOGO_BYTES = 5 * 1024 * 1024;

/** System fonts with full Vietnamese glyph coverage (no web font download, CSP-safe). */
export const FONT_FAMILIES = ["Arial", "Tahoma", "Verdana", "Times New Roman", "Georgia"] as const;
export type FontFamily = (typeof FONT_FAMILIES)[number];

/** Quick-pick swatches commonly printed on tape. */
export const SWATCHES = [
  "#ffffff", "#000000", "#cf1f27", "#0033a0", "#007a33",
  "#ffcd00", "#ff6a13", "#6d2077", "#8b5a2b", "#d9c3a0",
] as const;

/** Default export pixel ratio for the PNG preview (relative to logical size). */
export const EXPORT_PIXEL_RATIO = 2;
