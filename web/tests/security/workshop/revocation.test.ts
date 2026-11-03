// Rule: access follows the assignment. Unassigning (or deactivating) a workshop user removes its
// job, design files and realtime events immediately; assigned users read only their own design
// files and never quote PDFs.
import type { RealtimeChannel } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cleanupLeads, fixtureActor, looseService, PNG_1PX, setActive, waitFor } from "../helpers/lead-fixtures";
import { seedActor, type Actor } from "../helpers/sessions";
import { assignJob, cleanupOrders, createAcceptedLead, uploadPreview, vnDate } from "../helpers/workshop";

let worker: Actor;
let leadId: string;
let jobId: string;
const channels: RealtimeChannel[] = [];

beforeAll(async () => {
  worker = await fixtureActor("ws-revoke", "workshop");
  leadId = await createAcceptedLead("ws-revoke");
  await uploadPreview(leadId);
  await looseService().storage.from("quotes").upload(`${leadId}/q.pdf`, PNG_1PX, { contentType: "application/pdf", upsert: true });
  jobId = await assignJob(leadId, worker.id);
});
afterAll(async () => {
  for (const ch of channels) await ch.unsubscribe();
  await setActive(worker.id, true);
  await cleanupOrders([leadId]);
  await cleanupLeads([leadId]);
});

async function visibleJobs(): Promise<number> {
  const { data } = await worker.db.rpc("workshop_jobs");
  return Array.isArray(data) ? data.length : 0;
}

describe("design files", () => {
  it("assigned workshop can sign its job's preview, not the quote PDF", async () => {
    const preview = await worker.db.storage.from("previews").createSignedUrl(`${leadId}/preview.png`, 60);
    expect(preview.error).toBeNull();
    const pdf = await worker.db.storage.from("quotes").createSignedUrl(`${leadId}/q.pdf`, 60);
    expect(pdf.error).not.toBeNull();
  });

  it("another workshop user cannot sign it", async () => {
    const other = await (await seedActor("workshop2")).db.storage.from("previews").createSignedUrl(`${leadId}/preview.png`, 60);
    expect(other.error).not.toBeNull();
  });
});

describe("realtime + unassign", () => {
  it("events arrive while assigned; after unassign: no job, no files, no events", async () => {
    const sink: Array<Record<string, unknown>> = [];
    const ch = worker.db.channel(`sec-ws-${Date.now()}`);
    for (const table of ["production_jobs", "production_step_log"]) {
      ch.on("postgres_changes", { event: "*", schema: "public", table }, (p: { new: Record<string, unknown> }) => sink.push(p.new));
    }
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("realtime subscribe timeout")), 20_000);
      ch.subscribe((s, err) => {
        if (s === "SUBSCRIBED") { clearTimeout(t); resolve(); }
        else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") { clearTimeout(t); reject(err ?? new Error(s)); }
      });
    });
    channels.push(ch);
    await new Promise((r) => setTimeout(r, 3000));

    // control: the hand-off by the worker produces job + log events
    expect((await worker.db.rpc("convert_lead_to_production", { p_lead_id: leadId, p_due_date: vnDate(2) })).error).toBeNull();
    expect(await waitFor(() => sink.some((r) => r.id === jobId || r.job_id === jobId))).toBe(true);

    expect((await (await seedActor("admin")).db.rpc("assign_production_job", { p_lead_id: leadId, p_user_id: null })).error).toBeNull();
    expect(await visibleJobs()).toBe(0);
    expect((await worker.db.storage.from("previews").createSignedUrl(`${leadId}/preview.png`, 60)).error).not.toBeNull();
    expect((await worker.db.rpc("advance_production_step", { p_job_id: jobId, p_to: "dang_san_xuat" })).error?.code).toBe("P0002");

    sink.length = 0;
    expect((await (await seedActor("admin")).db.rpc("advance_production_step", { p_job_id: jobId, p_to: "dang_san_xuat", p_note: "SEC after unassign" })).error).toBeNull();
    await new Promise((r) => setTimeout(r, 3000));
    expect(sink.filter((r) => r.id === jobId || r.job_id === jobId)).toEqual([]);
  });

  it("deactivating the workshop user removes access even when assigned", async () => {
    expect((await (await seedActor("admin")).db.rpc("assign_production_job", { p_lead_id: leadId, p_user_id: worker.id })).error).toBeNull();
    expect(await visibleJobs()).toBe(1);
    await setActive(worker.id, false);
    const { error } = await worker.db.rpc("workshop_jobs");
    expect(error?.code).toBe("42501");
    const { data } = await worker.db.from("production_jobs").select("id");
    expect(data ?? []).toEqual([]);
    expect((await worker.db.rpc("advance_production_step", { p_job_id: jobId, p_to: "san_sang_giao" })).error).not.toBeNull();
    await setActive(worker.id, true);
    expect(await visibleJobs()).toBe(1);
  });
});
