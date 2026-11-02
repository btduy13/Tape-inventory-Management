// Display-only permission matrix for /admin/users (helps the owner understand roles).
// Built from ROLE_GROUPS so it cannot drift from the code checks. Real enforcement stays in
// requireRole / assertRole, server actions and RLS; this file grants nothing.
import { ROLE_GROUPS } from "@/lib/auth/roles";
import { ROLES, type AppRole } from "@/lib/types";

export type Access = "all" | "own" | "none";

export type Capability =
  | "viewLeads" | "viewContact" | "changeStatus" | "assign" | "price" | "toProduction" | "steps" | "settings";

export type PermissionRow = { capability: Capability; access: Readonly<Record<AppRole, Access>> };

function row(capability: Capability, all: readonly AppRole[], own: readonly AppRole[] = []): PermissionRow {
  const access = Object.fromEntries(
    ROLES.map((r) => [r, all.includes(r) ? "all" : own.includes(r) ? "own" : "none"]),
  ) as Record<AppRole, Access>;
  return { capability, access };
}

/** pricing = sees every lead; field (staff, ctv) = only leads assigned to them (RLS). */
export const PERMISSION_MATRIX: readonly PermissionRow[] = [
  row("viewLeads", ROLE_GROUPS.pricing, ROLE_GROUPS.field),
  row("viewContact", ROLE_GROUPS.pricing, ROLE_GROUPS.field),
  row("changeStatus", ROLE_GROUPS.pricing, ROLE_GROUPS.field),
  row("assign", ROLE_GROUPS.admin),
  row("price", ROLE_GROUPS.pricing),
  row("toProduction", ROLE_GROUPS.admin, ROLE_GROUPS.workshop),
  row("steps", ROLE_GROUPS.admin, ROLE_GROUPS.workshop),
  row("settings", ROLE_GROUPS.admin),
];

export const ROLE_SUMMARY_KEY = {
  admin: "roleSummaryAdmin",
  manager: "roleSummaryManager",
  staff: "roleSummaryStaff",
  ctv: "roleSummaryCtv",
  workshop: "roleSummaryWorkshop",
} as const satisfies Record<AppRole, string>;

export const CAPABILITY_KEY = {
  viewLeads: "capViewLeads",
  viewContact: "capViewContact",
  changeStatus: "capChangeStatus",
  assign: "capAssign",
  price: "capPrice",
  toProduction: "capToProduction",
  steps: "capSteps",
  settings: "capSettings",
} as const satisfies Record<Capability, string>;
