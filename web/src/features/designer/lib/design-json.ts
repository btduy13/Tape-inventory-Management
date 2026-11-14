// DesignJson (designs.design_json) builder + zod schema for server re-validation.
import { z } from "zod";
import { DESIGN_PATTERNS, type DesignJson, type DesignPattern } from "@/lib/types";
import {
  FONT_FAMILIES, MAX_FONT_SIZE_PX, MAX_LOGO_OFFSET, MAX_LOGO_SCALE, MAX_REPEAT_GAP_PX,
  MAX_OFFSET_X, MAX_TEXT_LENGTH, MIN_FONT_SIZE_PX, MIN_LOGO_SCALE,
} from "./constants";
import { MAX_INK_REPORT, printInks } from "./logo-colors";
import { paletteColors } from "./palette";
import type { DesignState } from "./state";
import { LENGTH_M_MAX, WIDTH_MM_MAX } from "./tape-spec";

const hex = z.string().regex(/^#[0-9a-f]{6}$/);
/** Legacy logo colour modes (designs saved before the logo-colour option was removed). */
const LEGACY_LOGO_COLOR_MODES = ["original", "tint"] as const;
const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

/** Server-side validation of a submitted design_json (lead-intake uses this). */
export const designJsonSchema = z
  .object({
    version: z.literal(1),
    presetId: uuid.nullable(),
    backgroundColor: hex,
    textColor: hex,
    // Legacy: old designs carried an accent (single logo ink). Still accepted, never written.
    accentColor: hex.nullable().optional(),
    text: z.string().max(MAX_TEXT_LENGTH).refine((s) => !/[\u0000-\u001f\u007f]/.test(s)),
    fontFamily: z.enum(FONT_FAMILIES).optional(),
    fontSizePx: z.number().min(MIN_FONT_SIZE_PX).max(MAX_FONT_SIZE_PX).optional(),
    logo: z
      .object({
        path: z.string().max(300).nullable(),
        scale: z.number().min(MIN_LOGO_SCALE).max(MAX_LOGO_SCALE),
        offsetX: z.number().min(-MAX_OFFSET_X).max(MAX_OFFSET_X),
        offsetY: z.number().min(-MAX_LOGO_OFFSET).max(MAX_LOGO_OFFSET),
        // Legacy: the logo always prints in its own colours now. Still accepted, never written.
        colorMode: z.enum(LEGACY_LOGO_COLOR_MODES).optional(),
      })
      .strict()
      .nullable()
      .optional(),
    repeatGapPx: z.number().min(0).max(MAX_REPEAT_GAP_PX).optional(),
    // Repeat layout (pattern.ts). Missing on designs saved before patterns: means "straight".
    pattern: z.enum(DESIGN_PATTERNS as [DesignPattern, ...DesignPattern[]]).optional(),
    // Tape size (0022). Structural bounds only: lead-intake checks the active DB list / range.
    widthMm: z.number().int().min(1).max(WIDTH_MM_MAX).optional(),
    lengthM: z.number().positive().max(LENGTH_M_MAX).optional(),
    textOffsetX: z.number().min(-MAX_OFFSET_X).max(MAX_OFFSET_X).optional(),
    textOffsetY: z.number().min(-MAX_LOGO_OFFSET).max(MAX_LOGO_OFFSET).optional(),
    // Print inks (logo-colors.ts, client-computed: the server cannot re-analyse a logo cheaply).
    // Informational for staff; counts the tape colour, text colour and logo colours.
    inkColors: z.array(hex).max(MAX_INK_REPORT).optional(),
    inkCount: z.number().int().min(0).max(64).optional(),
    inkOverLimit: z.boolean().optional(),
  })
  .strict()
  .refine((d) => d.textColor !== d.backgroundColor, { message: "text_equals_background" });

/** Drop float noise from drag maths (4 decimals is far below print resolution). */
const r4 = (v: number) => Math.round(v * 1e4) / 1e4;

/** Serialise state to DesignJson. `logo.path` stays null: the server sets it after upload. */
export function toDesignJson(state: DesignState): DesignJson {
  const inks = printInks(state);
  return {
    version: 1,
    presetId: state.preset.id,
    backgroundColor: state.backgroundColor,
    textColor: state.textColor,
    text: state.text.trim(),
    fontFamily: state.fontFamily,
    fontSizePx: state.fontSizePx,
    logo: state.logo
      ? {
          path: null,
          scale: r4(state.logoScale),
          offsetX: r4(state.logoOffsetX),
          offsetY: r4(state.logoOffsetY),
        }
      : null,
    repeatGapPx: state.repeatGapPx,
    pattern: state.pattern,
    widthMm: state.preset.width_mm,
    // NaN (unfinished input) becomes 0, which the server rejects.
    lengthM: Number.isFinite(state.preset.length_m) ? state.preset.length_m : 0,
    textOffsetX: r4(state.textOffsetX),
    textOffsetY: r4(state.textOffsetY),
    inkColors: inks.colors.slice(0, MAX_INK_REPORT),
    inkCount: inks.count,
    inkOverLimit: inks.overLimit,
  };
}

/** Everything lead-intake needs for a `designs` row, minus server-assigned paths. */
export type DesignSubmission = {
  preset_id: string | null;
  width_mm: number;
  length_m: number;
  thickness_mic: number;
  colors: string[];
  print_text: string | null;
  design_json: DesignJson;
};

export function buildDesignSubmission(state: DesignState): DesignSubmission {
  const json = toDesignJson(state);
  return {
    preset_id: state.preset.id,
    width_mm: state.preset.width_mm,
    length_m: state.preset.length_m,
    thickness_mic: state.preset.thickness_mic,
    colors: paletteColors(state),
    print_text: json.text.length > 0 ? json.text : null,
    design_json: json,
  };
}
