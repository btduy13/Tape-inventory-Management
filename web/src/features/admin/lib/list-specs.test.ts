import { describe, expect, it } from "vitest";
import { applyListInMemory } from "@/features/portal-ui/lib/apply-memory";
import { parseListParams } from "@/features/portal-ui/lib/list-params";
import type { AppRole } from "@/lib/types";
import { canReorder, PRESETS_SPEC, USERS_SPEC, WIDTHS_SPEC, withRoleRank } from "./list-specs";
import { PERMISSION_MATRIX } from "./permissions";

const users = withRoleRank([
  { id: "1", full_name: "Trần Bình", email: "b@x.vn", phone: null, role: "staff" as AppRole, is_active: true, created_at: "2026-01-02T00:00:00Z" },
  { id: "2", full_name: "Nguyễn An", email: "a@x.vn", phone: "0901", role: "admin" as AppRole, is_active: true, created_at: "2026-01-01T00:00:00Z" },
  { id: "3", full_name: "Lê Châu", email: "c@x.vn", phone: null, role: "workshop" as AppRole, is_active: false, created_at: "2026-01-03T00:00:00Z" },
]);

describe("users list", () => {
  it("defaults to role order (admin first), not alphabetical", () => {
    const { rows } = applyListInMemory(users, USERS_SPEC, parseListParams(USERS_SPEC, {}));
    expect(rows.map((r) => r.id)).toEqual(["2", "1", "3"]);
  });

  it("filters by role and active flag, searches without accents", () => {
    const byRole = applyListInMemory(users, USERS_SPEC, parseListParams(USERS_SPEC, { role: "staff" }));
    expect(byRole.rows.map((r) => r.id)).toEqual(["1"]);
    const locked = applyListInMemory(users, USERS_SPEC, parseListParams(USERS_SPEC, { active: "0" }));
    expect(locked.rows.map((r) => r.id)).toEqual(["3"]);
    const search = applyListInMemory(users, USERS_SPEC, parseListParams(USERS_SPEC, { q: "nguyen" }));
    expect(search.rows.map((r) => r.id)).toEqual(["2"]);
  });

  it("drops unknown roles and sort keys from the URL", () => {
    const s = parseListParams(USERS_SPEC, { role: "root", sort: "password" });
    expect(s.filters).toEqual({});
    expect(s.sort).toBe("role");
  });

  it("sorts newest first when created is picked", () => {
    const { rows } = applyListInMemory(users, USERS_SPEC, parseListParams(USERS_SPEC, { sort: "created" }));
    expect(rows.map((r) => r.id)).toEqual(["3", "1", "2"]);
  });
});

describe("widths / presets lists", () => {
  const widths = [
    { id: "a", width_mm: 72, sort_order: 20, is_active: true },
    { id: "b", width_mm: 48, sort_order: 10, is_active: false },
  ];

  it("keeps display order by default and sorts by width on request", () => {
    expect(applyListInMemory(widths, WIDTHS_SPEC, parseListParams(WIDTHS_SPEC, {})).rows.map((r) => r.id)).toEqual(["b", "a"]);
    const byWidth = parseListParams(WIDTHS_SPEC, { sort: "width", dir: "desc" });
    expect(applyListInMemory(widths, WIDTHS_SPEC, byWidth).rows.map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("allows reordering only on the unfiltered display order", () => {
    expect(canReorder(WIDTHS_SPEC, parseListParams(WIDTHS_SPEC, {}))).toBe(true);
    expect(canReorder(WIDTHS_SPEC, parseListParams(WIDTHS_SPEC, { active: "1" }))).toBe(false);
    expect(canReorder(WIDTHS_SPEC, parseListParams(WIDTHS_SPEC, { sort: "width" }))).toBe(false);
    expect(canReorder(WIDTHS_SPEC, parseListParams(WIDTHS_SPEC, { q: "48" }))).toBe(false);
  });

  it("finds presets by label and hides inactive ones on filter", () => {
    const presets = [
      { id: "p1", label: "Băng keo 48mm", width_mm: 48, length_m: 100, sort_order: 0, is_active: true, updated_at: "2026-01-01" },
      { id: "p2", label: "Khổ lớn", width_mm: 72, length_m: 200, sort_order: 1, is_active: false, updated_at: "2026-01-02" },
    ];
    expect(applyListInMemory(presets, PRESETS_SPEC, parseListParams(PRESETS_SPEC, { q: "bang keo" })).rows.map((r) => r.id)).toEqual(["p1"]);
    expect(applyListInMemory(presets, PRESETS_SPEC, parseListParams(PRESETS_SPEC, { active: "1" })).rows.map((r) => r.id)).toEqual(["p1"]);
  });
});

describe("permission matrix", () => {
  const cell = (cap: string, role: AppRole) => PERMISSION_MATRIX.find((r) => r.capability === cap)!.access[role];

  it("never shows pricing for staff, ctv or workshop", () => {
    for (const r of ["staff", "ctv", "workshop"] as const) expect(cell("price", r)).toBe("none");
    expect(cell("price", "manager")).toBe("all");
  });

  it("keeps workshop away from customers and limits field roles to their own leads", () => {
    expect(cell("viewContact", "workshop")).toBe("none");
    expect(cell("viewLeads", "workshop")).toBe("none");
    expect(cell("viewLeads", "staff")).toBe("own");
    expect(cell("viewLeads", "ctv")).toBe("own");
    expect(cell("steps", "workshop")).toBe("own");
  });

  it("gives settings and assignment to admin only", () => {
    for (const cap of ["settings", "assign"]) {
      expect(cell(cap, "admin")).toBe("all");
      for (const r of ["manager", "staff", "ctv", "workshop"] as const) expect(cell(cap, r)).toBe("none");
    }
  });
});
