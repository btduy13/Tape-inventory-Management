// Tab-aware navigation (profiles.nav_tabs + permissions, 0030). Display only: every page still
// gates itself (requireRole / requireTab) and SQL decides data.
import { ROUTES } from "@/lib/routes";
import { canSeeTab, type AccessProfile, type NavTab } from "@/lib/auth/permissions";
import type { AppRole } from "@/lib/types";

export type IconName = "overview" | "customers" | "leads" | "workshop" | "users" | "ruler" | "layers" | "quotes";

export type NavItem = {
  href: string;
  /** Key in vi.portalUi. */
  labelKey:
    | "navOverview" | "navLeads" | "navMyLeads" | "navWorkshop" | "navMyJobs" | "navOrders" | "navQuotes" | "navCustomers"
    | "navUsers" | "navTapeSpecs" | "navPresets";
  icon: IconName;
  /** Active on the exact href or on any of these path prefixes. */
  prefixes?: readonly string[];
};

export type NavGroup = { labelKey: "navWork" | "navSettings"; items: NavItem[] };

type TabItem = NavItem & { tab: NavTab };

const WORK: readonly TabItem[] = [
  { tab: "overview", href: ROUTES.admin, labelKey: "navOverview", icon: "overview" },
  { tab: "leads", href: ROUTES.portal, labelKey: "navLeads", icon: "leads", prefixes: ["/portal/leads/", "/admin/leads/"] },
  { tab: "workshop", href: ROUTES.workshop, labelKey: "navWorkshop", icon: "workshop", prefixes: [`${ROUTES.workshop}/`] },
  { tab: "orders", href: ROUTES.adminOrders, labelKey: "navOrders", icon: "layers", prefixes: [`${ROUTES.adminOrders}/`] },
  { tab: "quotes", href: ROUTES.adminQuotes, labelKey: "navQuotes", icon: "quotes", prefixes: [`${ROUTES.adminQuotes}/`] },
  { tab: "customers", href: ROUTES.adminCustomers, labelKey: "navCustomers", icon: "customers", prefixes: [`${ROUTES.adminCustomers}/`] },
];

const SETTINGS: readonly TabItem[] = [
  { tab: "users", href: ROUTES.adminUsers, labelKey: "navUsers", icon: "users" },
  { tab: "settings", href: ROUTES.adminTapeSpecs, labelKey: "navTapeSpecs", icon: "ruler" },
  { tab: "settings", href: ROUTES.adminPresets, labelKey: "navPresets", icon: "layers" },
];

/** Field users see "their" leads; the workshop sees "its" jobs. */
function labelFor(item: NavItem, role: AppRole): NavItem["labelKey"] {
  if (item.labelKey === "navLeads" && (role === "staff" || role === "ctv")) return "navMyLeads";
  if (item.labelKey === "navWorkshop" && role === "workshop") return "navMyJobs";
  return item.labelKey;
}

export function navFor(profile: AccessProfile): NavGroup[] {
  const pick = (items: readonly TabItem[]): NavItem[] =>
    items
      .filter((i) => canSeeTab(profile, i.tab))
      .map((i) => ({ href: i.href, icon: i.icon, prefixes: i.prefixes, labelKey: labelFor(i, profile.role) }));
  const groups: NavGroup[] = [
    { labelKey: "navWork", items: pick(WORK) },
    { labelKey: "navSettings", items: pick(SETTINGS) },
  ];
  return groups.filter((g) => g.items.length > 0);
}

export function isNavActive(pathname: string, item: NavItem): boolean {
  if (pathname === item.href) return true;
  return (item.prefixes ?? []).some((p) => pathname.startsWith(p));
}

/** Where the logo links to (the role's home). */
export function homeFor(role: AppRole): string {
  return role === "workshop" ? ROUTES.workshop : role === "admin" ? ROUTES.admin : ROUTES.portal;
}
