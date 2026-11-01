// Rule: production steps change ONLY through advance_production_step. Workshop: own job, next step
// only, no cancel. Admin: any step + cancel. Each change is logged (who/when/note) and synced to
// the lead status and the Electron da_giao flag. Nobody writes production tables directly.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cleanupLeads, looseService } from "../helpers/lead-fixtures";
import { SEED_IDS, seedActor } from "../helpers/sessions";
import { assignJob, cleanupOrders, createAcceptedLead, jobOf, leadStatus, vnDate } from "../helpers/workshop";

let leadId: string;
let jobId: string;

async function orderDelivered(): Promise<boolean | null> {
  const job = await jobOf(leadId);
  const { data } = await looseService().from("bang_keo_in_orders").select("da_giao").eq("id", job!.order_id!).single();
  return (data as { da_giao: boolean | null } | null)?.da_giao ?? null;
}

beforeAll(async () => {
  leadId = await createAcceptedLead("ws-steps");
  jobId = await assignJob(leadId, SEED_IDS.workshop);
});
afterAll(async () => {
  await cleanupOrders([leadId]);
  await cleanupLeads([leadId]);
});

describe("step rules", () => {
  it("no step change before conversion", async () => {
    const { error } = await (await seedActor("workshop")).db.rpc("advance_production_step", { p_job_id: jobId, p_to: "dang_in" });
    expect(error?.code).toBe("22023");
    const conv = await (await seedActor("workshop")).db.rpc("convert_lead_to_production", { p_lead_id: leadId, p_due_date: vnDate(7) });
    expect(conv.error).toBeNull();
  });

  it("workshop cannot skip a step or cancel", async () => {
    const ws = (await seedActor("workshop")).db;
    expect((await ws.rpc("advance_production_step", { p_job_id: jobId, p_to: "dong_goi" })).error?.code).toBe("42501");
    expect((await ws.rpc("advance_production_step", { p_job_id: jobId, p_to: "huy" })).error?.code).toBe("42501");
    expect((await jobOf(leadId))?.step).toBe("cho_san_xuat");
  });

  it("workshop2, staff and manager cannot change the job", async () => {
    for (const role of ["workshop2", "staff", "manager"] as const) {
      const { error } = await (await seedActor(role)).db.rpc("advance_production_step", { p_job_id: jobId, p_to: "dang_in" });
      expect(error, role).not.toBeNull();
    }
    expect((await jobOf(leadId))?.step).toBe("cho_san_xuat");
  });

  it("direct writes to production tables are refused for workshop and admin", async () => {
    for (const role of ["workshop", "admin"] as const) {
      const db = (await seedActor(role)).db;
      const upd = await db.from("production_jobs").update({ step: "da_giao" }).eq("id", jobId).select("id");
      expect(upd.error, role).not.toBeNull();
      const ins = await db.from("production_step_log").insert({ job_id: jobId, to_step: "da_giao" });
      expect(ins.error, role).not.toBeNull();
      const del = await db.from("production_jobs").delete().eq("id", jobId).select("id");
      expect(del.error, role).not.toBeNull();
    }
    expect((await jobOf(leadId))?.step).toBe("cho_san_xuat");
  });
});

describe("workflow + sync", () => {
  it("workshop walks the steps; each change is logged with who and note", async () => {
    const ws = (await seedActor("workshop")).db;
    for (const step of ["dang_in", "dang_cat_cuon", "dong_goi"]) {
      const { error } = await ws.rpc("advance_production_step", { p_job_id: jobId, p_to: step, p_note: `SEC ${step}` });
      expect(error, step).toBeNull();
    }
    expect(await leadStatus(leadId)).toBe("production");
    const { data: log } = await ws.from("production_step_log").select("*").eq("job_id", jobId).order("id");
    expect(log!.map((r: { to_step: string }) => r.to_step)).toEqual(["cho_san_xuat", "dang_in", "dang_cat_cuon", "dong_goi"]);
    const last = log![log!.length - 1] as Record<string, unknown>;
    expect(last).toMatchObject({ from_step: "dang_cat_cuon", changed_by: SEED_IDS.workshop, note: "SEC dong_goi" });
  });

  it("san_sang_giao -> lead shipping; da_giao -> lead done + Electron da_giao", async () => {
    const ws = (await seedActor("workshop")).db;
    expect((await ws.rpc("advance_production_step", { p_job_id: jobId, p_to: "san_sang_giao" })).error).toBeNull();
    expect(await leadStatus(leadId)).toBe("shipping");
    expect(await orderDelivered()).toBe(false);
    expect((await ws.rpc("advance_production_step", { p_job_id: jobId, p_to: "da_giao" })).error).toBeNull();
    expect(await leadStatus(leadId)).toBe("done");
    expect(await orderDelivered()).toBe(true);
    const { data: statusLog } = await looseService().from("lead_status_log").select("to_status, changed_by").eq("lead_id", leadId);
    expect(statusLog).toEqual(expect.arrayContaining([
      { to_status: "shipping", changed_by: SEED_IDS.workshop },
      { to_status: "done", changed_by: SEED_IDS.workshop },
    ]));
  });

  it("admin may move back (clears da_giao, lead stays done) and cancel", async () => {
    const admin = (await seedActor("admin")).db;
    expect((await admin.rpc("advance_production_step", { p_job_id: jobId, p_to: "dong_goi", p_note: "SEC back" })).error).toBeNull();
    expect(await orderDelivered()).toBe(false);
    expect(await leadStatus(leadId)).toBe("done");
    expect((await admin.rpc("advance_production_step", { p_job_id: jobId, p_to: "huy" })).error).toBeNull();
    expect((await jobOf(leadId))?.step).toBe("huy");
  });
});
