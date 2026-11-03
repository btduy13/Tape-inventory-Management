// Writes for /admin/don-hang: one RPC, admin_order_create (admin-only, recomputes the money).
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

type Db = SupabaseClient<Database>;

export type CreateResult =
  | { ok: true; orderId: string; jobId: string | null }
  | { ok: false; reason: "forbidden" | "invalid" | "generic" };

export async function createOrder(db: Db, payload: Record<string, string | number>): Promise<CreateResult> {
  const { data, error } = await db.rpc("admin_order_create", { p_payload: payload }).single();
  if (error) {
    if (error.code === "42501") return { ok: false, reason: "forbidden" };
    if (error.code === "22023") return { ok: false, reason: "invalid" };
    return { ok: false, reason: "generic" };
  }
  const row = data as { order_id?: string; job_id?: string | null } | null;
  if (!row?.order_id) return { ok: false, reason: "generic" };
  return { ok: true, orderId: row.order_id, jobId: row.job_id ?? null };
}
