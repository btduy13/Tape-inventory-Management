// tape_widths / tape_spec_settings as the logged-in admin (RLS: admin-only writes, 0022).
// Widths can be deleted: designs keep their own width_mm snapshot (no FK).
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TapeSpecSettings, TapeWidth } from "@/lib/types";
import {
  nextSortOrder, reorderWidths, type AddWidthInput, type LengthLimitsInput, type MoveWidthInput,
  type ToggleWidthInput,
} from "../lib/tape-spec-schemas";

type Db = SupabaseClient<Database>;

export type SpecResult = { ok: true } | { ok: false; reason: "duplicate" | "forbidden" | "notFound" | "invalid" | "generic" };

function reasonFor(code: string | undefined): Exclude<SpecResult, { ok: true }>["reason"] {
  if (code === "23505") return "duplicate";
  if (code === "42501") return "forbidden";
  if (code === "23514") return "invalid";
  return "generic";
}

const fromError = (error: { code?: string } | null): SpecResult =>
  error ? { ok: false, reason: reasonFor(error.code) } : { ok: true };

/** All widths (admin also sees disabled ones), display order. */
export async function listWidths(db: Db): Promise<TapeWidth[]> {
  const { data } = await db
    .from("tape_widths")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("width_mm", { ascending: true });
  return data ?? [];
}

/** Widths + length limits for the admin page, with a failed-read flag (page error state). */
export async function loadTapeSpecs(db: Db): Promise<{ widths: TapeWidth[]; settings: TapeSpecSettings | null; failed: boolean }> {
  const [w, s] = await Promise.all([
    db.from("tape_widths").select("*").order("sort_order", { ascending: true }).order("width_mm", { ascending: true }),
    db.from("tape_spec_settings").select("*").maybeSingle(),
  ]);
  return { widths: w.data ?? [], settings: s.data ?? null, failed: !!w.error || !!s.error };
}

export async function addWidth(db: Db, input: AddWidthInput): Promise<SpecResult> {
  const rows = await listWidths(db);
  const { error } = await db
    .from("tape_widths")
    .insert({ width_mm: input.widthMm, sort_order: nextSortOrder(rows), is_active: true });
  return fromError(error);
}

export async function setWidthActive(db: Db, input: ToggleWidthInput): Promise<SpecResult> {
  const { data, error } = await db
    .from("tape_widths")
    .update({ is_active: input.isActive })
    .eq("id", input.id)
    .select("id")
    .maybeSingle();
  if (error) return fromError(error);
  return data ? { ok: true } : { ok: false, reason: "notFound" };
}

export async function deleteWidth(db: Db, id: string): Promise<SpecResult> {
  const { data, error } = await db.from("tape_widths").delete().eq("id", id).select("id");
  if (error) return fromError(error);
  return data && data.length > 0 ? { ok: true } : { ok: false, reason: "notFound" };
}

export async function moveWidth(db: Db, input: MoveWidthInput): Promise<SpecResult> {
  const rows = await listWidths(db);
  const ordered = reorderWidths(rows, input.id, input.direction);
  if (!ordered) return rows.some((r) => r.id === input.id) ? { ok: true } : { ok: false, reason: "notFound" };
  // Only rows whose position changed are written.
  const updates = ordered
    .map((r, i) => ({ id: r.id, sort_order: (i + 1) * 10, old: r.sort_order }))
    .filter((r) => r.sort_order !== r.old);
  for (const u of updates) {
    const { error } = await db.from("tape_widths").update({ sort_order: u.sort_order }).eq("id", u.id);
    if (error) return fromError(error);
  }
  return { ok: true };
}

export async function saveLengthLimits(db: Db, input: LengthLimitsInput): Promise<SpecResult> {
  const { data, error } = await db
    .from("tape_spec_settings")
    .update({ min_length_m: input.minLengthM, max_length_m: input.maxLengthM, thickness_mic: input.thicknessMic })
    .eq("id", true)
    .select("id")
    .maybeSingle();
  if (error) return fromError(error);
  return data ? { ok: true } : { ok: false, reason: "forbidden" };
}
