// Which panel the lead header's primary button jumps to, and which status the status form
// suggests first. Display only: the allowed transitions come from lib/lead-status.ts.
import { STATUS_FLOW, nextStatusOptions } from "@/lib/lead-status";
import type { AppRole, LeadStatus } from "@/lib/types";

/** Section ids on the lead detail page. */
export const PANEL = {
  assign: "phan-cong",
  status: "trang-thai",
  quotes: "bao-gia",
  production: "san-xuat",
  notes: "ghi-chu",
} as const;

export type PrimaryAction = { anchor: string; label: "goAssign" | "goStatus" | "goQuote" | "goProduction" | "goDone" };

export function primaryActionFor(status: LeadStatus, role: AppRole): PrimaryAction | null {
  const can = (to: LeadStatus) => nextStatusOptions(role, status).includes(to);
  switch (status) {
    case "new":
      return role === "admin" ? { anchor: PANEL.assign, label: "goAssign" } : null;
    case "assigned":
      return can("consulting") ? { anchor: PANEL.status, label: "goStatus" } : null;
    case "consulting":
      return role === "admin" || role === "manager" ? { anchor: PANEL.quotes, label: "goQuote" } : null;
    case "accepted":
      return role === "admin" ? { anchor: PANEL.production, label: "goProduction" } : null;
    case "shipping":
      return can("done") ? { anchor: PANEL.status, label: "goDone" } : null;
    default:
      return null;
  }
}

const HANDOFF_STATUSES: readonly LeadStatus[] = ["accepted", "production", "shipping", "done"];

/** The production hand-off form is shown once a quote is accepted (or a job already exists). */
export function showsHandoff(status: LeadStatus, productionOrderId: string | null): boolean {
  return !!productionOrderId || HANDOFF_STATUSES.includes(status);
}

/** The next status on the main road, when this role may move there. */
export function recommendedNext(status: LeadStatus, options: readonly LeadStatus[]): LeadStatus | null {
  const i = STATUS_FLOW.indexOf(status);
  const next = i >= 0 ? STATUS_FLOW[i + 1] : undefined;
  return next && options.includes(next) ? next : null;
}

/** Forward statuses first (main-road order), cancel last. */
export function orderStatusOptions(options: readonly LeadStatus[]): LeadStatus[] {
  const rank = (s: LeadStatus) => (s === "cancelled" ? 99 : STATUS_FLOW.indexOf(s));
  return [...options].sort((a, b) => rank(a) - rank(b));
}
