// Rule: Realtime access ends with data access. Once a staff member is unassigned, or their
// account is deactivated, they receive no further change events for that lead.
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addNote, cleanupLeads, createLead, fixtureActor, looseService, setActive, waitFor } from "../helpers/lead-fixtures";
import type { Actor } from "../helpers/sessions";

type Payload = RealtimePostgresChangesPayload<Record<string, unknown>>;

let unassigned: Actor;
let deactivated: Actor;
const leads: { unassign?: string; deactivate?: string } = {};
const channels: RealtimeChannel[] = [];
const got = new Map<string, Payload[]>();

const about = (sink: Payload[], id: string) =>
  sink.filter((p) => [p.new, p.old].some((r) => r && ((r as Record<string, unknown>).id === id || (r as Record<string, unknown>).lead_id === id)));

async function listen(actor: Actor): Promise<Payload[]> {
  const sink: Payload[] = [];
  const ch = actor.db.channel(`sec-revoke-${actor.name}-${Date.now()}`);
  for (const table of ["leads", "lead_status_log", "lead_notes", "quotes"]) {
    ch.on("postgres_changes", { event: "*", schema: "public", table }, (p: Payload) => sink.push(p));
  }
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("realtime subscribe timeout")), 20_000);
    ch.subscribe((s, err) => {
      if (s === "SUBSCRIBED") {
        clearTimeout(t);
        resolve();
      } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") {
        clearTimeout(t);
        reject(err ?? new Error(s));
      }
    });
  });
  channels.push(ch);
  got.set(actor.name, sink);
  return sink;
}

beforeAll(async () => {
  unassigned = await fixtureActor("access-rtr-unassign", "staff");
  deactivated = await fixtureActor("access-rtr-deactivate", "staff");
  leads.unassign = await createLead({ assignedTo: unassigned.id, tag: "rt-unassign" });
  leads.deactivate = await createLead({ assignedTo: deactivated.id, tag: "rt-deactivate" });
  await listen(unassigned);
  await listen(deactivated);
  await new Promise((r) => setTimeout(r, 3000));
});

afterAll(async () => {
  for (const ch of channels) await ch.unsubscribe();
  await setActive(deactivated.id, true);
  await cleanupLeads([leads.unassign!, leads.deactivate!].filter(Boolean));
});

describe("realtime events stop after unassignment", () => {
  it("events arrive while assigned (control), none after unassign", async () => {
    const svc = looseService();
    const id = leads.unassign!;
    const sink = got.get(unassigned.name)!;
    await svc.from("leads").update({ customer_note: "while assigned" }).eq("id", id);
    expect(await waitFor(() => about(sink, id).length > 0, 20_000), "control").toBe(true);

    await svc.from("leads").update({ assigned_to: null }).eq("id", id);
    await new Promise((r) => setTimeout(r, 1500));
    const mark = about(sink, id).length;
    await svc.from("leads").update({ customer_note: "after unassign: secret" }).eq("id", id);
    await addNote(id, "after unassign note");
    await new Promise((r) => setTimeout(r, 2500));
    const leaked = about(sink, id).slice(mark);
    expect(leaked.map((p) => `${p.table}:${p.eventType}`)).toEqual([]);
  });
});

describe("realtime events stop after deactivation", () => {
  it("events arrive while active (control), none after deactivation", async () => {
    const svc = looseService();
    const id = leads.deactivate!;
    const sink = got.get(deactivated.name)!;
    await svc.from("leads").update({ customer_note: "while active" }).eq("id", id);
    expect(await waitFor(() => about(sink, id).length > 0, 20_000), "control").toBe(true);

    await setActive(deactivated.id, false);
    await new Promise((r) => setTimeout(r, 500));
    const mark = about(sink, id).length;
    await svc.from("leads").update({ customer_note: "after deactivation: secret" }).eq("id", id);
    await svc.from("leads").update({ status: "consulting" }).eq("id", id);
    await addNote(id, "after deactivation note");
    await new Promise((r) => setTimeout(r, 2500));
    const leaked = about(sink, id).slice(mark);
    expect(leaked.map((p) => `${p.table}:${p.eventType}`)).toEqual([]);
  });
});
