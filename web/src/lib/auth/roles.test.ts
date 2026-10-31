import { describe, expect, it } from "vitest";
import { canAssign, canManagePrices, hasRole, seesAllLeads } from "./roles";

const p = (role: "admin" | "manager" | "staff" | "ctv", is_active = true) => ({ role, is_active });

describe("role helpers", () => {
  it("matches the role matrix", () => {
    expect(canAssign(p("admin"))).toBe(true);
    expect(canAssign(p("manager"))).toBe(false);
    expect(canManagePrices(p("manager"))).toBe(true);
    expect(canManagePrices(p("staff"))).toBe(false);
    expect(seesAllLeads(p("ctv"))).toBe(false);
  });

  it("inactive users have no roles", () => {
    expect(hasRole(p("admin", false), ["admin"])).toBe(false);
    expect(hasRole(null, ["admin"])).toBe(false);
  });
});
