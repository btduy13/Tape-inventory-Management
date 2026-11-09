// Tab + permission helpers (safe for client + server). Mirrors SQL in migration 0030:
// profiles.nav_tabs (null = role default), profiles.permissions, public.has_perm().
// Display + page gates only: the order / customer RPCs re-check has_perm() in SQL.
import type { AppRole, Profile } from "@/lib/types";
import { ROUTES } from "@/lib/routes";
import { ROLE_GROUPS } from "./roles";

export const NAV_TABS = ["overview", "leads", "orders", "quotes", "customers", "workshop", "users", "settings"] as const;
export type NavTab = (typeof NAV_TABS)[number];

export const PERMS = [
  "orders.view", "orders.money", "orders.create", "orders.edit", "orders.status", "orders.delete", "orders.export", "customers.edit",
] as const;
export type Perm = (typeof PERMS)[number];

export type AccessProfile = Pick<Profile, "role" | "is_active" | "nav_tabs" | "permissions">;

/** Tabs a role sees while profiles.nav_tabs is null (same as the menu before 0030). */
export const DEFAULT_TABS: Readonly<Record<AppRole, readonly NavTab[]>> = {
  admin: NAV_TABS,
  manager: ["leads"],
  staff: ["leads"],
  ctv: ["leads"],
  workshop: ["workshop"],
};

/** Roles whose pages accept the tab at all (the page's own requireRole). */
const TAB_ROLES: Readonly<Record<NavTab, readonly AppRole[]>> = {
  overview: ROLE_GROUPS.admin,
  users: ROLE_GROUPS.admin,
  settings: ROLE_GROUPS.admin,
  leads: ROLE_GROUPS.internal,
  workshop: ROLE_GROUPS.production,
  orders: ROLE_GROUPS.portal,
  quotes: ROLE_GROUPS.portal,
  customers: ROLE_GROUPS.portal,
};

/** Order data tabs also need orders.view (the RPCs behind them do). */
const TAB_PERM: Partial<Record<NavTab, Perm>> = { orders: "orders.view", quotes: "orders.view", customers: "orders.view" };

/** Landing page of each tab, in menu order (homePathFor picks the first one the user may see). */
const TAB_HOME: readonly (readonly [NavTab, string])[] = [
  ["overview", ROUTES.admin], ["leads", ROUTES.portal], ["workshop", ROUTES.workshop], ["orders", ROUTES.adminOrders],
  ["quotes", ROUTES.adminQuotes], ["customers", ROUTES.adminCustomers], ["users", ROUTES.adminUsers], ["settings", ROUTES.adminTapeSpecs],
];

/** First page the user may open; /portal when no tab is left (it then shows "no tab" instead of redirecting). */
export function homePathFor(profile: AccessProfile): string {
  return TAB_HOME.find(([tab]) => canSeeTab(profile, tab))?.[1] ?? ROUTES.portal;
}

/** Same rule as SQL has_perm(): active admin always, others when the code is ticked. */
export function hasPerm(profile: AccessProfile | null, perm: Perm): boolean {
  if (!profile?.is_active) return false;
  return profile.role === "admin" || (profile.permissions ?? []).includes(perm);
}

/** Effective tab list: ticked tabs, or the role default when nothing was saved. */
export function tabsOf(profile: Pick<Profile, "role" | "nav_tabs">): readonly string[] {
  return profile.nav_tabs ?? DEFAULT_TABS[profile.role];
}

/** True when the menu shows the tab and its pages let the user in. */
export function canSeeTab(profile: AccessProfile | null, tab: NavTab): boolean {
  if (!profile?.is_active) return false;
  if (profile.role === "admin") return true;
  if (!TAB_ROLES[tab].includes(profile.role) || !tabsOf(profile).includes(tab)) return false;
  const perm = TAB_PERM[tab];
  return !perm || hasPerm(profile, perm);
}
