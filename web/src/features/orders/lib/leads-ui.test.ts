import { describe, expect, it } from "vitest";
import { applyListInMemory, parseListParams } from "@/features/portal-ui";
import { MAX_COLORS } from "@/features/designer/lib/constants";
import type { Design } from "@/lib/types";
import { OPEN_STATUSES, UNASSIGNED, filteredHref, leadListSpec, statusRank, toLeadRow, type RawLeadRow } from "./lead-list";
import { PANEL, orderStatusOptions, primaryActionFor, recommendedNext } from "./next-step";
import { INK_LIMIT, inkSummary } from "./design-info";

const A = "6f1c1f0e-8a7b-4c2d-9e3f-1a2b3c4d5e6f";
const B = "7f1c1f0e-8a7b-4c2d-9e3f-1a2b3c4d5e6f";

function raw(over: Partial<RawLeadRow> = {}): RawLeadRow {
  return {
    id: "l1",
    code: "VT-0001",
    customer_name: "Nguyễn Văn An",
    phone: "0901234567",
    company: null,
    quantity: 100,
    status: "new",
    assigned_to: null,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-02T00:00:00Z",
    designs: [],
    quotes: [],
    ...over,
  };
}

describe("lead list spec", () => {
  it("whitelists assignee ids and drops junk params", () => {
    const spec = leadListSpec([A]);
    const s = parseListParams(spec, { assignee: B, status: "new,bogus", sort: "evil", source: "preset" });
    expect(s.filters.assignee ?? []).toEqual([]);
    expect(s.filters.status).toEqual(["new"]);
    expect(s.filters.source).toEqual(["preset"]);
    expect(s.sort).toBe("updated");
    expect(parseListParams(spec, { assignee: A }).filters.assignee).toEqual([A]);
    expect(parseListParams(spec, { assignee: UNASSIGNED }).filters.assignee).toEqual([UNASSIGNED]);
  });

  it("staff spec (no assignee ids) only accepts the unassigned key", () => {
    expect(parseListParams(leadListSpec(), { assignee: A }).filters.assignee ?? []).toEqual([]);
  });
});

describe("toLeadRow", () => {
  it("derives assignee, source, latest quote total and status rank", () => {
    const r = toLeadRow(
      raw({ assigned_to: A, status: "quoted", designs: [{ preset_id: "p1" }], quotes: [{ total: 100, version: 1 }, { total: 250, version: 2 }] }),
      { [A]: "Chị Lan" },
    );
    expect(r).toMatchObject({ assigneeName: "Chị Lan", assigneeKey: A, source: "preset", quoteTotal: 250, statusRank: 3 });
    expect(r).not.toHaveProperty("designs");
    expect(r).not.toHaveProperty("quotes");
  });

  it("handles no assignee, custom design, no design, no quote", () => {
    expect(toLeadRow(raw({ designs: [{ preset_id: null }] }), {})).toMatchObject({ assigneeName: null, assigneeKey: UNASSIGNED, source: "custom", quoteTotal: null });
    expect(toLeadRow(raw({ designs: null, quotes: null }), {}).source).toBeNull();
  });

  it("ranks cancelled after done", () => {
    expect(statusRank("cancelled")).toBeGreaterThan(statusRank("done"));
    expect(OPEN_STATUSES).not.toContain("done");
    expect(OPEN_STATUSES).not.toContain("cancelled");
  });
});

