// Reads for /admin/don-hang. Always the logged-in admin's client: the order RPCs are admin-only
// in SQL (42501 otherwise), step log and delivery photos are admin-readable through RLS.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { STORAGE_BUCKETS, type Database } from "@/lib/types";
import { originOf } from "../lib/format";
import type { AdminOrderDetail, AdminOrderRow, OrderOrigin } from "../lib/types";

type Db = SupabaseClient<Database>;

export const PHOTO_URL_TTL_SECONDS = 600;

/** Filter keys of admin_orders_list (see migration 0024). */
export type OrdersFilter = {
  q?: string; step?: string; delivered?: boolean; settled?: boolean;
  date_from?: string; date_to?: string; limit: number; offset: number;
};

export type OrdersPage = { rows: (AdminOrderRow & { origin: OrderOrigin })[]; total: number; failed: boolean };

export async function listOrders(db: Db, filter: OrdersFilter): Promise<OrdersPage> {
  const { data, error } = await db.rpc("admin_orders_list", { p_filter: filter });
  if (error || !Array.isArray(data)) return { rows: [], total: 0, failed: true };
  const rows = data as unknown as AdminOrderRow[];
  const origins = await firstNotes(db, rows.flatMap((r) => (r.job_id && !r.lead_id ? [r.job_id] : [])));
  return {
    rows: rows.map((r) => ({ ...r, origin: originOf(r.lead_id, r.job_id ? origins.get(r.job_id) : null) })),
    total: Number(rows[0]?.total_count ?? 0),
    failed: false,
  };
}

/** First log note (from_step null) per job: written by the order trigger, says app or web. */
async function firstNotes(db: Db, jobIds: string[]): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  if (jobIds.length === 0) return out;
  const { data } = await db
    .from("production_step_log")
    .select("job_id, note")
    .in("job_id", jobIds)
    .is("from_step", null);
  for (const row of data ?? []) if (!out.has(row.job_id)) out.set(row.job_id, row.note);
  return out;
}

export type OrderLoad = { ok: true; detail: AdminOrderDetail } | { ok: false; reason: "not_found" | "error" };

export async function getOrder(db: Db, id: string): Promise<OrderLoad> {
  const { data, error } = await db.rpc("admin_order_get", { p_id: id });
  if (error) return { ok: false, reason: error.code === "P0002" ? "not_found" : "error" };
  const d = data as unknown as AdminOrderDetail | null;
  if (!d?.order) return { ok: false, reason: "not_found" };
  return { ok: true, detail: { ...d, steps: d.steps ?? [], delivery_notes: d.delivery_notes ?? [] } };
}

export function originOfDetail(d: AdminOrderDetail): OrderOrigin {
  return originOf(d.job?.lead_id ?? null, d.steps.find((s) => s.from_step === null)?.note);
}

/** Short-lived links to confirmed delivery photos (admin storage RLS). */
export async function photoUrls(db: Db, paths: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (paths.length === 0) return out;
  const { data } = await db.storage.from(STORAGE_BUCKETS.deliveryPhotos).createSignedUrls(paths, PHOTO_URL_TTL_SECONDS);
  for (const item of data ?? []) if (item.path && item.signedUrl && !item.error) out.set(item.path, item.signedUrl);
  return out;
}

export type WorkshopUser = { id: string; name: string };

/** Active workshop accounts for the "giao xưởng" select (admin RLS on profiles). */
export async function listWorkshopUsers(db: Db): Promise<WorkshopUser[]> {
  const { data } = await db
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "workshop")
    .eq("is_active", true)
    .order("full_name");
  return (data ?? []).map((u) => ({ id: u.id, name: u.full_name || u.email || u.id }));
}
