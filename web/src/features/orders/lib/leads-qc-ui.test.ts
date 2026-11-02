// Regressions: UI-6 (no-match empty state) and UI-8 (production hand-off only once accepted).
import { describe, expect, it } from "vitest";
import { leadListEmpty } from "./lead-list";
import { showsHandoff } from "./next-step";

describe("leadListEmpty", () => {
  it("no-match state offers clearing filters, not the never-had-data hint", () => {
    expect(leadListEmpty(true, false)).toEqual({ body: "emptyFilteredBody", clear: true });
    expect(leadListEmpty(true, true)).toEqual({ body: "emptyFilteredBody", clear: true });
  });

  it("unfiltered empty list keeps the per-viewer copy", () => {
    expect(leadListEmpty(false, false)).toEqual({ title: "emptyAll", body: "emptyAllBody", clear: false });
    expect(leadListEmpty(false, true)).toEqual({ title: "emptyMine", body: "emptyMineBody", clear: false });
  });
});

describe("showsHandoff", () => {
  it("collapses before a quote is accepted", () => {
    for (const s of ["new", "assigned", "consulting", "quoted", "cancelled"] as const) expect(showsHandoff(s, null)).toBe(false);
  });

  it("shows from accepted on, or whenever a production order exists", () => {
    for (const s of ["accepted", "production", "shipping", "done"] as const) expect(showsHandoff(s, null)).toBe(true);
    expect(showsHandoff("cancelled", "PO-1")).toBe(true);
  });
});
