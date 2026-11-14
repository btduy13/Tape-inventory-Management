// Designer state + pure reducer. All palette / limit rules are enforced here.
import {
  BORDER_MIN_MM, FONT_FAMILIES, MAX_FONT_SIZE_PX, MAX_LOGO_OFFSET, MAX_LOGO_SCALE, MAX_REPEAT_GAP_PX,
  MAX_OFFSET_X, MAX_TEXT_LENGTH, MIN_FONT_SIZE_PX, MIN_LOGO_SCALE, MIN_PATTERN_WIDTH_MM, MIN_REPEAT_GAP_PX,
  type FontFamily,
} from "./constants";
import { DESIGN_BORDER_STYLES, DESIGN_PATTERNS, type DesignPattern } from "@/lib/types";
import { maxBorderMm, type BorderSpec } from "./border";
import { normalizeHex } from "./palette";
import type { LogoInk } from "./logo-colors";
import { DEFAULT_PRESETS, type PresetOption } from "./presets";

export type LogoKind = "png" | "jpg" | "svg";

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
  /** Ink colours found in the logo (logo-colors.ts). undefined: analysing; null: unknown. */
  inks?: LogoInk[] | null;
};

export type DesignState = {
  preset: PresetOption;
  backgroundColor: string;
  textColor: string;
  text: string;
  fontFamily: FontFamily;
  fontSizePx: number;
  logo: LogoAsset | null;
  logoScale: number;
  logoOffsetX: number;
  logoOffsetY: number;
  /** Logo rotation, degrees in [-180, 180] (clockwise). */
  logoRotation: number;
  /** Text position offsets, fraction of strip height (same unit as logo offsets). */
  textOffsetX: number;
  textOffsetY: number;
  repeatGapPx: number;
  /** How the content repeats along the tape (pattern.ts). Tapes under 48mm: always "straight". */
  pattern: DesignPattern;
  /** Top / bottom border lines (border.ts), printed in the text colour. */
  border: BorderSpec;
};

/** Logo always prints in its own colours: there is no accent / single-ink tint role. */
export type ColorRole = "backgroundColor" | "textColor";

export type DesignAction =
  | { type: "setPreset"; preset: PresetOption }
  /** Pick a tape width (mm); length / thickness are kept. */
  | { type: "setWidth"; widthMm: number }
  /** Customer-typed roll length (m). May be NaN / out of range while typing; submit re-checks. */
  | { type: "setLength"; lengthM: number }
  | { type: "setColor"; role: ColorRole; color: string }
  | { type: "setText"; text: string }
  | { type: "setFontFamily"; fontFamily: string }
  | { type: "setFontSize"; px: number }
  | { type: "setLogo"; logo: LogoAsset | null }
  | { type: "setLogoTransform"; scale?: number; offsetX?: number; offsetY?: number; rotation?: number }
  /** Result of the async logo colour analysis; ignored when the logo changed meanwhile. */
  | { type: "setLogoInks"; url: string; inks: LogoInk[] | null }
  | { type: "setTextOffset"; offsetX?: number; offsetY?: number }
  | { type: "applyTemplate"; template: DesignTemplate }
  | { type: "setRepeatGap"; px: number }
  | { type: "setPattern"; pattern: DesignPattern }
  | { type: "setBorder"; style?: BorderSpec["style"]; widthMm?: number }
  | { type: "reset"; preset?: PresetOption };

