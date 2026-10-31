// Rule: staff / ctv see only the leads assigned to them, and only those leads' designs,
// quotes, quote lines, status history and notes. Another staff member sees none of it.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addNote, cleanupLeads, createLead, createQuote, fixtureActor } from "../helpers/lead-fixtures";
import { SEED_IDS, SEED_LEADS, seedActor, type Actor } from "../helpers/sessions";

const CHILD_TABLES = ["designs", "quotes", "lead_status_log", "lead_notes"] as const;

describe("seed accounts: staff/ctv read only their assigned leads", () => {
  for (const role of ["staff", "ctv", "staff2"] as const) {
    it(`${role}: every visible lead is assigned to ${role}`, async () => {
      const me = await seedActor(role);
      const { data, error } = await me.db.from("leads").select("id, assigned_to");
      expect(error).toBeNull();
      for (const row of data ?? []) expect(row.assigned_to).toBe(SEED_IDS[role]);
    });
  }

  it("staff sees seed lead b0001, ctv sees b0002, neither sees the unassigned b0003", async () => {
    const staff = await seedActor("staff");
    const ctv = await seedActor("ctv");
    const s = await staff.db.from("leads").select("id").in("id", Object.values(SEED_LEADS));
    const c = await ctv.db.from("leads").select("id").in("id", Object.values(SEED_LEADS));
    expect((s.data ?? []).map((r) => r.id)).toEqual([SEED_LEADS.staff]);
    expect((c.data ?? []).map((r) => r.id)).toEqual([SEED_LEADS.ctv]);
  });

  it("staff2 sees nothing of seed lead b0001 (lead, design, status history)", async () => {
    const staff2 = await seedActor("staff2");
    for (const table of ["leads", "designs", "lead_status_log"]) {
      const col = table === "leads" ? "id" : "lead_id";
      const { data } = await staff2.db.from(table).select("*").eq(col, SEED_LEADS.staff);
      expect(data ?? [], table).toEqual([]);
    }
  });
});

describe("cross-staff isolation on a fresh lead with quote, lines, notes and history", () => {
  let owner: Actor;
  let leadId: string;
  let quoteId: string;

  beforeAll(async () => {
    owner = await fixtureActor("access-vis-owner", "staff");
    leadId = await createLead({ assignedTo: owner.id, tag: "visibility" });
    ({ quoteId } = await createQuote(leadId));
    await addNote(leadId);
  });
  afterAll(async () => cleanupLeads([leadId]));

  it("the assigned staff member sees the lead and every child row (control)", async () => {
    expect((await owner.db.from("leads").select("id").eq("id", leadId)).data).toHaveLength(1);
    for (const t of CHILD_TABLES) {
      const { data } = await owner.db.from(t).select("*").eq("lead_id", leadId);
      expect((data ?? []).length, t).toBeGreaterThan(0);
    }
    expect((await owner.db.from("quote_lines").select("id").eq("quote_id", quoteId)).data).toHaveLength(1);
  });

  for (const role of ["staff", "staff2", "ctv"] as const) {
    it(`seed ${role} sees none of it`, async () => {
      const other = await seedActor(role);
      expect((await other.db.from("leads").select("id").eq("id", leadId)).data ?? []).toEqual([]);
      for (const t of CHILD_TABLES) {
        const { data } = await other.db.from(t).select("*").eq("lead_id", leadId);
        expect(data ?? [], t).toEqual([]);
      }
      expect((await other.db.from("quote_lines").select("*").eq("quote_id", quoteId)).data ?? []).toEqual([]);
    });
  }

  it("admin and manager see the lead", async () => {
    for (const role of ["admin", "manager"] as const) {
      const a = await seedActor(role);
      expect((await a.db.from("leads").select("id").eq("id", leadId)).data, role).toHaveLength(1);
    }
  });
});
