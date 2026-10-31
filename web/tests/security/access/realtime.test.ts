// Rule: Realtime postgres_changes follow RLS. staff2 receives no change event for a lead
// assigned to another staff member (leads, lead_status_log, lead_notes, quotes). DELETE
// events (not RLS-filtered by Supabase) carry only the primary key.
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addNote, cleanupLeads, createLead, createQuote, fixtureActor, looseService, waitFor } from "../helpers/lead-fixtures";
import { seedActor, type Actor } from "../helpers/sessions";

type Payload = RealtimePostgresChangesPayload<Record<string, unknown>>;
const TABLES = ["leads", "lead_status_log", "lead_notes", "quotes"] as const;

let owner: Actor;
let outsider: Actor;
let leadId: string;
const channels: RealtimeChannel[] = [];
const received = { owner: [] as Payload[], outsider: [] as Payload[] };

function concernsLead(p: Payload, id: string): boolean {
  const rows = [p.new, p.old] as Array<Record<string, unknown> | undefined>;
  return rows.some((r) => r && (r.id === id || r.lead_id === id));
}

async function subscribe(actor: Actor, sink: Payload[]): Promise<void> {
  const ch = actor.db.channel(`sec-access-${actor.name}-${Date.now()}`);
  for (const table of TABLES) {
    ch.on("postgres_changes", { event: "*", schema: "public", table }, (p: Payload) => sink.push(p));
  }
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`realtime subscribe timeout for ${actor.name}`)), 20_000);
    ch.subscribe((status, err) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(t);
        resolve();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(t);
        reject(err ?? new Error(`realtime ${status}`));
      }
    });
  });
  channels.push(ch);
}

beforeAll(async () => {
  owner = await fixtureActor("access-rt-owner", "staff");
  outsider = await seedActor("staff2");
  leadId = await createLead({ assignedTo: owner.id, tag: "realtime" });
  await subscribe(owner, received.owner);
  await subscribe(outsider, received.outsider);
  // Realtime needs a moment after SUBSCRIBED before the RLS-checked stream is live.
  await new Promise((r) => setTimeout(r, 1500));
});

afterAll(async () => {
  for (const ch of channels) await ch.unsubscribe();
  await cleanupLeads([leadId]);
});

describe("staff2 receives no change events for another staff's lead", () => {
  it("updates, status history, notes and quotes reach the owner but not staff2", async () => {
    const svc = looseService();
    await svc.from("leads").update({ customer_note: "realtime probe" }).eq("id", leadId);
    await svc.from("leads").update({ status: "consulting" }).eq("id", leadId);
    await addNote(leadId, "realtime note");
    await createQuote(leadId);

    const ownerGotAll = await waitFor(() => {
      const tables = new Set(received.owner.filter((p) => concernsLead(p, leadId)).map((p) => p.table));
      return TABLES.every((t) => tables.has(t));
    }, 15_000);
    expect(ownerGotAll, "control: owner should receive events on every table").toBe(true);
    await new Promise((r) => setTimeout(r, 1500));
    expect(received.outsider.filter((p) => concernsLead(p, leadId))).toEqual([]);
  });

  it("DELETE events seen by staff2 carry only the primary key", async () => {
    const svc = looseService();
    const noteId = await addNote(leadId, "to be deleted");
    await svc.from("lead_notes").delete().eq("id", noteId);
    await svc.from("leads").update({ customer_note: "before delete" }).eq("id", leadId);
    // delete a throwaway lead so the leads DELETE path is exercised too
    const doomed = await createLead({ assignedTo: owner.id, tag: "realtime-del" });
    await svc.from("leads").delete().eq("id", doomed);
    await waitFor(() => received.owner.some((p) => p.eventType === "DELETE" && p.table === "leads"), 10_000);
    await new Promise((r) => setTimeout(r, 1500));
    const deletes = received.outsider.filter((p) => p.eventType === "DELETE");
    for (const p of deletes) {
      const keys = Object.keys(p.old ?? {});
      expect(keys.every((k) => k === "id"), `${p.table} DELETE leaked ${keys.join(",")}`).toBe(true);
    }
  });
});
