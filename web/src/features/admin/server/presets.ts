// tape_presets CRUD as the logged-in admin (RLS: admin-only writes).
// Presets are deactivated instead of deleted: existing designs keep their preset_id.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TapePreset } from "@/lib/types";
import type { PresetInput } from "../lib/schemas";

type Db = SupabaseClient<Database>;

export type PresetResult = { ok: true } | { ok: false; reason: "duplicate" | "forbidden" | "notFound" | "invalid" | "generic" };

export async function listPresets(db: Db): Promise<TapePreset[]> {
  const { data } = await db
    .from("tape_presets")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("width_mm", { ascending: true });
  return data ?? [];
}

/** listPresets with a failed-read flag (page error state). */
export async function loadPresets(db: Db): Promise<{ rows: TapePreset[]; failed: boolean }> {
  const { data, error } = await db
    .from("tape_presets")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("width_mm", { ascending: true });
  return { rows: data ?? [], failed: !!error };
}

function reasonFor(code: string | undefined): Exclude<PresetResult, { ok: true }>["reason"] {
  if (code === "23505") return "duplicate";
  if (code === "42501") return "forbidden";
  if (code === "23514") return "invalid";
  return "generic";
}

export async function savePreset(db: Db, input: PresetInput): Promise<PresetResult> {
  const row = {
    label: input.label,
    width_mm: input.widthMm,
    length_m: input.lengthM,
    thickness_mic: input.thicknessMic,
    sort_order: input.sortOrder,
    is_active: input.isActive,
  };
  if (!input.id) {
    const { error } = await db.from("tape_presets").insert(row);
    return error ? { ok: false, reason: reasonFor(error.code) } : { ok: true };
  }
  const { data, error } = await db.from("tape_presets").update(row).eq("id", input.id).select("id").maybeSingle();
  if (error) return { ok: false, reason: reasonFor(error.code) };
  return data ? { ok: true } : { ok: false, reason: "notFound" };
}
