// Lead status workflow. MUST mirror public.lead_transition_allowed() in migration 0004.
import type { AppRole, LeadStatus } from "@/lib/types";

export const STATUS_FLOW: readonly LeadStatus[] = [
  "new", "assigned", "consulting", "quoted", "accepted", "production", "shipping", "done",
] as const;

export const TERMINAL_STATUSES: readonly LeadStatus[] = ["done", "cancelled"];

/** Transitions staff/ctv may perform themselves (admin/manager/server may do any). */
const STAFF_TRANSITIONS: ReadonlyArray<readonly [LeadStatus, LeadStatus]> = [
  ["assigned", "consulting"],
  ["accepted", "production"],
  ["production", "shipping"],
  ["shipping", "done"],
];

export function staffTransitionAllowed(from: LeadStatus, to: LeadStatus): boolean {
  if (from === to) return true;
  if (TERMINAL_STATUSES.includes(from)) return false;
  if (to === "cancelled") return true;
  if (to === "quoted" || to === "accepted" || to === "new" || to === "assigned") return false;
  return STAFF_TRANSITIONS.some(([f, t]) => f === from && t === to);
}

export function transitionAllowed(role: AppRole, from: LeadStatus, to: LeadStatus): boolean {
  if (role === "admin" || role === "manager") return true;
  return staffTransitionAllowed(from, to);
}

/** Next statuses to offer in the UI for this role. */
export function nextStatusOptions(role: AppRole, from: LeadStatus): LeadStatus[] {
  const all: LeadStatus[] = [...STATUS_FLOW, "cancelled"];
  return all.filter((to) => to !== from && transitionAllowed(role, from, to));
}
