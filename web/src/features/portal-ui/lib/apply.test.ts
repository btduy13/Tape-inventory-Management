import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/types";
import { applyListQuery, nextDay, searchOrFilter, type ListQuery } from "./apply-query";
import { applyListInMemory, foldText } from "./apply-memory";
import { defineListSpec, parseListParams } from "./list-params";

const spec = defineListSpec({
  sort: { keys: { updated: { column: "updated_at", firstDir: "desc" }, name: { column: "name" }, qty: { column: "qty" } }, default: { key: "updated", dir: "desc" }, tiebreak: "id" },
  search: { columns: ["code", "name"] },
  filters: {
    status: { kind: "enum", column: "status", values: ["new", "quoted", "done"], multi: true },
    active: { kind: "bool", column: "is_active" },
  },
  dateRange: { column: "created_at" },
  pageSizes: [2, 50],
});

type Call = [string, ...unknown[]];
class FakeQuery implements ListQuery<FakeQuery> {
  calls: Call[] = [];
  private rec(...c: Call) { this.calls.push(c); return this; }
  order(column: string, o: { ascending: boolean; nullsFirst?: boolean }) { return this.rec("order", column, o); }
  in(column: string, v: readonly string[]) { return this.rec("in", column, [...v]); }
  eq(column: string, v: string | boolean) { return this.rec("eq", column, v); }
  gte(column: string, v: string) { return this.rec("gte", column, v); }
  lt(column: string, v: string) { return this.rec("lt", column, v); }
  or(f: string) { return this.rec("or", f); }
  range(a: number, b: number) { return this.rec("range", a, b); }
}

describe("applyListQuery", () => {
  it("applies defaults: sort + tiebreak + first page", () => {
    const q = applyListQuery(new FakeQuery(), spec, parseListParams(spec, {}));
    expect(q.calls).toEqual([
      ["order", "updated_at", { ascending: false, nullsFirst: false }],
      ["order", "id", { ascending: false }],
      ["range", 0, 1],
    ]);
  });

  it("maps URL keys to whitelisted columns only", () => {
    const state = parseListParams(spec, { q: "Lan", status: "new,done", active: "1", from: "2026-01-31", to: "2026-02-28", sort: "name", dir: "asc", page: "2", size: "50" });
    const q = applyListQuery(new FakeQuery(), spec, state);
    expect(q.calls).toEqual([
      ["or", 'code.ilike."*Lan*",name.ilike."*Lan*"'],
      ["in", "status", ["new", "done"]],
      ["eq", "is_active", true],
      ["gte", "created_at", "2026-01-31T00:00:00+07:00"],
      ["lt", "created_at", "2026-03-01T00:00:00+07:00"],
      ["order", "name", { ascending: true, nullsFirst: false }],
      ["order", "id", { ascending: true }],
      ["range", 50, 99],
    ]);
  });

  it("uses eq for one enum value and date-only bounds for date columns", () => {
    const dspec = { ...spec, dateRange: { column: "due_date", type: "date" as const } };
    const q = applyListQuery(new FakeQuery(), dspec, parseListParams(dspec, { status: "quoted", to: "2026-12-31" }), { paginate: false });
    expect(q.calls.slice(0, 2)).toEqual([["eq", "status", "quoted"], ["lt", "due_date", "2027-01-01"]]);
    expect(q.calls.some((c) => c[0] === "range")).toBe(false);
  });

  it("never lets a tampered state reach the builder", () => {
    const state = { ...parseListParams(spec, {}), sort: "password", q: 'x",id.neq.0', filters: { status: ["new", "evil"], unknown: ["1"] } };
    const q = applyListQuery(new FakeQuery(), spec, state);
    expect(q.calls[0]).toEqual(["or", 'code.ilike."*x id.neq.0*",name.ilike."*x id.neq.0*"']);
    expect(q.calls[1]).toEqual(["eq", "status", "new"]);
    expect(q.calls[2]).toEqual(["order", "updated_at", { ascending: false, nullsFirst: false }]);
  });
});

describe("helpers", () => {
  it("nextDay crosses month / year / leap day", () => {
    expect(nextDay("2028-02-28")).toBe("2028-02-29");
    expect(nextDay("2026-12-31")).toBe("2027-01-01");
  });
  it("searchOrFilter returns null for blank input", () => {
    expect(searchOrFilter(["a"], "  ,() ")).toBeNull();
  });
  it("foldText strips Vietnamese marks", () => {
    expect(foldText("Nguyễn Đức Thịnh")).toBe("nguyen duc thinh");
  });
});

describe("applyListInMemory", () => {
  const rows = [
    { id: "1", code: "L-001", name: "Nguyễn An", status: "new", is_active: true, qty: 10, created_at: "2026-01-31T17:30:00Z", updated_at: "2026-02-03T00:00:00Z" },
    { id: "2", code: "L-002", name: "Trần Bình", status: "quoted", is_active: false, qty: 2, created_at: "2026-02-01T03:00:00Z", updated_at: "2026-02-01T00:00:00Z" },
    { id: "3", code: "L-003", name: "Lê Chi", status: "done", is_active: true, qty: null, created_at: "2026-02-10T03:00:00Z", updated_at: "2026-02-02T00:00:00Z" },
  ];

  it("sorts by the default key and paginates", () => {
    const r = applyListInMemory(rows, spec, parseListParams(spec, {}));
    expect(r.total).toBe(3);
    expect(r.rows.map((x) => x.id)).toEqual(["1", "3"]);
  });

  it("clamps an out-of-range page to the last page instead of returning no rows (UI-2)", () => {
    const r = applyListInMemory(rows, spec, parseListParams(spec, { page: "99" }));
    expect(r.total).toBe(3);
    expect(r.rows.map((x) => x.id)).toEqual(["2"]);
  });

  it("searches without accents, filters enum + bool", () => {
    expect(applyListInMemory(rows, spec, parseListParams(spec, { q: "nguyen" })).rows.map((x) => x.id)).toEqual(["1"]);
    expect(applyListInMemory(rows, spec, parseListParams(spec, { status: "quoted,done", active: "1" })).rows.map((x) => x.id)).toEqual(["3"]);
  });

  it("filters dates by Vietnam calendar day (UTC 17:30 = next day in VN)", () => {
    const r = applyListInMemory(rows, spec, parseListParams(spec, { from: "2026-02-01", to: "2026-02-01" }));
    expect(r.rows.map((x) => x.id).sort()).toEqual(["1", "2"]);
  });

  it("keeps empty values last in both directions", () => {
    const asc = applyListInMemory(rows, spec, parseListParams(spec, { sort: "qty", dir: "asc", size: "50" }));
    const desc = applyListInMemory(rows, spec, parseListParams(spec, { sort: "qty", dir: "desc", size: "50" }));
    expect(asc.rows.map((x) => x.id)).toEqual(["2", "1", "3"]);
    expect(desc.rows.map((x) => x.id)).toEqual(["1", "2", "3"]);
  });

  it("sorts Vietnamese names with the vi collation", () => {
    const r = applyListInMemory(rows, spec, parseListParams(spec, { sort: "name", size: "50" }));
    expect(r.rows.map((x) => x.name)).toEqual(["Lê Chi", "Nguyễn An", "Trần Bình"]);
  });
});

// Compile-time guard: a real supabase-js builder must satisfy ListQuery (never executed).
export function _typecheckSupabaseBuilder(db: SupabaseClient<Database>) {
  return applyListQuery(db.from("leads").select("id, code", { count: "exact" }), spec, parseListParams(spec, {}));
}
