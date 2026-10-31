// DesignJson (designs.design_json) builder + zod schema for server re-validation.
import { z } from "zod";
import type { DesignJson } from "@/lib/types";
import {
  FONT_FAMILIES, MAX_FONT_SIZE_PX, MAX_LOGO_OFFSET, MAX_LOGO_SCALE, MAX_REPEAT_GAP_PX,
  MAX_TEXT_LENGTH, MIN_FONT_SIZE_PX, MIN_LOGO_SCALE,
} from "./constants";
import { paletteColors } from "./palette";
import type { DesignState } from "./state";

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
    // eslint-disable-next-line no-control-regex
    text: z.string().max(MAX_TEXT_LENGTH).refine((s) => !/[\u0000-\u001f\u007f]/.test(s)),
    fontFamily: z.enum(FONT_FAMILIES).optional(),
    fontSizePx: z.number().min(MIN_FONT_SIZE_PX).max(MAX_FONT_SIZE_PX).optional(),
    logo: z
      .object({
        path: z.string().max(300).nullable(),
        scale: z.number().min(MIN_LOGO_SCALE).max(MAX_LOGO_SCALE),
        offsetX: z.number().min(-MAX_LOGO_OFFSET).max(MAX_LOGO_OFFSET),
        offsetY: z.number().min(-MAX_LOGO_OFFSET).max(MAX_LOGO_OFFSET),
      })
      .strict()
      .nullable()
      .optional(),
    repeatGapPx: z.number().min(0).max(MAX_REPEAT_GAP_PX).optional(),
  })
  .strict()
  .refine((d) => d.textColor !== d.backgroundColor, { message: "text_equals_background" });

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
      ? { path: null, scale: state.logoScale, offsetX: state.logoOffsetX, offsetY: state.logoOffsetY }
      : null,
    repeatGapPx: state.repeatGapPx,
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
