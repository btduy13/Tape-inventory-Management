import { describe, expect, it } from "vitest";
import { getDictionary } from "@/i18n";
import { LEAD_STATUSES, PRODUCTION_STEPS, ROLES } from "@/lib/types";
import { homeFor, isNavActive, navFor } from "./nav";
import { LEAD_TONE, STEP_TONE } from "./status-tones";
import { LEAD_PIPELINE, nextActionFor, pipelineIndex, stageStates, stepIndex } from "./workflow";

const t = getDictionary().portalUi;

describe("workflow", () => {
  it("pipeline covers every status except cancelled, in order", () => {
    expect(LEAD_PIPELINE.map((s) => s.status)).toEqual(LEAD_STATUSES.filter((s) => s !== "cancelled"));
    expect(pipelineIndex("cancelled")).toBe(-1);
    expect(stepIndex("huy")).toBe(-1);
  });

  it("every action key has copy", () => {
    for (const s of LEAD_PIPELINE) if (s.actionKey) expect(t[s.actionKey]).toBeTruthy();
  });

  it("names the right owner per role", () => {
    expect(nextActionFor("new", "admin")).toMatchObject({ actor: "admin", mine: true });
    expect(nextActionFor("new", "staff")?.mine).toBe(false);
    expect(nextActionFor("assigned", "ctv")?.mine).toBe(true);
    expect(nextActionFor("consulting", "manager")?.mine).toBe(true);
    expect(nextActionFor("consulting", "staff")?.mine).toBe(false); // staff cannot price
    expect(nextActionFor("quoted", "admin")).toMatchObject({ actor: "customer", mine: false });
    expect(nextActionFor("production", "workshop")?.mine).toBe(true);
    expect(nextActionFor("done", "admin")).toBeNull();
    expect(nextActionFor("cancelled", "admin")).toBeNull();
  });

  it("stageStates marks done / current / todo", () => {
    expect(stageStates(4, 2)).toEqual(["done", "done", "current", "todo"]);
    expect(stageStates(3, 2, true)).toEqual(["done", "done", "done"]);
    expect(stageStates(3, -1)).toEqual(["todo", "todo", "todo"]);
  });

  it("every status and step has a tone", () => {
    for (const s of LEAD_STATUSES) expect(LEAD_TONE[s]).toBeTruthy();
    for (const s of PRODUCTION_STEPS) expect(STEP_TONE[s]).toBeTruthy();
  });
});

describe("nav", () => {
  it("gives every role at least one item with copy", () => {
    for (const r of ROLES) {
      const items = navFor(r).flatMap((g) => g.items);
      expect(items.length).toBeGreaterThan(0);
      for (const i of items) expect(t[i.labelKey]).toBeTruthy();
    }
  });

  it("shows settings to admin only and the workshop only to admin / workshop", () => {
    const hrefs = (r: (typeof ROLES)[number]) => navFor(r).flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs("admin")).toContain("/admin/users");
    const admin = hrefs("admin");
    expect(admin.indexOf("/admin/khach-hang")).toBe(admin.indexOf("/admin/don-hang") + 1);
    for (const r of ["manager", "staff", "ctv", "workshop"] as const) expect(hrefs(r).some((h) => h.startsWith("/admin"))).toBe(false);
    expect(hrefs("staff")).not.toContain("/portal/xuong");
    expect(hrefs("workshop")).toEqual(["/portal/xuong"]);
  });

  it("matches the active item", () => {
    const [work] = navFor("admin");
    const leads = work!.items.find((i) => i.labelKey === "navLeads")!;
    const shop = work!.items.find((i) => i.labelKey === "navWorkshop")!;
    expect(isNavActive("/portal", leads)).toBe(true);
    expect(isNavActive("/admin/leads/x", leads)).toBe(true);
    expect(isNavActive("/portal/xuong", leads)).toBe(false);
    expect(isNavActive("/portal/xuong/abc", shop)).toBe(true);
  });

  it("homeFor", () => {
    expect(homeFor("admin")).toBe("/admin");
    expect(homeFor("workshop")).toBe("/portal/xuong");
    expect(homeFor("ctv")).toBe("/portal");
  });
});
