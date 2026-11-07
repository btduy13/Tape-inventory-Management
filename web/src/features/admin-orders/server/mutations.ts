// Writes for /admin/don-hang. Only the admin order / customer RPCs (0026, 0028): admin-only,
// SECURITY DEFINER, money and debt recomputed in SQL. Never write the order tables directly.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import type { OrderType } from "../lib/types";
import { gen } from "./queries";

type Db = SupabaseClient<Database>;
type Payload = Record<string, string | number | null>;

export type Fail = { ok: false; reason: "forbidden" | "invalid" | "notFound" | "generic" };

function fail(error: { code?: string } | null): Fail {
  if (error?.code === "42501") return { ok: false, reason: "forbidden" };
  if (error?.code === "22023") return { ok: false, reason: "invalid" };
  if (error?.code === "P0002") return { ok: false, reason: "notFound" };
  return { ok: false, reason: "generic" };
}

export type CreateResult = { ok: true; orderId: string; jobId: string | null } | Fail;

export async function createOrder(db: Db, payload: Payload, type: OrderType = "bang_keo_in", isQuote = false): Promise<CreateResult> {
  const { data, error } = await gen(db).rpc("admin_order_create", { p_payload: payload, p_type: type, p_is_quote: isQuote }).single();
  if (error) return fail(error);
  const row = data as { order_id?: string; job_id?: string | null } | null;
  if (!row?.order_id) return fail(null);
  return { ok: true, orderId: row.order_id, jobId: row.job_id ?? null };
}

export async function updateOrder(db: Db, type: OrderType, id: string, payload: Payload): Promise<{ ok: true } | Fail> {
  const { error } = await gen(db).rpc("admin_order_update", { p_type: type, p_id: id, p_payload: payload });
  return error ? fail(error) : { ok: true };
}

export type CountResult = { ok: true; count: number } | Fail;

/** Atomic per type; a null flag is left as it is. Quotes are never touched. */
export async function setStatus(db: Db, type: OrderType, ids: string[], daGiao: boolean | null, daTatToan: boolean | null): Promise<CountResult> {
  const { data, error } = await gen(db).rpc("admin_order_set_status", {
    p_type: type, p_ids: ids, ...(daGiao === null ? {} : { p_da_giao: daGiao }), ...(daTatToan === null ? {} : { p_da_tat_toan: daTatToan }),
  });
  return error ? fail(error) : { ok: true, count: Number(data ?? 0) };
}

export async function deleteOrders(db: Db, type: OrderType, ids: string[], quoteOnly: boolean): Promise<CountResult> {
  const { data, error } = await gen(db).rpc("admin_order_delete", { p_type: type, p_ids: ids, p_quote_only: quoteOnly });
  return error ? fail(error) : { ok: true, count: Number(data ?? 0) };
}

export type IdResult = { ok: true; id: string } | Fail;

export async function convertQuote(db: Db, type: OrderType, id: string, due: string): Promise<IdResult> {
  const { data, error } = await gen(db).rpc("admin_quote_convert", { p_type: type, p_id: id, p_ngay_du_kien: due });
  return error ? fail(error) : typeof data === "string" ? { ok: true, id: data } : fail(null);
}

/** Printed tape only: creates the job of an undelivered order that has none. Returns the job id. */
export async function sendToWorkshop(db: Db, id: string, userId: string | null): Promise<IdResult> {
  const { data, error } = await gen(db).rpc("admin_order_send_to_workshop", { p_id: id, ...(userId ? { p_workshop_user_id: userId } : {}) });
  return error ? fail(error) : typeof data === "string" ? { ok: true, id: data } : fail(null);
}

export async function createCustomer(db: Db, payload: Record<string, string>): Promise<IdResult> {
  const { data, error } = await gen(db).rpc("admin_customer_create", { p_payload: payload });
  return error ? fail(error) : typeof data === "string" ? { ok: true, id: data } : fail(null);
}
