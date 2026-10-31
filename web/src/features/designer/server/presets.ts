// Active tape presets for the public designer (RLS: anon may read active rows).
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_PRESETS, normalizePresets, toPresetOption, type PresetOption } from "../lib/presets";

/** Never throws: returns the seed defaults when the DB is unreachable or misconfigured. */
export async function getActivePresets(): Promise<PresetOption[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tape_presets")
      .select("id,label,width_mm,length_m,thickness_mic")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error || !data) return [...DEFAULT_PRESETS];
    return normalizePresets(data.map(toPresetOption));
  } catch {
    return [...DEFAULT_PRESETS];
  }
}
