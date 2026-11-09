// Reads for /admin/don-hang. Always the logged-in admin's client: the order and customer RPCs are
// admin-only in SQL (42501 otherwise), step log and delivery photos are admin-readable through RLS.
// Typed against the generated schema (lib/database.generated.ts) so the RPC args are checked.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { STORAGE_BUCKETS, type Database, type GeneratedDatabase } from "@/lib/types";
import { originOf } from "../lib/format";
import type { OrdersFilter } from "../lib/list-spec";
import type { AdminOrderDetail, AdminOrderRow, AdminOrdersTotalsRow, CustomerHit, OrderOrigin, OrderRecord, OrderType, OrdersTotals } from "../lib/types";

type Db = SupabaseClient<Database>;
export const gen = (db: Db) => db as unknown as SupabaseClient<GeneratedDatabase>;

export const PHOTO_URL_TTL_SECONDS = 600;

export type OrdersQuery = { type: OrderType | "all"; filter: OrdersFilter };
export type ListedOrder = AdminOrderRow;
export type OrdersPage = { rows: ListedOrder[]; totals: OrdersTotals; failed: boolean };

const NO_TOTALS: OrdersTotals = {
  count: 0, tongTien: 0, congNoKhach: 0, congNoNcc: 0, loiNhuanRong: 0, dueSoon: 0, overdue: 0, unsettled: 0, settled: 0,
  money: false,
};

/** rpc('admin_orders_totals') row -> OrdersTotals. Null money sums = no orders.money (money: false). */
export function totalsOf(r: AdminOrdersTotalsRow | undefined): OrdersTotals {
  if (!r) return NO_TOTALS;
  return {
    count: Number(r.total_count), tongTien: Number(r.sum_tong_tien), congNoKhach: Number(r.sum_cong_no_khach),
    congNoNcc: Number(r.sum_cong_no_ncc ?? 0), loiNhuanRong: Number(r.sum_loi_nhuan_rong ?? 0),
    dueSoon: Number(r.count_due_soon), overdue: Number(r.count_overdue),
    unsettled: Number(r.count_unsettled), settled: Number(r.count_settled),
    money: r.sum_loi_nhuan_rong != null,
  };
}

/** Whole-set counts and sums of the filter (separate RPC, so the page itself stays cheap). */
export async function getOrdersTotals(db: Db, { type, filter }: OrdersQuery): Promise<OrdersTotals | null> {
  const { data, error } = await gen(db).rpc("admin_orders_totals", { p_filter: filter, p_type: type });
  return error || !Array.isArray(data) ? null : totalsOf(data[0] as unknown as AdminOrdersTotalsRow | undefined);
}

async function fetchRows(db: Db, { type, filter }: OrdersQuery): Promise<AdminOrderRow[] | null> {
  const { data, error } = await gen(db).rpc("admin_orders_list", { p_filter: filter, p_type: type });
  return error || !Array.isArray(data) ? null : (data as unknown as AdminOrderRow[]);
}

export async function listOrders(db: Db, query: OrdersQuery): Promise<OrdersPage> {
  const [rows, totals] = await Promise.all([fetchRows(db, query), getOrdersTotals(db, query)]);
  return !rows || !totals ? { rows: [], totals: NO_TOTALS, failed: true } : { rows, totals, failed: false };
}

export type OrderLoad = { ok: true; detail: AdminOrderDetail } | { ok: false; reason: "not_found" | "error" };

export async function getOrder(db: Db, id: string, type: OrderType): Promise<OrderLoad> {
  const { data, error } = await gen(db).rpc("admin_order_get", { p_id: id, p_type: type });
  if (error) return { ok: false, reason: error.code === "P0002" ? "not_found" : "error" };
  const d = data as unknown as AdminOrderDetail | null;
  if (!d?.order) return { ok: false, reason: "not_found" };
  return { ok: true, detail: { ...d, type, steps: d.steps ?? [], delivery_notes: d.delivery_notes ?? [] } };
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

/** Product names for the datalist: up to 8, newest first, quotes excluded. */
export async function suggestNames(db: Db, type: OrderType, q: string): Promise<string[]> {
  const { data, error } = await gen(db).rpc("admin_order_name_suggest", { p_type: type, p_q: q });
  return error || !Array.isArray(data) ? [] : data.filter((s): s is string => typeof s === "string");
}

/** Latest order (any column) with exactly this product name, or null. */
export async function latestByName(db: Db, type: OrderType, name: string): Promise<OrderRecord | null> {
  const { data, error } = await gen(db).rpc("admin_order_latest_by_name", { p_type: type, p_name: name });
  return error || !data || typeof data !== "object" ? null : (data as OrderRecord);
}

/** Customer picker search (admin_customers_list, DB-2). */
export async function searchCustomers(db: Db, q: string, limit = 8): Promise<CustomerHit[]> {
  const { data, error } = await gen(db).rpc("admin_customers_list", { p_q: q, p_limit: limit });
  if (error || !Array.isArray(data)) return [];
  return data.map((c) => ({ id: c.id, name: c.name, phone: c.phone ?? null, address: c.address ?? null, company: c.company ?? null }));
}

export async function getCustomerName(db: Db, id: string): Promise<string | null> {
  const { data, error } = await gen(db).rpc("admin_customer_get", { p_id: id });
  const c = (data as { customer?: { name?: string } } | null)?.customer;
  return error || !c?.name ? null : c.name;
}
