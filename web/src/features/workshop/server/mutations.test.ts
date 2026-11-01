import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { advanceStep, assignWorkshop, convertLeadToProduction } from "./mutations";
import { getWorkshopJob, listWorkshopJobs } from "./queries";

type Db = SupabaseClient<Database>;
const LEAD = "6f1c1f0e-8a7b-4c2d-9e3f-1a2b3c4d5e6f";
const JOB = "7f1c1f0e-8a7b-4c2d-9e3f-1a2b3c4d5e6f";

const rpcDb = (result: { data?: unknown; error?: { code?: string; message?: string } | null }) => {
  const rpc = vi.fn().mockResolvedValue({ data: result.data ?? null, error: result.error ?? null });
  return { db: { rpc } as unknown as Db, rpc };
};

describe("convertLeadToProduction", () => {
  const input = { leadId: LEAD, dueDate: "2026-11-09", note: "In 2 màu", workshopUserId: null };

  it("calls only the RPC with the due date and maps the order id", async () => {
    const { db, rpc } = rpcDb({ data: "BK-11-26-001" });
    expect(await convertLeadToProduction(db, input)).toEqual({ ok: true, orderId: "BK-11-26-001" });
    expect(rpc).toHaveBeenCalledWith("convert_lead_to_production", {
      p_lead_id: LEAD, p_due_date: "2026-11-09", p_note: "In 2 màu", p_workshop_user_id: null,
    });
  });

  it("maps SQL errors", async () => {
    const cases: Array<[{ code: string; message?: string }, string]> = [
      [{ code: "42501" }, "forbidden"],
      [{ code: "P0002" }, "notFound"],
      [{ code: "22023", message: "due date must be today or later" }, "badDueDate"],
      [{ code: "22023", message: "assignee must be an active workshop user" }, "badAssignee"],
      [{ code: "22023", message: "lead must be accepted before production (is quoted)" }, "notReady"],
      [{ code: "XX000" }, "generic"],
    ];
    for (const [error, reason] of cases) {
      expect(await convertLeadToProduction(rpcDb({ error }).db, input)).toEqual({ ok: false, reason });
    }
  });
});

describe("advanceStep / assignWorkshop", () => {
  it("advance calls advance_production_step and maps errors", async () => {
    const { db, rpc } = rpcDb({});
    expect(await advanceStep(db, { jobId: JOB, to: "dang_in", note: null })).toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith("advance_production_step", { p_job_id: JOB, p_to: "dang_in", p_note: null });
    expect(await advanceStep(rpcDb({ error: { code: "42501" } }).db, { jobId: JOB, to: "huy", note: null }))
      .toEqual({ ok: false, reason: "forbidden" });
    expect(await advanceStep(rpcDb({ error: { code: "P0002" } }).db, { jobId: JOB, to: "dang_in", note: null }))
      .toEqual({ ok: false, reason: "notFound" });
  });

  it("assign calls assign_production_job (null = unassign)", async () => {
    const { db, rpc } = rpcDb({});
    expect(await assignWorkshop(db, { leadId: LEAD, userId: null })).toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith("assign_production_job", { p_lead_id: LEAD, p_user_id: null });
    expect(await assignWorkshop(rpcDb({ error: { code: "22023" } }).db, { leadId: LEAD, userId: JOB }))
      .toEqual({ ok: false, reason: "invalid" });
  });
});

describe("queries go through workshop_jobs only", () => {
  it("lists and fetches one job; errors give empty results", async () => {
    const { db, rpc } = rpcDb({ data: [{ job_id: JOB }] });
    expect(await listWorkshopJobs(db)).toEqual([{ job_id: JOB }]);
    expect(await getWorkshopJob(db, JOB)).toEqual({ job_id: JOB });
    expect(rpc).toHaveBeenCalledWith("workshop_jobs", { p_job_id: JOB });
    expect(await listWorkshopJobs(rpcDb({ error: { code: "42501" } }).db)).toEqual([]);
    expect(await getWorkshopJob(rpcDb({ data: [] }).db, JOB)).toBeNull();
  });
});
