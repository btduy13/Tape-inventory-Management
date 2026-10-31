// Designer state + pure reducer. All palette / limit rules are enforced here.
import {
  FONT_FAMILIES, MAX_FONT_SIZE_PX, MAX_LOGO_OFFSET, MAX_LOGO_SCALE, MAX_REPEAT_GAP_PX,
  MAX_TEXT_LENGTH, MIN_FONT_SIZE_PX, MIN_LOGO_SCALE, MIN_REPEAT_GAP_PX, type FontFamily,
} from "./constants";
import { normalizeHex } from "./palette";
import { DEFAULT_PRESETS, type PresetOption } from "./presets";

export type LogoKind = "png" | "jpg" | "svg";

/** Client-side logo asset. `file` is what lead-intake uploads (SVG already sanitized). */
export type LogoAsset = {
  file: File;
  kind: LogoKind;
  /** blob: object URL of `file`; revoked by the store when replaced. */
  url: string;
  width: number;
  height: number;
};

export type DesignState = {
  preset: PresetOption;
  backgroundColor: string;
  textColor: string;
  accentColor: string | null;
  text: string;
  fontFamily: FontFamily;
  fontSizePx: number;
  logo: LogoAsset | null;
  logoScale: number;
  logoOffsetX: number;
  logoOffsetY: number;
  repeatGapPx: number;
};

export type ColorRole = "backgroundColor" | "textColor" | "accentColor";

export type DesignAction =
  | { type: "setPreset"; preset: PresetOption }
  | { type: "setColor"; role: ColorRole; color: string | null }
  | { type: "setText"; text: string }
  | { type: "setFontFamily"; fontFamily: string }
  | { type: "setFontSize"; px: number }
  | { type: "setLogo"; logo: LogoAsset | null }
  | { type: "setLogoTransform"; scale?: number; offsetX?: number; offsetY?: number }
  | { type: "setRepeatGap"; px: number }
  | { type: "reset"; preset?: PresetOption };

export function createInitialState(preset: PresetOption = DEFAULT_PRESETS[0]): DesignState {
  return {
    preset,
    backgroundColor: "#d9c3a0",
    textColor: "#c8102e",
    accentColor: null,
    text: "",
    fontFamily: "Arial",
    fontSizePx: Math.round(preset.width_mm * 4 * 0.45),
    logo: null,
    logoScale: 1,
    logoOffsetX: 0,
    logoOffsetY: 0,
    repeatGapPx: 80,
  };
}

const clamp = (v: number, lo: number, hi: number) =>
  Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo;

/** Strip control characters / newlines and cap length. */
export function sanitizeText(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, MAX_TEXT_LENGTH);
}

function applyColor(state: DesignState, role: ColorRole, raw: string | null): DesignState {
  if (role === "accentColor" && raw === null) return { ...state, accentColor: null };
  const color = normalizeHex(raw);
  if (!color) return state;
  if (role === "accentColor") {
    // Accent equal to an existing colour adds nothing: keep palette minimal.
    const dup = color === state.backgroundColor || color === state.textColor;
    return { ...state, accentColor: dup ? null : color };
  }
  const other = role === "backgroundColor" ? state.textColor : state.backgroundColor;
  if (color === other) return state; // text must stay visible on background
  const next = { ...state, [role]: color };
  if (next.accentColor === color) next.accentColor = null;
  return next;
}

export function designReducer(state: DesignState, action: DesignAction): DesignState {
  switch (action.type) {
    case "setPreset":
      return { ...state, preset: action.preset };
    case "setColor":
      return applyColor(state, action.role, action.color);
    case "setText":
      return { ...state, text: sanitizeText(action.text) };
    case "setFontFamily":
      return (FONT_FAMILIES as readonly string[]).includes(action.fontFamily)
        ? { ...state, fontFamily: action.fontFamily as FontFamily }
        : state;
    case "setFontSize":
      return { ...state, fontSizePx: Math.round(clamp(action.px, MIN_FONT_SIZE_PX, MAX_FONT_SIZE_PX)) };
    case "setLogo":
      return action.logo
        ? { ...state, logo: action.logo }
        : { ...state, logo: null, logoScale: 1, logoOffsetX: 0, logoOffsetY: 0 };
    case "setLogoTransform":
      return {
        ...state,
        logoScale: action.scale === undefined ? state.logoScale : clamp(action.scale, MIN_LOGO_SCALE, MAX_LOGO_SCALE),
        logoOffsetX: action.offsetX === undefined ? state.logoOffsetX : clamp(action.offsetX, -MAX_LOGO_OFFSET, MAX_LOGO_OFFSET),
        logoOffsetY: action.offsetY === undefined ? state.logoOffsetY : clamp(action.offsetY, -MAX_LOGO_OFFSET, MAX_LOGO_OFFSET),
      };
    case "setRepeatGap":
      return { ...state, repeatGapPx: Math.round(clamp(action.px, MIN_REPEAT_GAP_PX, MAX_REPEAT_GAP_PX)) };
    case "reset":
      return createInitialState(action.preset ?? state.preset);
    default:
      return state;
  }
}
