// Active tape presets for the landing showcase (public read via RLS, anon key).
import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { TapePreset } from "@/lib/types";

export type ShowcasePreset = Pick<TapePreset, "id" | "label" | "width_mm" | "length_m" | "thickness_mic">;

/** Never throws: the landing page must render even when Supabase is unreachable. */
export async function listActivePresets(limit = 8): Promise<ShowcasePreset[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tape_presets")
      .select("id, label, width_mm, length_m, thickness_mic")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(limit);
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}
