import { describe, expect, it } from "vitest";
import { format, formatVnd, getDictionary } from "./index";
import { DESIGN_PATTERNS, LEAD_STATUSES, PRODUCTION_STEPS, ROLES } from "@/lib/types";

describe("i18n", () => {
  const t = getDictionary();

  it("has a label for every lead status and role", () => {
    for (const s of LEAD_STATUSES) expect(t.leadStatus[s]).toBeTruthy();
    for (const r of ROLES) expect(t.roles[r]).toBeTruthy();
    for (const s of PRODUCTION_STEPS) expect(t.productionStep[s]).toBeTruthy();
    for (const p of DESIGN_PATTERNS) {
      expect(t.designPattern[p]).toBeTruthy();
      expect(t.designer.patternHelp[p]).toBeTruthy();
    }
  });

  it("interpolates placeholders and keeps unknown ones", () => {
    expect(format("Mã {code} {x}", { code: "L1" })).toBe("Mã L1 {x}");
  });

  it("formats VND without decimals", () => {
    expect(formatVnd(1234567)).toMatch(/1\.234\.567/);
  });
});