describe("in-memory list over lead rows", () => {
  const rows = [
    toLeadRow(raw({ id: "1", code: "VT-1", assigned_to: A, quotes: [{ total: 500, version: 1 }], designs: [{ preset_id: null }] }), { [A]: "Bình" }),
    toLeadRow(raw({ id: "2", code: "VT-2", assigned_to: B, customer_name: "Trần Thị Hoa", quotes: [{ total: 900, version: 1 }], designs: [{ preset_id: "p" }] }), { [B]: "An" }),
    toLeadRow(raw({ id: "3", code: "VT-3", phone: "0988000111" }), {}),
  ];
  const spec = leadListSpec([A, B]);

  it("sorts by assignee name and by quote value", () => {
    expect(applyListInMemory(rows, spec, parseListParams(spec, { sort: "assignee", dir: "asc" })).rows.slice(0, 2).map((r) => r.id)).toEqual(["2", "1"]);
    expect(applyListInMemory(rows, spec, parseListParams(spec, { sort: "value", dir: "desc" })).rows[0]?.id).toBe("2");
  });

  it("searches code, customer (accent-insensitive) and phone; filters source", () => {
    const ids = (p: Record<string, string>) => applyListInMemory(rows, spec, parseListParams(spec, p)).rows.map((r) => r.id);
    expect(ids({ q: "tran thi" })).toEqual(["2"]);
    expect(ids({ q: "0988" })).toEqual(["3"]);
    expect(ids({ q: "VT-1" })).toEqual(["1"]);
    expect(ids({ source: "custom" })).toEqual(["1"]);
  });
});

describe("filteredHref", () => {
  it("builds a filtered link to the table anchor", () => {
    expect(filteredHref("/admin", { status: ["new"], assignee: UNASSIGNED })).toBe("/admin?status=new&assignee=none#danh-sach");
    expect(filteredHref("/admin", {}, "")).toBe("/admin");
  });

  it("round-trips through the spec parser", () => {
    const href = filteredHref("/admin", { status: ["production", "shipping"] }, "");
    const params = Object.fromEntries(new URL(href, "http://x").searchParams);
    expect(parseListParams(leadListSpec(), params).filters.status).toEqual(["production", "shipping"]);
  });
});

describe("next step", () => {
  it("points each role at its own next action", () => {
    expect(primaryActionFor("new", "admin")?.anchor).toBe(PANEL.assign);
    expect(primaryActionFor("new", "staff")).toBeNull();
    expect(primaryActionFor("assigned", "staff")?.anchor).toBe(PANEL.status);
    expect(primaryActionFor("assigned", "ctv")?.label).toBe("goStatus");
    expect(primaryActionFor("consulting", "manager")?.anchor).toBe(PANEL.quotes);
    // Staff cannot price: no quote button for them.
    expect(primaryActionFor("consulting", "staff")).toBeNull();
    expect(primaryActionFor("accepted", "admin")?.anchor).toBe(PANEL.production);
    expect(primaryActionFor("accepted", "staff")).toBeNull();
    expect(primaryActionFor("shipping", "staff")?.label).toBe("goDone");
    expect(primaryActionFor("done", "admin")).toBeNull();
  });

  it("suggests the main-road next status only when allowed", () => {
    expect(recommendedNext("assigned", ["consulting", "cancelled"])).toBe("consulting");
    expect(recommendedNext("consulting", ["cancelled"])).toBeNull();
    expect(recommendedNext("cancelled", ["new"])).toBeNull();
  });

  it("orders forward statuses first and cancel last", () => {
    expect(orderStatusOptions(["cancelled", "done", "consulting"])).toEqual(["consulting", "done", "cancelled"]);
  });
});

describe("inkSummary", () => {
  const base = { colors: ["#FF0000", "#ff0000", "#00ff00"], design_json: {} as Design["design_json"], logo_path: null };

  it("keeps the portal ink limit in step with the designer", () => {
    expect(INK_LIMIT).toBe(MAX_COLORS);
  });

  it("falls back to distinct colours when the designer did not count inks", () => {
    expect(inkSummary(base)).toMatchObject({ count: 2, over: false, inks: ["#ff0000", "#00ff00"], tape: null, hasLogo: false });
  });

  it("uses the designer's count, over-limit flag, tape colour and logo", () => {
    const s = inkSummary({
      ...base,
      logo_path: "x.png",
      design_json: { inkColors: ["#111111", "bad"], inkCount: 4, inkOverLimit: true, backgroundColor: "#fefefe" } as Design["design_json"],
    });
    expect(s).toMatchObject({ count: 4, over: true, inks: ["#111111"], tape: "#fefefe", hasLogo: true });
  });

  it("flags over-limit from the count when no flag is stored", () => {
    expect(inkSummary({ ...base, colors: ["#000001", "#000002", "#000003", "#000004"] }).over).toBe(true);
  });
});
