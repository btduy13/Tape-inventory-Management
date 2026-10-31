// Rule: staff / ctv may only move the status of their own lead (allowed steps). They cannot
// change assignment, customer fields, the production link or the design. Managers may edit
// customer fields but not assignment.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cleanupLeads, createLead, fixtureActor, looseService } from "../helpers/lead-fixtures";
import { SEED_IDS, seedActor, type Actor } from "../helpers/sessions";

let staffOwner: Actor;
let ctvOwner: Actor;
const leads: string[] = [];

async function leadRow(id: string) {
  const { data } = await looseService().from("leads").select("*").eq("id", id).single();
  return data as Record<string, unknown>;
}
async function designRow(id: string) {
  const { data } = await looseService().from("designs").select("*").eq("lead_id", id).single();
  return data as Record<string, unknown>;
}

const FORBIDDEN_FOR_STAFF: Array<[string, (self: string) => Record<string, unknown>]> = [
  ["assigned_to (other user)", () => ({ assigned_to: SEED_IDS.staff2 })],
  ["assigned_to (unassign)", () => ({ assigned_to: null })],
  ["assigned_to (same value)", (self) => ({ assigned_to: self })],
  ["assigned_at", () => ({ assigned_at: "2020-01-01T00:00:00Z" })],
  ["customer_name", () => ({ customer_name: "Hacked" })],
  ["phone", () => ({ phone: "0999999999" })],
  ["email", () => ({ email: "attacker@example.com" })],
  ["company", () => ({ company: "Evil" })],
  ["quantity", () => ({ quantity: 1 })],
  ["customer_note", () => ({ customer_note: "changed" })],
  ["production_order_id", () => ({ production_order_id: "BK-01-26-999" })],
  ["source_ip_hash", () => ({ source_ip_hash: "x" })],
];

beforeAll(async () => {
  staffOwner = await fixtureActor("access-cols-staff", "staff");
  ctvOwner = await fixtureActor("access-cols-ctv", "ctv");
  leads.push(await createLead({ assignedTo: staffOwner.id, tag: "cols-staff" }));
  leads.push(await createLead({ assignedTo: ctvOwner.id, tag: "cols-ctv" }));
});
afterAll(async () => cleanupLeads(leads));

describe("staff / ctv cannot change assignment or customer fields of their own lead", () => {
  for (const [label, patch] of FORBIDDEN_FOR_STAFF) {
    it(`${label} is rejected (42501) and unchanged`, async () => {
      for (const [actor, leadId] of [
        [staffOwner, leads[0]],
        [ctvOwner, leads[1]],
      ] as const) {
        const before = await leadRow(leadId);
        const { error } = await actor.db.from("leads").update(patch(actor.id)).eq("id", leadId).select("id");
        expect(error?.code, `${actor.name}: ${label}`).toBe("42501");
        expect(await leadRow(leadId)).toEqual(before);
      }
    });
  }

  it("design rows are not writable by the assigned staff member", async () => {
    const before = await designRow(leads[0]);
    await staffOwner.db.from("designs").update({ print_text: "HACK", logo_path: "x/y.png" }).eq("lead_id", leads[0]);
    await staffOwner.db.from("designs").delete().eq("lead_id", leads[0]);
    const ins = await staffOwner.db
      .from("designs")
      .insert({ lead_id: leads[0], width_mm: 48, length_m: 100, thickness_mic: 40, colors: ["#000000"] })
      .select("id");
    expect(ins.error).not.toBeNull();
    expect(await designRow(leads[0])).toEqual(before);
  });

  it("an allowed status step works for the owner (control)", async () => {
    const { error } = await staffOwner.db.from("leads").update({ status: "consulting" }).eq("id", leads[0]).select("id");
    expect(error).toBeNull();
    expect((await leadRow(leads[0])).status).toBe("consulting");
  });

  it("a disallowed status step (to quoted/accepted) is rejected", async () => {
    for (const to of ["quoted", "accepted", "new"]) {
      const { error } = await staffOwner.db.from("leads").update({ status: to }).eq("id", leads[0]).select("id");
      expect(error?.code, to).toBe("42501");
    }
    expect((await leadRow(leads[0])).status).toBe("consulting");
  });

  it("staff cannot delete their own lead", async () => {
    await staffOwner.db.from("leads").delete().eq("id", leads[0]);
    expect(await leadRow(leads[0])).toBeTruthy();
  });
});

describe("manager cannot change assignment", () => {
  it("direct assigned_to update is rejected", async () => {
    const manager = await seedActor("manager");
    const before = await leadRow(leads[1]);
    const { error } = await manager.db.from("leads").update({ assigned_to: SEED_IDS.staff2 }).eq("id", leads[1]).select("id");
    expect(error?.code).toBe("42501");
    expect(await leadRow(leads[1])).toEqual(before);
  });

  it("manager may edit customer fields (control)", async () => {
    const manager = await seedActor("manager");
    const { error } = await manager.db.from("leads").update({ customer_note: "manager edit" }).eq("id", leads[1]).select("id");
    expect(error).toBeNull();
    expect((await leadRow(leads[1])).customer_note).toBe("manager edit");
  });
});
