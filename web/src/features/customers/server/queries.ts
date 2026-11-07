// Reads for /admin/khach-hang. Always the logged-in admin's client: the customer RPCs are
// admin-only in SQL (42501 otherwise).
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import type { CustomerDetail, CustomerRow, ReviewRow } from "../lib/types";

type Db = SupabaseClient<Database>;
type Page = { p_limit: number; p_offset: number };

export type CustomersPage = { rows: CustomerRow[]; total: number; sumDebt: number; failed: boolean };

export async function listCustomers(db: Db, q: string, page: Page): Promise<CustomersPage> {
  const { data, error } = await db.rpc("admin_customers_list", { ...(q ? { p_q: q } : {}), ...page });
  if (error || !Array.isArray(data)) return { rows: [], total: 0, sumDebt: 0, failed: true };
  const rows = data as unknown as CustomerRow[];
  return { rows, total: Number(rows[0]?.total_count ?? 0), sumDebt: Number(rows[0]?.sum_cong_no_khach ?? 0), failed: false };
}

export type CustomerLoad = { ok: true; detail: CustomerDetail } | { ok: false; reason: "not_found" | "error" };

export async function getCustomer(db: Db, id: string): Promise<CustomerLoad> {
  const { data, error } = await db.rpc("admin_customer_get", { p_id: id });
  if (error) return { ok: false, reason: error.code === "P0002" ? "not_found" : "error" };
  const d = data as unknown as CustomerDetail | null;
  if (!d?.customer) return { ok: false, reason: "not_found" };
  return { ok: true, detail: { ...d, orders: d.orders ?? [], leads: d.leads ?? [] } };
}

export type ReviewPage = { rows: ReviewRow[]; total: number; failed: boolean };

export async function listReview(db: Db, page: Page): Promise<ReviewPage> {
  const { data, error } = await db.rpc("admin_customer_review_list", page);
  if (error || !Array.isArray(data)) return { rows: [], total: 0, failed: true };
  const rows = (data as unknown as ReviewRow[]).map((r) => ({ ...r, suggestions: Array.isArray(r.suggestions) ? r.suggestions : [] }));
  return { rows, total: Number(rows[0]?.total_count ?? 0), failed: false };
}
