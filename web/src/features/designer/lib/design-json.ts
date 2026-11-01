// DesignJson (designs.design_json) builder + zod schema for server re-validation.
import { z } from "zod";
import type { DesignJson } from "@/lib/types";
import {
  FONT_FAMILIES, MAX_FONT_SIZE_PX, MAX_LOGO_OFFSET, MAX_LOGO_SCALE, MAX_REPEAT_GAP_PX,
  MAX_OFFSET_X, MAX_TEXT_LENGTH, MIN_FONT_SIZE_PX, MIN_LOGO_SCALE,
} from "./constants";
import { paletteColors } from "./palette";
import { LOGO_COLOR_MODES, type DesignState, type LogoColorMode } from "./state";
import { LENGTH_M_MAX, WIDTH_MM_MAX } from "./tape-spec";

const hex = z.string().regex(/^#[0-9a-f]{6}$/);
const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

/** Server-side validation of a submitted design_json (lead-intake uses this). */
export const designJsonSchema = z
  .object({
    version: z.literal(1),
    presetId: uuid.nullable(),
    backgroundColor: hex,
    textColor: hex,
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
        colorMode: z.enum(LOGO_COLOR_MODES as [LogoColorMode, ...LogoColorMode[]]).optional(),
      })
      .strict()
      .nullable()
      .optional(),
    repeatGapPx: z.number().min(0).max(MAX_REPEAT_GAP_PX).optional(),
    // Tape size (0022). Structural bounds only: lead-intake checks the active DB list / range.
    widthMm: z.number().int().min(1).max(WIDTH_MM_MAX).optional(),
    lengthM: z.number().positive().max(LENGTH_M_MAX).optional(),
    textOffsetX: z.number().min(-MAX_OFFSET_X).max(MAX_OFFSET_X).optional(),
    textOffsetY: z.number().min(-MAX_LOGO_OFFSET).max(MAX_LOGO_OFFSET).optional(),
  })
  .strict()
  .refine((d) => d.textColor !== d.backgroundColor, { message: "text_equals_background" });

/** Drop float noise from drag maths (4 decimals is far below print resolution). */
const r4 = (v: number) => Math.round(v * 1e4) / 1e4;

/** Serialise state to DesignJson. `logo.path` stays null: the server sets it after upload. */
export function toDesignJson(state: DesignState): DesignJson {
  return {
    version: 1,
    presetId: state.preset.id,
    backgroundColor: state.backgroundColor,
    textColor: state.textColor,
    accentColor: state.accentColor,
    text: state.text.trim(),
    fontFamily: state.fontFamily,
    fontSizePx: state.fontSizePx,
    logo: state.logo
      ? {
          path: null,
          scale: r4(state.logoScale),
          offsetX: r4(state.logoOffsetX),
          offsetY: r4(state.logoOffsetY),
          colorMode: state.logoColorMode,
        }
      : null,
    repeatGapPx: state.repeatGapPx,
    widthMm: state.preset.width_mm,
    // NaN (unfinished input) becomes 0, which the server rejects.
    lengthM: Number.isFinite(state.preset.length_m) ? state.preset.length_m : 0,
    textOffsetX: r4(state.textOffsetX),
    textOffsetY: r4(state.textOffsetY),
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