export function createInitialState(preset: PresetOption = DEFAULT_PRESETS[0]): DesignState {
  return {
    preset,
    backgroundColor: "#d9c3a0",
    textColor: "#cf1f27",
    text: "",
    fontFamily: "Arial",
    fontSizePx: defaultFontSize(preset.width_mm),
    logo: null,
    logoScale: 1,
    logoOffsetX: 0,
    logoOffsetY: 0,
    logoRotation: 0,
    textOffsetX: 0,
    textOffsetY: 0,
    repeatGapPx: 80,
    pattern: "straight",
    border: { style: "none", widthMm: BORDER_MIN_MM },
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
/** Any angle into [-180, 180], whole degrees. */
const normAngle = (v: number) => (Number.isFinite(v) ? Math.round(((((v + 180) % 360) + 360) % 360) - 180) : 0);

/** Patterns other than "straight" need a tape at least MIN_PATTERN_WIDTH_MM wide. */
export const patternsAllowed = (widthMm: number): boolean => widthMm >= MIN_PATTERN_WIDTH_MM;

/** Border thickness / style that fits the tape width (style "none" when no line fits). */
function fitBorder(b: BorderSpec, widthMm: number): BorderSpec {
  const max = maxBorderMm(widthMm);
  if (max < BORDER_MIN_MM) return { style: "none", widthMm: BORDER_MIN_MM };
  const mm = Math.round(clamp(b.widthMm, BORDER_MIN_MM, max) * 2) / 2;
  return mm === b.widthMm ? b : { ...b, widthMm: mm };
}

/** Strip control characters / newlines and cap length. */
export function sanitizeText(input: string): string {
  return input.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, MAX_TEXT_LENGTH);
}

/** Tape size with a new width / length (custom size: no tape_presets row). */
function sizeWith(p: PresetOption, widthMm: number, lengthM: number): PresetOption {
  return { ...p, id: null, label: `${widthMm}mm x ${lengthM}m`, width_mm: widthMm, length_m: lengthM };
}

function applyColor(state: DesignState, role: ColorRole, raw: string | null): DesignState {
  if (role !== "backgroundColor" && role !== "textColor") return state;
  const color = normalizeHex(raw);
  if (!color) return state;
  const other = role === "backgroundColor" ? state.textColor : state.backgroundColor;
  if (color === other) return state; // text must stay visible on background
  return { ...state, [role]: color };
}

function applyTemplate(state: DesignState, tpl: DesignTemplate): DesignState {
  const bg = normalizeHex(tpl.backgroundColor);
  const fg = normalizeHex(tpl.textColor);
  if (!bg || !fg || bg === fg || !(FONT_FAMILIES as readonly string[]).includes(tpl.fontFamily)) return state;
  return {
    ...state,
    backgroundColor: bg,
    textColor: fg,
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
      const w = action.preset.width_mm;
      const px = Math.min(clampFont(state.fontSizePx * ratio), maxFontSize(w));
      const pattern = patternsAllowed(w) ? state.pattern : "straight";
      return { ...state, preset: action.preset, fontSizePx: px, pattern, border: fitBorder(state.border, w) };
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
        : { ...state, logo: null, logoScale: 1, logoOffsetX: 0, logoOffsetY: 0, logoRotation: 0 };
    case "setLogoTransform":
      return {
        ...state,
        logoScale: action.scale === undefined ? state.logoScale : clamp(action.scale, MIN_LOGO_SCALE, MAX_LOGO_SCALE),
        logoOffsetX: action.offsetX === undefined ? state.logoOffsetX : clampOffX(action.offsetX),
        logoOffsetY: action.offsetY === undefined ? state.logoOffsetY : clampOffY(action.offsetY),
        logoRotation: action.rotation === undefined ? state.logoRotation : normAngle(action.rotation),
      };
    case "setLogoInks":
      return state.logo && state.logo.url === action.url
        ? { ...state, logo: { ...state.logo, inks: action.inks } }
        : state;
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
    case "setPattern": {
      const ok = (DESIGN_PATTERNS as readonly string[]).includes(action.pattern)
        && (action.pattern === "straight" || patternsAllowed(state.preset.width_mm));
      return ok && action.pattern !== state.pattern ? { ...state, pattern: action.pattern } : state;
    }
    case "setBorder": {
      const style = action.style ?? state.border.style;
      if (!(DESIGN_BORDER_STYLES as readonly string[]).includes(style)) return state;
      const widthMm = action.widthMm === undefined || !Number.isFinite(action.widthMm) ? state.border.widthMm : action.widthMm;
      const next = fitBorder({ style, widthMm }, state.preset.width_mm);
      return next.style === state.border.style && next.widthMm === state.border.widthMm ? state : { ...state, border: next };
    }
    case "reset":
      return createInitialState(action.preset ?? state.preset);
    default:
      return state;
  }
}
