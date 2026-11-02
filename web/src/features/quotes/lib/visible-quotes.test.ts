// Regression (UI-7): staff/CTV do not see draft quotes (often 0 đ) on the lead page.
import { describe, expect, it } from "vitest";
import type { QuoteStatus } from "@/lib/types";
import { visibleQuotes } from "./rules";

const q = (version: number, status: QuoteStatus) => ({ version, status });

describe("visibleQuotes", () => {
  const all = [q(3, "draft"), q(2, "sent"), q(1, "changes_requested")];

  it("hides drafts from viewers who cannot price", () => {
    expect(visibleQuotes(all, false).map((x) => x.version)).toEqual([2, 1]);
    expect(visibleQuotes([q(1, "draft")], false)).toEqual([]);
  });

  it("keeps every version for admin/manager", () => {
    expect(visibleQuotes(all, true)).toEqual(all);
  });
});
