// Designer state + pure reducer. All palette / limit rules are enforced here.
import {
  FONT_FAMILIES, MAX_FONT_SIZE_PX, MAX_LOGO_OFFSET, MAX_LOGO_SCALE, MAX_REPEAT_GAP_PX,
  MAX_OFFSET_X, MAX_TEXT_LENGTH, MIN_FONT_SIZE_PX, MIN_LOGO_SCALE, MIN_REPEAT_GAP_PX, type FontFamily,
} from "./constants";
import { normalizeHex } from "./palette";
import { DEFAULT_PRESETS, type PresetOption } from "./presets";

export type LogoKind = "png" | "jpg" | "svg";

/** "original": logo keeps its own colours; "tint": printed in one ink (accent, else text colour). */
export type LogoColorMode = "original" | "tint";
export const LOGO_COLOR_MODES: readonly LogoColorMode[] = ["original", "tint"];

/** Sample design applied in one step (colours, text, font). Font size is per 48mm and rescaled. */
export type DesignTemplate = {
  id: string;
  backgroundColor: string;
  textColor: string;
  text: string;
  fontFamily: FontFamily;
};

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
  logoColorMode: LogoColorMode;
  /** Text position offsets, fraction of strip height (same unit as logo offsets). */
  textOffsetX: number;
  textOffsetY: number;
  repeatGapPx: number;
};

export type ColorRole = "backgroundColor" | "textColor" | "accentColor";

export type DesignAction =
  | { type: "setPreset"; preset: PresetOption }
  /** Pick a tape width (mm); length / thickness are kept. */
  | { type: "setWidth"; widthMm: number }
  /** Customer-typed roll length (m). May be NaN / out of range while typing; submit re-checks. */
  | { type: "setLength"; lengthM: number }
  | { type: "setColor"; role: ColorRole; color: string | null }
  | { type: "setText"; text: string }
  | { type: "setFontFamily"; fontFamily: string }
  | { type: "setFontSize"; px: number }
  | { type: "setLogo"; logo: LogoAsset | null }
  | { type: "setLogoTransform"; scale?: number; offsetX?: number; offsetY?: number }
  | { type: "setLogoColorMode"; mode: LogoColorMode }
  | { type: "setTextOffset"; offsetX?: number; offsetY?: number }
  | { type: "applyTemplate"; template: DesignTemplate }
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
    fontSizePx: defaultFontSize(preset.width_mm),
    logo: null,
    logoScale: 1,
    logoOffsetX: 0,
    logoOffsetY: 0,
    logoColorMode: "original",
    textOffsetX: 0,
    textOffsetY: 0,
    repeatGapPx: 80,
  };
}

/** Default font size for a tape width: 45% of the tape width in logical px. */
export function defaultFontSize(widthMm: number): number {
  return Math.round(widthMm * 4 * 0.45);
}

/** Largest font that fits the printable band of a tape width (90% of the width). */
export function maxFontSize(widthMm: number): number {
  return Math.min(MAX_FONT_SIZE_PX, Math.round(widthMm * 4 * 0.9));
}

const clamp = (v: number, lo: number, hi: number) =>
  Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo;

const clampFont = (px: number) => Math.round(clamp(px, MIN_FONT_SIZE_PX, MAX_FONT_SIZE_PX));
const clampOffX = (v: number) => clamp(v, -MAX_OFFSET_X, MAX_OFFSET_X);
const clampOffY = (v: number) => clamp(v, -MAX_LOGO_OFFSET, MAX_LOGO_OFFSET);

/** Strip control characters / newlines and cap length. */
export function sanitizeText(input: string): string {
  return input.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, MAX_TEXT_LENGTH);
}

/** Tape size with a new width / length (custom size: no tape_presets row). */
function sizeWith(p: PresetOption, widthMm: number, lengthM: number): PresetOption {
  return { ...p, id: null, label: `${widthMm}mm x ${lengthM}m`, width_mm: widthMm, length_m: lengthM };
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

function applyTemplate(state: DesignState, tpl: DesignTemplate): DesignState {
  const bg = normalizeHex(tpl.backgroundColor);
  const fg = normalizeHex(tpl.textColor);
  if (!bg || !fg || bg === fg || !(FONT_FAMILIES as readonly string[]).includes(tpl.fontFamily)) return state;
  return {
    ...state,
    backgroundColor: bg,
    textColor: fg,
    accentColor: null,
    text: sanitizeText(tpl.text),
    fontFamily: tpl.fontFamily,
    fontSizePx: defaultFontSize(state.preset.width_mm),
    textOffsetX: 0,
    textOffsetY: 0,
  };
}

export function designReducer(state: DesignState, action: DesignAction): DesignState {
  switch (action.type) {
    case "setPreset": {
      // Keep the text the same relative size on the new tape width.
      const ratio = action.preset.width_mm / (state.preset.width_mm || action.preset.width_mm);
      const px = Math.min(clampFont(state.fontSizePx * ratio), maxFontSize(action.preset.width_mm));
      return { ...state, preset: action.preset, fontSizePx: px };
    }
    case "setWidth": {
      if (!(Number.isFinite(action.widthMm) && action.widthMm > 0)) return state;
      const preset = sizeWith(state.preset, action.widthMm, state.preset.length_m);
      return designReducer(state, { type: "setPreset", preset });
    }
    case "setLength":
      return { ...state, preset: sizeWith(state.preset, state.preset.width_mm, action.lengthM) };
    case "setColor":
      return applyColor(state, action.role, action.color);
    case "setText":
      return { ...state, text: sanitizeText(action.text) };
    case "setFontFamily":
      return (FONT_FAMILIES as readonly string[]).includes(action.fontFamily)
        ? { ...state, fontFamily: action.fontFamily as FontFamily }
        : state;
    case "setFontSize":
      return { ...state, fontSizePx: clampFont(action.px) };
    case "setLogo":
      return action.logo
        ? { ...state, logo: action.logo }
        : { ...state, logo: null, logoScale: 1, logoOffsetX: 0, logoOffsetY: 0 };
    case "setLogoTransform":
      return {
        ...state,
        logoScale: action.scale === undefined ? state.logoScale : clamp(action.scale, MIN_LOGO_SCALE, MAX_LOGO_SCALE),
        logoOffsetX: action.offsetX === undefined ? state.logoOffsetX : clampOffX(action.offsetX),
        logoOffsetY: action.offsetY === undefined ? state.logoOffsetY : clampOffY(action.offsetY),
      };
    case "setLogoColorMode":
      return LOGO_COLOR_MODES.includes(action.mode) ? { ...state, logoColorMode: action.mode } : state;
    case "setTextOffset":
      return {
        ...state,
        textOffsetX: action.offsetX === undefined ? state.textOffsetX : clampOffX(action.offsetX),
        textOffsetY: action.offsetY === undefined ? state.textOffsetY : clampOffY(action.offsetY),
      };
    case "applyTemplate":
      return applyTemplate(state, action.template);
    case "setRepeatGap":
      return { ...state, repeatGapPx: Math.round(clamp(action.px, MIN_REPEAT_GAP_PX, MAX_REPEAT_GAP_PX)) };
    case "reset":
      return createInitialState(action.preset ?? state.preset);
    default:
      return state;
  }
}
