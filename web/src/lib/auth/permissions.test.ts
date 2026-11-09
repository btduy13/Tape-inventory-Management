import { describe, expect, it } from "vitest";
import { navFor } from "@/features/portal-ui/lib/nav";
import type { AppRole } from "@/lib/types";
import { canSeeTab, hasPerm, NAV_TABS, type AccessProfile } from "./permissions";

const p = (role: AppRole, extra: Partial<AccessProfile> = {}): AccessProfile => ({
  role, is_active: true, nav_tabs: null, permissions: [], ...extra,
});
const hrefs = (profile: AccessProfile) => navFor(profile).flatMap((g) => g.items.map((i) => i.href));

describe("hasPerm (mirrors SQL has_perm)", () => {
  it("admin always, others only when ticked, inactive never", () => {
    expect(hasPerm(p("admin"), "orders.delete")).toBe(true);
    expect(hasPerm(p("staff"), "orders.view")).toBe(false);
    expect(hasPerm(p("staff", { permissions: ["orders.view"] }), "orders.view")).toBe(true);
    expect(hasPerm(p("staff", { permissions: ["orders.view"] }), "orders.money")).toBe(false);
    expect(hasPerm(p("admin", { is_active: false }), "orders.view")).toBe(false);
    expect(hasPerm(null, "orders.view")).toBe(false);
  });
});

describe("canSeeTab", () => {
  it("admin sees every tab whatever nav_tabs says", () => {
    for (const tab of NAV_TABS) expect(canSeeTab(p("admin", { nav_tabs: [] }), tab)).toBe(true);
  });

  it("null nav_tabs falls back to the role default", () => {
    expect(canSeeTab(p("staff"), "leads")).toBe(true);
    expect(canSeeTab(p("workshop"), "workshop")).toBe(true);
    expect(canSeeTab(p("workshop"), "leads")).toBe(false);
  });

  it("order tabs need the tab and orders.view", () => {
    expect(canSeeTab(p("staff", { nav_tabs: ["orders"] }), "orders")).toBe(false);
    expect(canSeeTab(p("staff", { permissions: ["orders.view"] }), "orders")).toBe(false);
    const seller = p("staff", { nav_tabs: ["leads", "orders", "customers"], permissions: ["orders.view"] });
    expect(canSeeTab(seller, "orders")).toBe(true);
    expect(canSeeTab(seller, "customers")).toBe(true);
    expect(canSeeTab(seller, "quotes")).toBe(false);
  });

  it("never opens admin-only or role-gated pages to other roles", () => {
    const all = p("manager", { nav_tabs: [...NAV_TABS], permissions: ["orders.view"] });
    expect(canSeeTab(all, "users")).toBe(false);
    expect(canSeeTab(all, "settings")).toBe(false);
    expect(canSeeTab(all, "overview")).toBe(false);
    expect(canSeeTab(all, "workshop")).toBe(false);
    expect(canSeeTab(p("workshop", { nav_tabs: ["leads"] }), "leads")).toBe(false);
  });
});

describe("navFor filters by tabs", () => {
  it("admin gets everything including Báo giá", () => {
    const admin = hrefs(p("admin"));
    for (const h of ["/admin", "/portal", "/portal/xuong", "/admin/don-hang", "/admin/bao-gia", "/admin/khach-hang", "/admin/users"]) {
      expect(admin).toContain(h);
    }
  });

  it("staff with orders tab + view sees leads and orders only", () => {
    const seller = p("staff", { nav_tabs: ["leads", "orders"], permissions: ["orders.view"] });
    expect(hrefs(seller)).toEqual(["/portal", "/admin/don-hang"]);
    expect(navFor(seller).map((g) => g.labelKey)).toEqual(["navWork"]);
    expect(navFor(seller)[0]!.items[0]!.labelKey).toBe("navMyLeads");
  });

  it("workshop user keeps 'Việc của xưởng' and can be given orders", () => {
    const shop = p("workshop", { nav_tabs: ["workshop", "orders"], permissions: ["orders.view"] });
    expect(hrefs(shop)).toEqual(["/portal/xuong", "/admin/don-hang"]);
    expect(navFor(shop)[0]!.items[0]!.labelKey).toBe("navMyJobs");
  });
});
