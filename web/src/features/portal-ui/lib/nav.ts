// Role-aware navigation. Display only: every page still calls requireRole() and RLS decides data.
import { ROUTES } from "@/lib/routes";
import type { AppRole } from "@/lib/types";

export type IconName = "overview" | "customers" | "leads" | "workshop" | "users" | "ruler" | "layers";

export type NavItem = {
  href: string;
  /** Key in vi.portalUi. */
  labelKey: "navOverview" | "navLeads" | "navMyLeads" | "navWorkshop" | "navMyJobs" | "navOrders" | "navCustomers" | "navUsers" | "navTapeSpecs" | "navPresets";
  icon: IconName;
  /** Active on the exact href or on any of these path prefixes. */
  prefixes?: readonly string[];
};

export type NavGroup = { labelKey: "navWork" | "navSettings"; items: NavItem[] };

const leadPrefixes = ["/portal/leads/", "/admin/leads/"] as const;

export function navFor(role: AppRole): NavGroup[] {
  switch (role) {
    case "admin":
      return [
        {
          labelKey: "navWork",
          items: [
            { href: ROUTES.admin, labelKey: "navOverview", icon: "overview" },
            { href: ROUTES.portal, labelKey: "navLeads", icon: "leads", prefixes: leadPrefixes },
            { href: ROUTES.workshop, labelKey: "navWorkshop", icon: "workshop", prefixes: [`${ROUTES.workshop}/`] },
            { href: ROUTES.adminOrders, labelKey: "navOrders", icon: "layers", prefixes: [`${ROUTES.adminOrders}/`] },
            { href: ROUTES.adminCustomers, labelKey: "navCustomers", icon: "customers", prefixes: [`${ROUTES.adminCustomers}/`] },
          ],
        },
        {
          labelKey: "navSettings",
          items: [
            { href: ROUTES.adminUsers, labelKey: "navUsers", icon: "users" },
            { href: ROUTES.adminTapeSpecs, labelKey: "navTapeSpecs", icon: "ruler" },
            { href: ROUTES.adminPresets, labelKey: "navPresets", icon: "layers" },
          ],
        },
      ];
    case "manager":
      return [{ labelKey: "navWork", items: [{ href: ROUTES.portal, labelKey: "navLeads", icon: "leads", prefixes: leadPrefixes }] }];
    case "staff":
    case "ctv":
      return [{ labelKey: "navWork", items: [{ href: ROUTES.portal, labelKey: "navMyLeads", icon: "leads", prefixes: leadPrefixes }] }];
    case "workshop":
      return [{ labelKey: "navWork", items: [{ href: ROUTES.workshop, labelKey: "navMyJobs", icon: "workshop", prefixes: [`${ROUTES.workshop}/`] }] }];
  }
}

export function isNavActive(pathname: string, item: NavItem): boolean {
  if (pathname === item.href) return true;
  return (item.prefixes ?? []).some((p) => pathname.startsWith(p));
}

/** Where the logo links to (the role's home). */
export function homeFor(role: AppRole): string {
  return role === "workshop" ? ROUTES.workshop : role === "admin" ? ROUTES.admin : ROUTES.portal;
}
