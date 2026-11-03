import { describe, expect, it } from "vitest";
import { listHref, parseListParams } from "@/features/portal-ui/lib/list-params";
import type { WorkshopJobRow } from "@/lib/types";
import { countJobs, isFiltered, jobListSpec, queryJobs, toListRow, viewOf, withView } from "./list";

const NOW = new Date("2026-11-01T20:00:00Z"); // 2026-11-02 in Vietnam
const W1 = "00000000-0000-0000-0000-00000000a006";

let n = 0;
const job = (over: Partial<WorkshopJobRow>): WorkshopJobRow => ({
  job_id: `00000000-0000-0000-0000-${String(++n).padStart(12, "0")}`, lead_id: "x", lead_code: `L${n}`,
  order_id: `BK-${n}`, step: "dang_san_xuat", due_date: "2026-11-09", production_note: null,
  workshop_user_id: null, workshop_user_name: null, quantity: 100, width_mm: 48, length_m: 100,
  thickness_mic: 50, colors: null, print_text: null, design_json: null, preview_path: null, logo_path: null,
  desktop_delivered: false, converted_at: null, updated_at: "2026-11-01T00:00:00Z",
  order_name: null, order_table: "bang_keo_in_orders", ...over,
});

const rows = [
  job({ order_id: "BK-A", due_date: "2026-11-01", print_text: "Cà phê Đà Lạt" }), // overdue
  job({ order_id: "BK-B", due_date: "2026-11-02", step: "san_sang_giao", workshop_user_id: W1 }), // today
  job({ order_id: "BK-C", due_date: "2026-10-01", step: "da_giao", quantity: 900 }), // closed, old
  job({ order_id: null, step: "cho_san_xuat", lead_code: "L-P", due_date: null }), // pending
  job({ order_id: "BK-D", due_date: "2026-11-20", quantity: 5000, step: "cho_san_xuat", order_name: "Băng keo Trà Sữa", lead_id: null, lead_code: null }),
].map((j) => toListRow(j, NOW));

const adminSpec = jobListSpec([W1]);
const workshopSpec = jobListSpec(null);

describe("toListRow", () => {
  it("derives code, stage, due state, phase, assignee", () => {
    expect(rows[0]).toMatchObject({ code: "BK-A", name: "Băng keo in “Cà phê Đà Lạt”", stage: "dang_san_xuat", due_state: "overdue", phase: "open", assignee: "none" });
    expect(rows[4]).toMatchObject({ code: "BK-D", name: "Băng keo Trà Sữa", stage: "cho_san_xuat" });
    expect(rows[2]).toMatchObject({ due_state: "ok", phase: "closed" });
    expect(rows[3]).toMatchObject({ code: "L-P", stage: "pending", due_state: "none" });
    expect(rows[1]!.assignee).toBe(W1);
  });
});

describe("queryJobs", () => {
  it("default: due date ascending, open jobs above closed, empty dates last", () => {
    const state = parseListParams(workshopSpec, {});
    expect(queryJobs(rows, workshopSpec, state, false).rows.map((r) => r.code)).toEqual(["BK-A", "BK-B", "BK-D", "L-P", "BK-C"]);
  });

  it("sorts by quantity desc and by step", () => {
    const qty = parseListParams(workshopSpec, { sort: "qty" });
    expect(queryJobs(rows, workshopSpec, qty, false).rows[0]!.code).toBe("BK-D");
    const step = parseListParams(workshopSpec, { sort: "step" });
    expect(queryJobs(rows, workshopSpec, step, false).rows[0]!.code).toBe("L-P");
  });

  it("filters step (multi), overdue, phase; search ignores accents", () => {
    const f = (raw: Record<string, string>) => queryJobs(rows, workshopSpec, parseListParams(workshopSpec, raw), false).rows.map((r) => r.code);
    expect(f({ step: "pending,san_sang_giao" })).toEqual(["BK-B", "L-P"]);
    expect(f({ due: "overdue" })).toEqual(["BK-A"]);
    expect(f({ phase: "closed" })).toEqual(["BK-C"]);
    expect(f({ q: "da lat" })).toEqual(["BK-A"]);
    expect(f({ q: "tra sua" })).toEqual(["BK-D"]);
    expect(f({ step: "cho_san_xuat" })).toEqual(["BK-D"]);
    expect(f({ from: "2026-11-02", to: "2026-11-30" })).toEqual(["BK-B", "BK-D"]);
  });

  it("assignee filter only exists for admin and only accepts known ids", () => {
    expect(parseListParams(workshopSpec, { assignee: W1 }).filters.assignee).toBeUndefined();
    expect(parseListParams(adminSpec, { assignee: "evil" }).filters.assignee).toBeUndefined();
    const s = parseListParams(adminSpec, { assignee: W1 });
    expect(queryJobs(rows, adminSpec, s, false).rows.map((r) => r.code)).toEqual(["BK-B"]);
  });

  it("view is UI-only: it never filters rows", () => {
    const s = parseListParams(workshopSpec, { view: "table" });
    expect(queryJobs(rows, workshopSpec, s, false).total).toBe(rows.length);
    expect(isFiltered(s)).toBe(false);
  });

  it("paginates the table after the open/closed ordering", () => {
    const s = parseListParams(workshopSpec, { size: "25" });
    const r = queryJobs(rows, workshopSpec, { ...s, pageSize: 2, page: 3 }, true);
    expect(r).toMatchObject({ total: 5 });
    expect(r.rows.map((x) => x.code)).toEqual(["BK-C"]);
  });

  it("clamps an out-of-range page to the last page (QC UI-2)", () => {
    const s = parseListParams(workshopSpec, { page: "5" });
    const r = queryJobs(rows, workshopSpec, s, true);
    expect(r.total).toBe(5);
    expect(r.rows.map((x) => x.code)).toEqual(["BK-A", "BK-B", "BK-D", "L-P", "BK-C"]);
    const small = queryJobs(rows, workshopSpec, { ...s, pageSize: 2, page: 99 }, true);
    expect(small.rows.map((x) => x.code)).toEqual(["BK-C"]);
  });
});

describe("view + counts", () => {
  it("defaults: board for workshop, table for admin; default view stays out of the URL", () => {
    const s = parseListParams(workshopSpec, {});
    expect(viewOf(s, "workshop")).toBe("board");
    expect(viewOf(s, "admin")).toBe("table");
    expect(listHref("/portal/xuong", workshopSpec, withView(s, "board", "workshop"))).toBe("/portal/xuong");
    expect(listHref("/portal/xuong", workshopSpec, withView(s, "table", "workshop"))).toBe("/portal/xuong?view=table");
  });

  it("counts overdue / today / waiting / active / ready / pending", () => {
    expect(countJobs(rows)).toEqual({ overdue: 1, today: 1, waiting: 1, active: 1, ready: 1, pending: 1 });
  });
});
