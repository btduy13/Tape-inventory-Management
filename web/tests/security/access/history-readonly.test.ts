// Rule: the history tables (lead_status_log, lead_assignments) are written only by database
// triggers. No API caller, admin included, can insert, edit or delete history rows. Internal
// notes are append-only for non-admins.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addNote, cleanupLeads, createLead, fixtureActor, looseService } from "../helpers/lead-fixtures";
import { looseAnon, seedActor, type Actor, type LooseDb } from "../helpers/sessions";

let owner: Actor;
let leadId: string;
let noteId: number;

async function history(table: string) {
  const { data } = await looseService().from(table).select("*").eq("lead_id", leadId).order("id");
  return data ?? [];
}

beforeAll(async () => {
  owner = await fixtureActor("access-hist-owner", "staff");
  leadId = await createLead({ assignedTo: owner.id, tag: "history" });
  noteId = await addNote(leadId);
});
afterAll(async () => cleanupLeads([leadId]));

async function actors(): Promise<Array<[string, LooseDb]>> {
  return [
    ["anon", looseAnon()],
    ["owner-staff", owner.db],
    ["manager", (await seedActor("manager")).db],
    ["admin", (await seedActor("admin")).db],
  ];
}

for (const table of ["lead_status_log", "lead_assignments"] as const) {
  describe(`${table} is not writable by API clients`, () => {
    it("insert is rejected for every role", async () => {
      const before = await history(table);
      const row: Record<string, unknown> =
        table === "lead_status_log"
          ? { lead_id: leadId, from_status: "new", to_status: "done", note: "forged" }
          : { lead_id: leadId, assigned_to: null };
      for (const [name, db] of await actors()) {
        const { error } = await db.from(table).insert(row).select("id");
        expect(error, name).not.toBeNull();
      }
      expect(await history(table)).toEqual(before);
    });

    it("update and delete change nothing for every role", async () => {
      const before = await history(table);
      expect(before.length).toBeGreaterThan(0);
      const patch = table === "lead_status_log" ? { note: "rewritten" } : { assigned_to: null };
      for (const [, db] of await actors()) {
        await db.from(table).update(patch).eq("lead_id", leadId);
        await db.from(table).delete().eq("lead_id", leadId);
      }
      expect(await history(table)).toEqual(before);
    });
  });
}

describe("lead_notes are append-only for non-admins", () => {
  it("owner and manager cannot edit or delete an existing note", async () => {
    const before = await looseService().from("lead_notes").select("*").eq("id", noteId).single();
    for (const db of [owner.db, (await seedActor("manager")).db]) {
      await db.from("lead_notes").update({ body: "rewritten" }).eq("id", noteId);
      await db.from("lead_notes").delete().eq("id", noteId);
    }
    const after = await looseService().from("lead_notes").select("*").eq("id", noteId).single();
    expect(after.data).toEqual(before.data);
  });

  it("a note cannot be posted under another author's name", async () => {
    const { error } = await owner.db
      .from("lead_notes")
      .insert({ lead_id: leadId, author_id: (await seedActor("admin")).id, body: "spoofed" })
      .select("id");
    expect(error).not.toBeNull();
  });
});
