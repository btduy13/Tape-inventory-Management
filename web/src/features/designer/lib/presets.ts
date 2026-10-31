// Tape size presets: DB rows -> UI options, plus offline defaults mirroring seed 0002.
import type { TapePreset } from "@/lib/types";

export type PresetOption = {
  /** tape_presets.id, or null for the built-in fallback (DB unreachable). */
  id: string | null;
  label: string;
  width_mm: number;
  length_m: number;
  thickness_mic: number;
};

/** Same sizes as the seed in supabase/migrations/0002_tape_presets.sql. */
export const DEFAULT_PRESETS: readonly PresetOption[] = [
  { id: null, label: "48mm x 100m - 45mic", width_mm: 48, length_m: 100, thickness_mic: 45 },
  { id: null, label: "60mm x 100m - 45mic", width_mm: 60, length_m: 100, thickness_mic: 45 },
  { id: null, label: "48mm x 200m - 50mic", width_mm: 48, length_m: 200, thickness_mic: 50 },
  { id: null, label: "72mm x 100m - 50mic", width_mm: 72, length_m: 100, thickness_mic: 50 },
];

function num(v: string | number): number {
  const n = typeof v === "number" ? v : Number.parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

export function toPresetOption(row: Pick<TapePreset, "id" | "label" | "width_mm" | "length_m" | "thickness_mic">): PresetOption {
  return {
    id: row.id,
    label: row.label,
    width_mm: num(row.width_mm),
    length_m: num(row.length_m),
    thickness_mic: num(row.thickness_mic),
  };
}

/** Stable key for a preset (id may be null for fallbacks). */
export function presetKey(p: PresetOption): string {
  return p.id ?? `${p.width_mm}x${p.length_m}x${p.thickness_mic}`;
}

/** Valid presets only (positive dims), deduped by key; falls back to defaults when empty. */
export function normalizePresets(list: readonly PresetOption[] | null | undefined): PresetOption[] {
  const seen = new Set<string>();
  const out: PresetOption[] = [];
  for (const p of list ?? []) {
    if (!(p.width_mm > 0 && p.length_m > 0 && p.thickness_mic > 0)) continue;
    const k = presetKey(p);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out.length > 0 ? out : [...DEFAULT_PRESETS];
}
