import { describe, expect, it } from "vitest";
import { parseListParams } from "@/features/portal-ui/lib/list-params";
import { QUOTES_SPEC, quoteStatus, sizeSummary, splitByTab } from "./list";
import { normalizeItems } from "./stored";

const axis = { name: "T", circumference: null, quantity: 1, unitPrice: 1, total: 1, vat: 0, vatPercent: 0 };

describe("sizeSummary", () => {
  it("counts sizes and axes", () => {
    expect(sizeSummary([{ axes: [axis, axis] }, { axes: [axis, axis] }])).toBe("2 size · 4 trục");
    expect(sizeSummary([{ axes: [] }])).toBe("1 size");
    expect(sizeSummary([])).toBe("1 size");
  });

  it("reads an app single-size quote (no quote_items, one new axis in the columns)", () => {
    const items = normalizeItems({ quote_items: null, loai_truc: "moi", ten_truc: "Trục PL", so_luong: 10 }, "bang_keo_in");
    expect(sizeSummary(items)).toBe("1 size · 1 trục");
  });
});

describe("quote status + tabs", () => {
  const rows = [
    { quote: { id: "a", da_gui_email: true } },
    { quote: { id: "b", da_gui_email: false } },
    { quote: { id: "c" } }, // thank_you / old rows may lack the column
  ];

  it("derives the status from da_gui_email", () => {
    expect(rows.map((r) => quoteStatus(r.quote))).toEqual(["da_gui", "chua_gui", "chua_gui"]);
  });

  it("counts every tab and filters the current one", () => {
    const all = splitByTab(rows, parseListParams(QUOTES_SPEC, {}));
    expect(all.counts).toEqual({ all: 3, chua_gui: 2, da_gui: 1 });
    expect(all.tab).toBe("all");
    expect(all.shown).toHaveLength(3);
    const sent = splitByTab(rows, parseListParams(QUOTES_SPEC, { tab: "da_gui" }));
    expect(sent.tab).toBe("da_gui");
    expect(sent.shown.map((r) => r.quote.id)).toEqual(["a"]);
  });

  it("drops unknown tab / type / month values from the URL", () => {
    const s = parseListParams(QUOTES_SPEC, { tab: "x", type: "orders", month: "13" });
    expect(s.filters).toEqual({});
  });
});
