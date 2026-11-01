import { describe, expect, it } from "vitest";
import { canAssign, canManagePrices, canUseWorkshop, hasRole, isWorkshop, ROLE_GROUPS, seesAllLeads } from "./roles";

const p = (role: "admin" | "manager" | "staff" | "ctv" | "workshop", is_active = true) => ({ role, is_active });

describe("role helpers", () => {
  it("matches the role matrix", () => {
    expect(canAssign(p("admin"))).toBe(true);
    expect(canAssign(p("manager"))).toBe(false);
    expect(canManagePrices(p("manager"))).toBe(true);
    expect(canManagePrices(p("staff"))).toBe(false);
    expect(seesAllLeads(p("ctv"))).toBe(false);
  });

  it("workshop users get the production dashboard only", () => {
    expect(isWorkshop(p("workshop"))).toBe(true);
    expect(canUseWorkshop(p("workshop"))).toBe(true);
    expect(canUseWorkshop(p("admin"))).toBe(true);
    for (const r of ["manager", "staff", "ctv"] as const) expect(canUseWorkshop(p(r))).toBe(false);
    expect(hasRole(p("workshop"), ROLE_GROUPS.internal)).toBe(false);
    expect(hasRole(p("workshop"), ROLE_GROUPS.portal)).toBe(true);
    expect(seesAllLeads(p("workshop"))).toBe(false);
    expect(canManagePrices(p("workshop"))).toBe(false);
    expect(canUseWorkshop(p("workshop", false))).toBe(false);
  });

  it("inactive users have no roles", () => {
    expect(hasRole(p("admin", false), ["admin"])).toBe(false);
    expect(hasRole(null, ["admin"])).toBe(false);
  });
});
