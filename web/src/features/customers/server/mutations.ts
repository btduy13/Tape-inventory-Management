// Writes for /admin/khach-hang: one admin-only RPC each (0028). SQL validates and is the authority.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import type { CustomerPayload } from "../lib/schemas";

type Db = SupabaseClient<Database>;

export type FailReason = "forbidden" | "invalid" | "not_found" | "generic";
export type Result<T = object> = ({ ok: true } & T) | { ok: false; reason: FailReason };

function fail(code: string | undefined): { ok: false; reason: FailReason } {
  const reason = code === "42501" ? "forbidden" : code === "22023" ? "invalid" : code === "P0002" ? "not_found" : "generic";
  return { ok: false, reason };
}

export async function createCustomer(db: Db, payload: Partial<CustomerPayload>): Promise<Result<{ id: string }>> {
  const { data, error } = await db.rpc("admin_customer_create", { p_payload: payload });
  if (error) return fail(error.code);
  return typeof data === "string" ? { ok: true, id: data } : fail(undefined);
}

export async function updateCustomer(db: Db, id: string, payload: CustomerPayload): Promise<Result> {
  const { error } = await db.rpc("admin_customer_update", { p_id: id, p_payload: payload });
  return error ? fail(error.code) : { ok: true };
}

export async function mergeCustomers(db: Db, target: string, sources: string[]): Promise<Result<{ moved: number }>> {
  const { data, error } = await db.rpc("admin_customer_merge", { p_target: target, p_sources: sources });
  return error ? fail(error.code) : { ok: true, moved: Number(data ?? 0) };
}

/** customerId null marks the row skipped. */
export async function resolveReview(db: Db, sourceTable: string, sourceId: string, customerId: string | null): Promise<Result> {
  const { error } = await db.rpc("admin_customer_review_resolve", {
    p_source_table: sourceTable, p_source_id: sourceId, ...(customerId ? { p_customer_id: customerId } : {}),
  });
  return error ? fail(error.code) : { ok: true };
}
