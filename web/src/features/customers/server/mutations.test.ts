import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { customerFormSchema, mergeSchema, reviewKeySchema } from "../lib/schemas";
import { createCustomer, mergeCustomers, resolveReview, updateCustomer } from "./mutations";

function db(result: { data?: unknown; error?: { code: string } | null }) {
  const rpc = vi.fn().mockResolvedValue({ data: result.data ?? null, error: result.error ?? null });
  return { client: { rpc } as unknown as SupabaseClient<Database>, rpc };
}

const ID = "11111111-1111-4111-8111-111111111111";
const ID2 = "22222222-2222-4222-8222-222222222222";
const payload = customerFormSchema.parse({ name: " Anh Ba ", phone: "0909 000 111" });

describe("customer mutations", () => {
  it("call the 0028 RPCs with their argument names", async () => {
    const a = db({ data: ID });
    expect(await createCustomer(a.client, payload)).toEqual({ ok: true, id: ID });
    expect(a.rpc).toHaveBeenCalledWith("admin_customer_create", {
      p_payload: { name: "Anh Ba", phone: "0909 000 111", address: "", company: "", note: "" },
    });

    const b = db({ data: {} });
    expect(await updateCustomer(b.client, ID, payload)).toEqual({ ok: true });
    expect(b.rpc).toHaveBeenCalledWith("admin_customer_update", { p_id: ID, p_payload: payload });

    const m = db({ data: 3 });
    expect(await mergeCustomers(m.client, ID, [ID2])).toEqual({ ok: true, moved: 3 });
    expect(m.rpc).toHaveBeenCalledWith("admin_customer_merge", { p_target: ID, p_sources: [ID2] });

    const r = db({});
    await resolveReview(r.client, "bang_keo_orders", "B-01-26-001", ID);
    expect(r.rpc).toHaveBeenCalledWith("admin_customer_review_resolve", { p_source_table: "bang_keo_orders", p_source_id: "B-01-26-001", p_customer_id: ID });
    await resolveReview(r.client, "leads", "x", null);
    expect(r.rpc).toHaveBeenLastCalledWith("admin_customer_review_resolve", { p_source_table: "leads", p_source_id: "x" });
  });

  it("map SQL errors", async () => {
    expect(await createCustomer(db({ error: { code: "42501" } }).client, payload)).toEqual({ ok: false, reason: "forbidden" });
    expect(await updateCustomer(db({ error: { code: "22023" } }).client, ID, payload)).toEqual({ ok: false, reason: "invalid" });
    expect(await updateCustomer(db({ error: { code: "P0002" } }).client, ID, payload)).toEqual({ ok: false, reason: "not_found" });
    expect(await mergeCustomers(db({ error: { code: "XX000" } }).client, ID, [ID2])).toEqual({ ok: false, reason: "generic" });
    expect(await createCustomer(db({ data: null }).client, payload)).toEqual({ ok: false, reason: "generic" });
  });
});

describe("customer schemas", () => {
  it("require a name and cap lengths like customer_clean_payload", () => {
    expect(customerFormSchema.safeParse({ name: "  " }).success).toBe(false);
    expect(customerFormSchema.safeParse({ name: "A", phone: "1".repeat(31) }).success).toBe(false);
    expect(customerFormSchema.safeParse({ name: "A", note: "x".repeat(2000) }).success).toBe(true);
  });

  it("merge needs 1-50 sources other than the target", () => {
    expect(mergeSchema.safeParse({ target: ID, sources: [ID2] }).success).toBe(true);
    expect(mergeSchema.safeParse({ target: ID, sources: [] }).success).toBe(false);
    expect(mergeSchema.safeParse({ target: ID, sources: [ID] }).success).toBe(false);
  });

  it("review key accepts only the queue's tables", () => {
    expect(reviewKeySchema.safeParse({ source_table: "thank_you_orders", source_id: "TY-01-26-001" }).success).toBe(true);
    expect(reviewKeySchema.safeParse({ source_table: "customers", source_id: "x" }).success).toBe(false);
  });
});
