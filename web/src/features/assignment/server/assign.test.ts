import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { assignLead } from "./assign";
import { sortAssignees } from "./queries";
import { assignSchema } from "../lib/schemas";

const LEAD = "6f1c1f0e-8a7b-4c2d-9e3f-1a2b3c4d5e6f";
const USER = "0b0c0d0e-1111-4222-8333-444455556666";
const leadRow = { id: LEAD, code: "L-001", customer_name: "Anh A", phone: "0901", quantity: 100 };

function mockDb(rpcResult: { data: unknown; error: { code: string } | null }, assignee: unknown = { id: USER, full_name: "Bình", email: "binh@x.vn" }) {
  const rpc = vi.fn().mockResolvedValue(rpcResult);
  const db = {
    rpc,
    from: vi.fn(() => ({ select: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: assignee, error: null }) }) }) })),
  } as unknown as SupabaseClient<Database>;
  return { db, rpc };
}

describe("assignLead", () => {
  it("assigns via RPC and notifies the assignee", async () => {
    const { db, rpc } = mockDb({ data: leadRow, error: null });
    const notify = vi.fn().mockResolvedValue({ ok: true });
    const r = await assignLead(db, notify, { leadId: LEAD, userId: USER });
    expect(rpc).toHaveBeenCalledWith("assign_lead", { p_lead_id: LEAD, p_user_id: USER });
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ leadId: LEAD, code: "L-001", staffEmail: "binh@x.vn", staffName: "Bình" }));
    expect(r).toEqual({ ok: true, assigneeName: "Bình", notified: true });
  });

  it("unassign does not notify", async () => {
    const { db, rpc } = mockDb({ data: leadRow, error: null });
    const notify = vi.fn();
    expect(await assignLead(db, notify, { leadId: LEAD, userId: null })).toEqual({ ok: true, assigneeName: null, notified: null });
    expect(rpc).toHaveBeenCalledWith("assign_lead", { p_lead_id: LEAD, p_user_id: null });
    expect(notify).not.toHaveBeenCalled();
  });

  it("email failure keeps the assignment but reports it", async () => {
    const { db } = mockDb({ data: leadRow, error: null });
    const r = await assignLead(db, vi.fn().mockRejectedValue(new Error("smtp")), { leadId: LEAD, userId: USER });
    expect(r).toEqual({ ok: true, assigneeName: "Bình", notified: false });
  });

  it("maps SQL errors", async () => {
    const notify = vi.fn();
    expect(await assignLead(mockDb({ data: null, error: { code: "42501" } }).db, notify, { leadId: LEAD, userId: USER })).toEqual({ ok: false, reason: "forbidden" });
    expect(await assignLead(mockDb({ data: null, error: { code: "22023" } }).db, notify, { leadId: LEAD, userId: USER })).toEqual({ ok: false, reason: "invalidAssignee" });
    expect(await assignLead(mockDb({ data: null, error: { code: "P0002" } }).db, notify, { leadId: LEAD, userId: USER })).toEqual({ ok: false, reason: "notFound" });
    expect(notify).not.toHaveBeenCalled();
  });
});

describe("assignment helpers", () => {
  it("parses empty userId as unassign and rejects junk", () => {
    expect(assignSchema.parse({ leadId: LEAD, userId: "" }).userId).toBeNull();
    expect(assignSchema.parse({ leadId: LEAD, userId: USER }).userId).toBe(USER);
    expect(assignSchema.safeParse({ leadId: LEAD, userId: "admin" }).success).toBe(false);
  });

  it("sorts field roles first", () => {
    const list = sortAssignees([
      { id: "1", full_name: "Zed", email: null, role: "admin" },
      { id: "2", full_name: "An", email: null, role: "ctv" },
      { id: "3", full_name: "Bao", email: null, role: "staff" },
    ]);
    expect(list.map((a) => a.id)).toEqual(["3", "2", "1"]);
  });
});
