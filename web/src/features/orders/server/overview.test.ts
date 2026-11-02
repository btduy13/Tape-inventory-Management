// Regression (BE-1): a failed count/read must surface as error=true, never as a quiet 0 / empty list.
import { describe, expect, it } from "vitest";
import { loadLeadOverview } from "./overview";
import { listAssigneeOptions } from "./lead-list";

const DENIED = { data: null, count: null, error: { code: "42501", message: "permission denied" } };

/** Minimal PostgREST-like builder: every chain method returns itself; awaiting yields `result`. */
function chain(result: unknown) {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "is", "in", "lt", "not", "order", "limit"]) b[m] = () => b;
  b.then = (ok: (v: unknown) => unknown) => Promise.resolve(result).then(ok);
  return b;
}

function fakeDb(results: Record<string, unknown>) {
  return { from: (t: string) => chain(results[t] ?? { data: [], count: 0, error: null }) } as never;
}

describe("loadLeadOverview error aggregation", () => {
  it("flags error when the overdue production_jobs count fails", async () => {
    const o = await loadLeadOverview(fakeDb({ leads: { data: [], count: 2, error: null }, production_jobs: DENIED }));
    expect(o.error).toBe(true);
    expect(o.overdueJobs).toBe(0);
  });

  it("no error when every query succeeds", async () => {
    const o = await loadLeadOverview(
      fakeDb({ leads: { data: [], count: 2, error: null }, production_jobs: { data: null, count: 3, error: null } }),
    );
    expect(o.error).toBe(false);
    expect(o.overdueJobs).toBe(3);
  });
});

describe("listAssigneeOptions", () => {
  it("reports error when the profiles read fails", async () => {
    expect(await listAssigneeOptions(fakeDb({ profiles: DENIED }))).toEqual({ options: [], error: true });
  });

  it("maps names with email/id fallback", async () => {
    const res = await listAssigneeOptions(
      fakeDb({ profiles: { data: [{ id: "a", full_name: "", email: "s@local.test" }, { id: "b", full_name: null, email: null }], error: null } }),
    );
    expect(res).toEqual({ options: [{ id: "a", name: "s@local.test" }, { id: "b", name: "b" }], error: false });
  });
});
