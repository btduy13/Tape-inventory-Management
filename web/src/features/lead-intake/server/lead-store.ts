// Persistence port for the lead route + its Supabase (service role) implementation.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, StorageBucket, TablesInsert, TapePreset } from "@/lib/types";

export type PresetSnapshot = Pick<TapePreset, "id" | "label" | "width_mm" | "length_m" | "thickness_mic">;

export interface LeadStore {
  findActivePreset(id: string): Promise<PresetSnapshot | null>;
  insertLead(row: TablesInsert<"leads">): Promise<{ id: string; code: string }>;
  insertDesign(row: TablesInsert<"designs">): Promise<void>;
  uploadFile(bucket: StorageBucket, path: string, bytes: Uint8Array, contentType: string): Promise<void>;
  /** Compensation on partial failure (designs cascade). */
  deleteLead(id: string): Promise<void>;
  removeFiles(bucket: StorageBucket, paths: string[]): Promise<void>;
}

export function createSupabaseLeadStore(db: SupabaseClient<Database>): LeadStore {
  return {
    async findActivePreset(id) {
      const { data, error } = await db
        .from("tape_presets")
        .select("id, label, width_mm, length_m, thickness_mic")
        .eq("id", id)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw new Error(`preset lookup failed: ${error.code ?? "unknown"}`);
      return data;
    },
    async insertLead(row) {
      const { data, error } = await db.from("leads").insert(row).select("id, code").single();
      if (error || !data) throw new Error(`lead insert failed: ${error?.code ?? "no row"}`);
      return data;
    },
    async insertDesign(row) {
      const { error } = await db.from("designs").insert(row);
      if (error) throw new Error(`design insert failed: ${error.code ?? "unknown"}`);
    },
    async uploadFile(bucket, path, bytes, contentType) {
      const { error } = await db.storage.from(bucket).upload(path, bytes, {
        contentType,
        upsert: false,
        cacheControl: "private, max-age=0",
      });
      if (error) throw new Error(`upload failed: ${bucket}`);
    },
    async deleteLead(id) {
      await db.from("leads").delete().eq("id", id);
    },
    async removeFiles(bucket, paths) {
      if (paths.length > 0) await db.storage.from(bucket).remove(paths);
    },
  };
}
