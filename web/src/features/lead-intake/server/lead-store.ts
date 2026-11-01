// Persistence port for the lead route + its Supabase (service role) implementation.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TapeSpec } from "@/features/designer";
import type { Database, StorageBucket, TablesInsert } from "@/lib/types";

export interface LeadStore {
  /**
   * Active tape widths + length range straight from the DB (no defaults: an empty list means no
   * width is accepted). Throws when the DB cannot be read.
   */
  loadTapeSpec(): Promise<TapeSpec>;
  insertLead(row: TablesInsert<"leads">): Promise<{ id: string; code: string }>;
  insertDesign(row: TablesInsert<"designs">): Promise<void>;
  uploadFile(bucket: StorageBucket, path: string, bytes: Uint8Array, contentType: string): Promise<void>;
  /** Compensation on partial failure (designs cascade). */
  deleteLead(id: string): Promise<void>;
  removeFiles(bucket: StorageBucket, paths: string[]): Promise<void>;
}

export function createSupabaseLeadStore(db: SupabaseClient<Database>): LeadStore {
  return {
    async loadTapeSpec() {
      const [widths, settings] = await Promise.all([
        db.from("tape_widths").select("width_mm").eq("is_active", true),
        db.from("tape_spec_settings").select("min_length_m, max_length_m, thickness_mic").maybeSingle(),
      ]);
      if (widths.error || !widths.data) throw new Error(`tape widths lookup failed: ${widths.error?.code ?? "no rows"}`);
      if (settings.error || !settings.data) {
        throw new Error(`tape spec settings lookup failed: ${settings.error?.code ?? "no row"}`);
      }
      return {
        widths: widths.data.map((r) => Number(r.width_mm)),
        minLengthM: Number(settings.data.min_length_m),
        maxLengthM: Number(settings.data.max_length_m),
        thicknessMic: Number(settings.data.thickness_mic),
      };
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
