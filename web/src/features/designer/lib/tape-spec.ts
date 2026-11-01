// Tape size options (quy cách): widths the customer may pick + allowed roll length range.
// Source of truth is the DB (tape_widths / tape_spec_settings, migration 0022); the defaults
// below mirror its seed and are used only when the DB cannot be read.
import type { PresetOption } from "./presets";

export type TapeSpec = {
  /** Active widths (mm), in display order. */
  widths: number[];
  minLengthM: number;
  maxLengthM: number;
  /** Film thickness stored on the design (not chosen by the customer). */
  thicknessMic: number;
};

/** Same values as the seed in supabase/migrations/0022_tape_specs.sql. */
export const DEFAULT_TAPE_SPEC: TapeSpec = Object.freeze({
  widths: [12, 15, 16, 18, 20, 24, 30, 35, 40, 48, 60, 70, 80],
  minLengthM: 50,
  maxLengthM: 635,
  thicknessMic: 45,
}) as TapeSpec;

/** Absolute bounds (DB check constraints); admin settings live inside these. */
export const WIDTH_MM_MAX = 200;
export const LENGTH_M_MAX = 10000;
/** Preferred starting values in the designer (snapped into the spec). */
const PREFERRED_WIDTH_MM = 48;
const PREFERRED_LENGTH_M = 100;

const num = (v: unknown): number => (typeof v === "number" ? v : Number.parseFloat(String(v)));

/** numeric(7,1): lengths are kept to one decimal. */
export function roundLength(v: number): number {
  return Math.round(v * 10) / 10;
}

export type TapeSpecRows = {
  widths: readonly { width_mm: unknown }[] | null | undefined;
  settings: { min_length_m: unknown; max_length_m: unknown; thickness_mic: unknown } | null | undefined;
};

/**
 * DB rows -> TapeSpec. Widths: positive integers <= 200, deduped, order kept. Falls back to the
 * default list / range per part when a part is missing or invalid.
 */
export function toTapeSpec(rows: TapeSpecRows): TapeSpec {
  const widths: number[] = [];
  for (const r of rows.widths ?? []) {
    const w = num(r.width_mm);
    if (Number.isInteger(w) && w > 0 && w <= WIDTH_MM_MAX && !widths.includes(w)) widths.push(w);
  }
  const s = rows.settings;
  const min = s ? num(s.min_length_m) : Number.NaN;
  const max = s ? num(s.max_length_m) : Number.NaN;
  const thick = s ? num(s.thickness_mic) : Number.NaN;
  const rangeOk = Number.isFinite(min) && Number.isFinite(max) && min > 0 && min <= max && max <= LENGTH_M_MAX;
  return {
    widths: widths.length > 0 ? widths : [...DEFAULT_TAPE_SPEC.widths],
    minLengthM: rangeOk ? min : DEFAULT_TAPE_SPEC.minLengthM,
    maxLengthM: rangeOk ? max : DEFAULT_TAPE_SPEC.maxLengthM,
    thicknessMic: Number.isFinite(thick) && thick > 0 ? thick : DEFAULT_TAPE_SPEC.thicknessMic,
  };
}

export type TapeSizeError = "width" | "length";

/** null when width is an active option and length is inside [min, max] with <= 1 decimal. */
export function checkTapeSize(spec: TapeSpec, widthMm: unknown, lengthM: unknown): TapeSizeError | null {
  if (typeof widthMm !== "number" || !spec.widths.includes(widthMm)) return "width";
  if (typeof lengthM !== "number" || !Number.isFinite(lengthM)) return "length";
  if (roundLength(lengthM) !== lengthM) return "length";
  if (lengthM < spec.minLengthM || lengthM > spec.maxLengthM) return "length";
  return null;
}

export type LengthInputIssue = "invalid" | "tooShort" | "tooLong";

/** Parses the length text box ("635", "100,5", "100.5"). NaN when not a number. */
export function parseLengthInput(raw: string): number {
  const s = raw.trim().replace(",", ".");
  if (!/^\d{1,5}(\.\d+)?$/.test(s)) return Number.NaN;
  return roundLength(Number.parseFloat(s));
}

export function lengthIssue(spec: TapeSpec, lengthM: number): LengthInputIssue | null {
  if (!Number.isFinite(lengthM) || lengthM <= 0) return "invalid";
  if (lengthM < spec.minLengthM) return "tooShort";
  if (lengthM > spec.maxLengthM) return "tooLong";
  return null;
}

export function clampLength(spec: TapeSpec, lengthM: number): number {
  if (!Number.isFinite(lengthM)) return Math.min(spec.maxLengthM, Math.max(spec.minLengthM, PREFERRED_LENGTH_M));
  return Math.min(spec.maxLengthM, Math.max(spec.minLengthM, lengthM));
}

/** Tape size object the designer state uses (id null: no tape_presets row). */
export function tapeSize(spec: TapeSpec, widthMm: number, lengthM: number): PresetOption {
  return {
    id: null,
    label: `${widthMm}mm x ${lengthM}m`,
    width_mm: widthMm,
    length_m: lengthM,
    thickness_mic: spec.thicknessMic,
  };
}

/** Starting size: 48 mm x 100 m when allowed, else the first width / clamped length. */
export function initialTapeSize(spec: TapeSpec): PresetOption {
  const width = spec.widths.includes(PREFERRED_WIDTH_MM) ? PREFERRED_WIDTH_MM : spec.widths[0];
  return tapeSize(spec, width, clampLength(spec, PREFERRED_LENGTH_M));
}

/** "48 mm × 635 m" (numeric columns may arrive as strings). */
export function formatTapeSize(widthMm: unknown, lengthM: unknown): string {
  const v = (x: unknown) => {
    const n = num(x);
    return Number.isFinite(n) ? String(n) : "?";
  };
  return `${v(widthMm)} mm × ${v(lengthM)} m`;
}
