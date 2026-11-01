// Reads for the workshop dashboard. Always the logged-in user's RLS client:
//   * job specs ONLY through rpc('workshop_jobs') (fixed column list, no prices / contacts);
//   * step log through RLS on production_step_log (visible iff the job is);
//   * design files through Storage RLS (lead_files_select allows the assigned workshop user).
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { STORAGE_BUCKETS, type Database, type ProductionJob, type ProductionStepLog, type WorkshopJobRow } from "@/lib/types";

type Db = SupabaseClient<Database>;

export const DESIGN_URL_TTL_SECONDS = 600;

export async function listWorkshopJobs(db: Db): Promise<WorkshopJobRow[]> {
  const { data, error } = await db.rpc("workshop_jobs", {});
  if (error || !Array.isArray(data)) return [];
  return data as WorkshopJobRow[];
}

export async function getWorkshopJob(db: Db, jobId: string): Promise<WorkshopJobRow | null> {
  const { data, error } = await db.rpc("workshop_jobs", { p_job_id: jobId });
  if (error || !Array.isArray(data)) return null;
  return (data[0] as WorkshopJobRow | undefined) ?? null;
}

export async function listStepLog(db: Db, jobId: string): Promise<ProductionStepLog[]> {
  const { data } = await db
    .from("production_step_log")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []) as ProductionStepLog[];
}

/** Job of a lead (admin lead page). RLS: admin sees all; others get null. */
export async function jobForLead(db: Db, leadId: string): Promise<ProductionJob | null> {
  const { data } = await db.from("production_jobs").select("*").eq("lead_id", leadId).maybeSingle();
  return (data as ProductionJob | null) ?? null;
}

export type WorkshopUser = { id: string; name: string };

/** Active workshop accounts (admin RLS on profiles). */
export async function listWorkshopUsers(db: Db): Promise<WorkshopUser[]> {
  const { data } = await db
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "workshop")
    .eq("is_active", true)
    .order("full_name");
  return (data ?? []).map((u) => ({ id: u.id, name: u.full_name || u.email || u.id }));
}

export type DesignUrls = { previewUrl: string | null; logoUrl: string | null };

async function signed(db: Db, bucket: string, path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await db.storage.from(bucket).createSignedUrl(path, DESIGN_URL_TTL_SECONDS);
  return error ? null : (data?.signedUrl ?? null);
}

export async function designUrls(db: Db, job: Pick<WorkshopJobRow, "preview_path" | "logo_path">): Promise<DesignUrls> {
  const [previewUrl, logoUrl] = await Promise.all([
    signed(db, STORAGE_BUCKETS.previews, job.preview_path),
    signed(db, STORAGE_BUCKETS.logos, job.logo_path),
  ]);
  return { previewUrl, logoUrl };
}
