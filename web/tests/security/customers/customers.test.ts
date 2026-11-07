// Rule: only admin can list, read, create, update, merge customers and resolve the review queue
// (0028). Runs the web feature's own query / mutation functions against the local stack, so the
// RPC argument names and result shapes the pages rely on are checked end to end.
import { afterAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { customerFormSchema } from "@/features/customers/lib/schemas";
import { createCustomer, mergeCustomers, resolveReview, updateCustomer } from "@/features/customers/server/mutations";
import { getCustomer, listCustomers, listReview } from "@/features/customers/server/queries";
import { looseService } from "../helpers/lead-fixtures";
import { seedActor } from "../helpers/sessions";

const created: string[] = [];
afterAll(async () => {
  if (created.length) await looseService().from("customers").delete().in("id", created);
});

const asDb = (db: unknown) => db as SupabaseClient<Database>;
const PAGE = { p_limit: 20, p_offset: 0 };
const TAG = `SEC-CUST-${Date.now()}`;

describe("admin customer RPCs", () => {
  it("non-admin roles are refused", async () => {
    for (const role of ["manager", "staff", "ctv", "workshop"] as const) {
      const db = asDb((await seedActor(role)).db);
      expect((await listCustomers(db, "", PAGE)).failed, role).toBe(true);
      expect((await listReview(db, PAGE)).failed, role).toBe(true);
      expect(await createCustomer(db, customerFormSchema.parse({ name: TAG })), role).toEqual({ ok: false, reason: "forbidden" });
    }
  });

  it("admin creates, edits, finds and merges customers", async () => {
    const db = asDb((await seedActor("admin")).db);
    const a = await createCustomer(db, customerFormSchema.parse({ name: `${TAG} A`, phone: "0909 123 001" }));
    const b = await createCustomer(db, customerFormSchema.parse({ name: `${TAG} B`, address: "12 Đường Thử" }));
    if (!a.ok || !b.ok) throw new Error("create failed");
    created.push(a.id, b.id);

    // Phone search also matches the normalized digits.
    expect((await listCustomers(db, "0909123001", PAGE)).rows.map((r) => r.id)).toContain(a.id);
    // The edit form sends every field: an empty phone clears it.
    expect(await updateCustomer(db, a.id, customerFormSchema.parse({ name: `${TAG} A2`, company: "Cty Thử" }))).toEqual({ ok: true });
    const list = await listCustomers(db, TAG, PAGE);
    expect(list.failed).toBe(false);
    expect(list.total).toBe(2);

    expect(await mergeCustomers(db, a.id, [b.id])).toEqual({ ok: true, moved: 0 });
    const load = await getCustomer(db, a.id);
    if (!load.ok) throw new Error("get failed");
    expect(load.detail.customer).toMatchObject({ name: `${TAG} A2`, phone: null, company: "Cty Thử", address: "12 Đường Thử" });
    expect(load.detail.orders).toEqual([]);
    expect(await getCustomer(db, b.id)).toEqual({ ok: false, reason: "not_found" });
  });

  it("resolving a row that is not pending is not_found", async () => {
    const db = asDb((await seedActor("admin")).db);
    expect(await resolveReview(db, "leads", "00000000-0000-0000-0000-000000000000", null)).toEqual({ ok: false, reason: "not_found" });
  });
});
