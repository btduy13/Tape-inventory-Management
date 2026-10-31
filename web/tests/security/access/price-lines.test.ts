// Rule: only admin / manager create or change quotes and price lines. The assigned staff
// member and ctv can read them but not write them.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cleanupLeads, createLead, createQuote, fixtureActor, looseService } from "../helpers/lead-fixtures";
import { seedActor, type Actor } from "../helpers/sessions";

let staffOwner: Actor;
let ctvOwner: Actor;
const leads: string[] = [];
let staffQuote: { quoteId: string; lineId: string };
let ctvQuote: { quoteId: string; lineId: string };

async function snapshot(quoteId: string) {
  const svc = looseService();
  const q = await svc.from("quotes").select("status, vat_percent, total, notes").eq("id", quoteId).single();
  const l = await svc.from("quote_lines").select("id, unit_price, quantity, description").eq("quote_id", quoteId).order("id");
  return { quote: q.data, lines: l.data };
}

beforeAll(async () => {
  staffOwner = await fixtureActor("access-price-staff", "staff");
  ctvOwner = await fixtureActor("access-price-ctv", "ctv");
  leads.push(await createLead({ assignedTo: staffOwner.id, tag: "price-staff" }));
  leads.push(await createLead({ assignedTo: ctvOwner.id, tag: "price-ctv" }));
  staffQuote = await createQuote(leads[0]);
  ctvQuote = await createQuote(leads[1]);
});
afterAll(async () => cleanupLeads(leads));

describe("staff / ctv cannot write price lines or quotes of their own lead", () => {
  const owners = () =>
    [
      [staffOwner, staffQuote],
      [ctvOwner, ctvQuote],
    ] as const;

  it("owner can read the quote and its lines (control)", async () => {
    for (const [actor, q] of owners()) {
      expect((await actor.db.from("quote_lines").select("id").eq("quote_id", q.quoteId)).data, actor.name).toHaveLength(1);
    }
  });

  it("insert of a new price line is rejected", async () => {
    for (const [actor, q] of owners()) {
      const before = await snapshot(q.quoteId);
      const { error } = await actor.db
        .from("quote_lines")
        .insert({ quote_id: q.quoteId, description: "free", quantity: 1, unit_price: 0 })
        .select("id");
      expect(error, actor.name).not.toBeNull();
      expect(await snapshot(q.quoteId)).toEqual(before);
    }
  });

  it("update and delete of an existing price line change nothing", async () => {
    for (const [actor, q] of owners()) {
      const before = await snapshot(q.quoteId);
      await actor.db.from("quote_lines").update({ unit_price: 1 }).eq("id", q.lineId);
      await actor.db.from("quote_lines").delete().eq("id", q.lineId);
      expect(await snapshot(q.quoteId), actor.name).toEqual(before);
    }
  });

  it("quote VAT, status, notes and new quote versions are rejected", async () => {
    for (const [actor, q] of owners()) {
      const before = await snapshot(q.quoteId);
      await actor.db.from("quotes").update({ vat_percent: 0, notes: "x", status: "cancelled" }).eq("id", q.quoteId);
      const ins = await actor.db.from("quotes").insert({ lead_id: leads[0], version: 99 }).select("id");
      expect(ins.error, actor.name).not.toBeNull();
      expect(await snapshot(q.quoteId), actor.name).toEqual(before);
    }
  });

  it("seed staff2 cannot write lines of a quote it cannot see", async () => {
    const staff2 = await seedActor("staff2");
    const before = await snapshot(staffQuote.quoteId);
    const ins = await staff2.db
      .from("quote_lines")
      .insert({ quote_id: staffQuote.quoteId, description: "x", quantity: 1, unit_price: 0 })
      .select("id");
    await staff2.db.from("quote_lines").update({ unit_price: 1 }).eq("id", staffQuote.lineId);
    expect(ins.error).not.toBeNull();
    expect(await snapshot(staffQuote.quoteId)).toEqual(before);
  });
});

describe("admin / manager may edit price lines of a draft quote", () => {
  for (const role of ["manager", "admin"] as const) {
    it(`${role} updates a line price and the total is recomputed`, async () => {
      const actor = await seedActor(role);
      const price = role === "admin" ? 3000 : 2000;
      const { data, error } = await actor.db.from("quote_lines").update({ unit_price: price }).eq("id", staffQuote.lineId).select("id");
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      const snap = await snapshot(staffQuote.quoteId);
      expect(Number(snap.lines?.[0]?.unit_price)).toBe(price);
      expect(Number(snap.quote?.total)).toBe(price * 10 + Math.round((price * 10 * 8) / 100));
    });
  }
});
