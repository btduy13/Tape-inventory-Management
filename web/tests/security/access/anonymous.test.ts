// Rule: anonymous callers (anon key, no session) cannot read leads or any lead data, and
// cannot insert leads directly (only POST /api/leads via the service role creates leads).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cleanupLeads, createLead, createQuote, looseService } from "../helpers/lead-fixtures";
import { SEED_LEADS, looseAnon } from "../helpers/sessions";

let leadId: string;
let quoteId: string;

beforeAll(async () => {
  leadId = await createLead({ tag: "anon" });
  ({ quoteId } = await createQuote(leadId));
});
afterAll(async () => cleanupLeads([leadId]));

describe("anonymous cannot read lead data", () => {
  for (const table of [
    "leads",
    "designs",
    "quotes",
    "quote_lines",
    "quote_tokens",
    "lead_status_log",
    "lead_assignments",
    "lead_notes",
    "profiles",
    "rate_limits",
    "bang_keo_in_orders",
  ]) {
    it(`${table}: no rows and no count`, async () => {
      const anon = looseAnon();
      const rows = await anon.from(table).select("*").limit(5);
      expect(rows.data ?? [], table).toEqual([]);
      const head = await anon.from(table).select("*", { count: "exact", head: true });
      expect(head.count ?? 0, table).toBe(0);
    });
  }

  it("seed lead b0001 and the fixture quote are not readable by id", async () => {
    const anon = looseAnon();
    expect((await anon.from("leads").select("id").eq("id", SEED_LEADS.staff)).data ?? []).toEqual([]);
    expect((await anon.from("quotes").select("id").eq("id", quoteId)).data ?? []).toEqual([]);
  });
});

describe("anonymous cannot write lead data directly", () => {
  it("insert into leads is rejected and no row is created", async () => {
    const marker = `SEC anon insert ${Date.now()}`;
    const { error } = await looseAnon()
      .from("leads")
      .insert({ customer_name: marker, phone: "0900000000", quantity: 1 })
      .select("id");
    expect(error).not.toBeNull();
    const { data } = await looseService().from("leads").select("id").eq("customer_name", marker);
    expect(data ?? []).toEqual([]);
  });

  it("insert into designs, quotes, quote_lines and lead_notes is rejected", async () => {
    const anon = looseAnon();
    const attempts = [
      anon.from("designs").insert({ lead_id: leadId, width_mm: 48, length_m: 100, thickness_mic: 40, colors: ["#000000"] }),
      anon.from("quotes").insert({ lead_id: leadId, version: 50 }),
      anon.from("quote_lines").insert({ quote_id: quoteId, description: "x", quantity: 1, unit_price: 0 }),
      anon.from("lead_notes").insert({ lead_id: leadId, body: "anon note" }),
      anon.from("tape_presets").insert({ name: "x" }),
    ];
    for (const res of await Promise.all(attempts.map((q) => q.select()))) expect(res.error).not.toBeNull();
  });

  it("update / delete of an existing lead changes nothing", async () => {
    const before = (await looseService().from("leads").select("*").eq("id", leadId).single()).data;
    await looseAnon().from("leads").update({ customer_name: "anon" }).eq("id", leadId);
    await looseAnon().from("leads").delete().eq("id", leadId);
    expect((await looseService().from("leads").select("*").eq("id", leadId).single()).data).toEqual(before);
  });

  it("anon sees only active tape presets (control: public catalogue)", async () => {
    const { data, error } = await looseAnon().from("tape_presets").select("*");
    expect(error).toBeNull();
    for (const p of data ?? []) expect(p.is_active).toBe(true);
  });
});
