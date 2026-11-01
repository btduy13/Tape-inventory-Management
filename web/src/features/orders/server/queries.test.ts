// Regression (QC-13): staff could not read the admin's profile, so the timeline actor was "—".
import { describe, expect, it, vi } from "vitest";
import { getLeadDetail } from "./queries";

const LEAD = "11111111-1111-4111-8111-111111111111";
const ADMIN = "00000000-0000-0000-0000-00000000a001";
const STAFF = "00000000-0000-0000-0000-00000000a003";

/** Minimal PostgREST-like builder: every chain method returns itself; awaiting yields `result`. */
function chain(result: unknown) {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "limit", "in"]) b[m] = () => b;
  b.maybeSingle = async () => result;
  b.then = (ok: (v: unknown) => unknown) => Promise.resolve(result).then(ok);
  return b;
}

function fakeDb() {
  const tables: Record<string, unknown> = {
    leads: { data: { id: LEAD, assigned_to: STAFF } },
    designs: { data: [] },
    lead_status_log: {
      data: [{ id: 1, created_at: "2026-01-01T00:00:00Z", changed_by: ADMIN, from_status: "new", to_status: "assigned", note: null }],
    },
    lead_notes: { data: [] },
    quotes: { data: [] },
    // RLS: staff only sees its own profile.
    profiles: { data: [{ id: STAFF, full_name: "Nhân viên", email: "staff@local.test" }] },
  };
  return { from: (t: string) => chain(tables[t]) } as never;
}

describe("getLeadDetail actor names", () => {
  it("resolves actors hidden by profiles RLS through the resolver (only the missing ids)", async () => {
    const resolver = vi.fn(async () => ({ [ADMIN]: "Quản trị viên" }));
    const detail = await getLeadDetail(fakeDb(), LEAD, resolver);
    expect(resolver).toHaveBeenCalledWith([ADMIN]);
    expect(detail?.names).toEqual({ [STAFF]: "Nhân viên", [ADMIN]: "Quản trị viên" });
  });

  it("without a resolver keeps only RLS-visible names", async () => {
    const detail = await getLeadDetail(fakeDb(), LEAD);
    expect(detail?.names[ADMIN]).toBeUndefined();
  });
});
