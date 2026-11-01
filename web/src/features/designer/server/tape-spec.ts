// Tape size options for the public designer (RLS: anon reads active widths + the length range).
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TAPE_SPEC, toTapeSpec, type TapeSpec } from "../lib/tape-spec";

const copyDefault = (): TapeSpec => ({ ...DEFAULT_TAPE_SPEC, widths: [...DEFAULT_TAPE_SPEC.widths] });

/** Never throws: returns the 0022 seed values when the DB is unreachable or misconfigured. */
export async function getTapeSpec(): Promise<TapeSpec> {
  try {
    const supabase = await createClient();
    const [widths, settings] = await Promise.all([
      supabase
        .from("tape_widths")
        .select("width_mm")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("width_mm", { ascending: true }),
      supabase.from("tape_spec_settings").select("min_length_m,max_length_m,thickness_mic").maybeSingle(),
    ]);
    if (widths.error || !widths.data) return copyDefault();
    return toTapeSpec({ widths: widths.data, settings: settings.error ? null : settings.data });
  } catch {
    return copyDefault();
  }
}
