import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, LeadStatus } from "@/lib/types";
import { addLeadNote, changeLeadStatus } from "./mutations";

const LEAD = "6f1c1f0e-8a7b-4c2d-9e3f-1a2b3c4d5e6f";

function mockDb(current: { id: string; status: LeadStatus } | null, rpcError: { code: string } | null = null) {
  const rpc = vi.fn().mockResolvedValue({ data: null, error: rpcError });
  const insert = vi.fn().mockResolvedValue({ error: null });
  const maybeSingle = vi.fn().mockResolvedValue({ data: current, error: null });
  const db = {
    rpc,
    from: vi.fn((table: string) =>
      table === "lead_notes" ? { insert } : { select: () => ({ eq: () => ({ maybeSingle }) }) },
    ),
  } as unknown as SupabaseClient<Database>;
  return { db, rpc, insert };
}

describe("changeLeadStatus", () => {
  it("calls the RPC with note for allowed staff transition", async () => {
    const { db, rpc } = mockDb({ id: LEAD, status: "assigned" });
    const r = await changeLeadStatus(db, { id: "u", role: "staff" }, { leadId: LEAD, to: "consulting", note: "called" });
    expect(r).toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith("change_lead_status", { p_lead_id: LEAD, p_to: "consulting", p_note: "called" });
  });

  it("blocks staff from setting quoted (DB would also reject)", async () => {
    const { db, rpc } = mockDb({ id: LEAD, status: "consulting" });
    const r = await changeLeadStatus(db, { id: "u", role: "ctv" }, { leadId: LEAD, to: "quoted", note: null });
    expect(r).toEqual({ ok: false, reason: "transition" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("manager may do any transition", async () => {
    const { db } = mockDb({ id: LEAD, status: "new" });
    expect(await changeLeadStatus(db, { id: "m", role: "manager" }, { leadId: LEAD, to: "quoted", note: null })).toEqual({ ok: true });
  });

  it("invisible lead (RLS) is notFound; RPC errors are classified", async () => {
    expect(await changeLeadStatus(mockDb(null).db, { id: "u", role: "staff" }, { leadId: LEAD, to: "done", note: null }))
      .toEqual({ ok: false, reason: "notFound" });
    const { db } = mockDb({ id: LEAD, status: "assigned" }, { code: "42501" });
    expect(await changeLeadStatus(db, { id: "u", role: "staff" }, { leadId: LEAD, to: "consulting", note: null }))
      .toEqual({ ok: false, reason: "forbidden" });
  });
});

describe("addLeadNote", () => {
  it("inserts with author = actor", async () => {
    const { db, insert } = mockDb(null);
    expect(await addLeadNote(db, { id: "u1", role: "staff" }, { leadId: LEAD, body: "hi" })).toEqual({ ok: true });
    expect(insert).toHaveBeenCalledWith({ lead_id: LEAD, body: "hi", author_id: "u1" });
  });
});
