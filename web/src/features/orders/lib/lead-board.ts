// Quote-request list/detail display rules: status tabs, badge tone, "Đã chờ" age, 5-step strip.
// Pure and isomorphic. Tabs are presets of the existing `status` URL filter (no new param).
import type { Tone } from "@/features/portal-ui/lib/status-tones";
import type { LeadStatus } from "@/lib/types";

export type LeadTabKey = "all" | "new" | "working" | "quoted" | "won" | "closed";

export const LEAD_TABS: readonly { key: LeadTabKey; statuses: readonly LeadStatus[] }[] = [
  { key: "all", statuses: [] },
  { key: "new", statuses: ["new"] },
  { key: "working", statuses: ["assigned", "consulting"] },
  { key: "quoted", statuses: ["quoted"] },
  { key: "won", statuses: ["accepted", "production", "shipping", "done"] },
  { key: "closed", statuses: ["cancelled"] },
];

/** Tab whose statuses equal the current filter (order-insensitive); null = a custom combination. */
export function activeLeadTab(status: readonly string[] | undefined): LeadTabKey | null {
  const cur = new Set(status ?? []);
  const tab = LEAD_TABS.find((t) => t.statuses.length === cur.size && t.statuses.every((s) => cur.has(s)));
  return tab?.key ?? null;
}

/** Rows per tab, from rows already filtered by everything except status. */
export function countLeadTabs(rows: readonly { status: LeadStatus }[]): Record<LeadTabKey, number> {
  const out = Object.fromEntries(LEAD_TABS.map((t) => [t.key, 0])) as Record<LeadTabKey, number>;
  for (const r of rows) {
    out.all++;
    const tab = LEAD_TABS.find((t) => t.key !== "all" && t.statuses.includes(r.status));
    if (tab) out[tab.key]++;
  }
  return out;
}

/** grey = new, blue = sales working, amber = waiting on the customer, green = won, red = lost. */
export const LEAD_BADGE_TONE: Readonly<Record<LeadStatus, Tone>> = {
  new: "grey",
  assigned: "blue",
  consulting: "blue",
  quoted: "amber",
  accepted: "green",
  production: "green",
  shipping: "green",
  done: "green",
  cancelled: "red",
};

/** Statuses where the request is still with the sales side (workshop steps have their own clock). */
const WAITING_STATUSES: readonly LeadStatus[] = ["new", "assigned", "consulting", "quoted", "accepted"];

export type Waiting = { hours: number; tone: "grey" | "amber" | "red" };

/** Age since the last update for open requests: grey < 4h, amber 4–24h, red > 24h. null = closed. */
export function leadWaiting(status: LeadStatus, sinceIso: string, now: number): Waiting | null {
  const since = Date.parse(sinceIso);
  if (!WAITING_STATUSES.includes(status) || Number.isNaN(since)) return null;
  const hours = Math.max(0, (now - since) / 3_600_000);
  return { hours, tone: hours > 24 ? "red" : hours >= 4 ? "amber" : "grey" };
}

/** "Dưới 1 giờ" / "5 giờ" / "3 ngày" style parts: unit + count. */
export function waitingParts(hours: number): { unit: "lessHour" | "hours" | "days"; count: number } {
  if (hours < 1) return { unit: "lessHour", count: 0 };
  if (hours < 24) return { unit: "hours", count: Math.floor(hours) };
  return { unit: "days", count: Math.floor(hours / 24) };
}

/** The 5-step strip on the detail page; each step lists the statuses it covers. */
export const LEAD_STEPS: readonly { key: "new" | "assign" | "quote" | "sent" | "won"; statuses: readonly LeadStatus[] }[] = [
  { key: "new", statuses: ["new"] },
  { key: "assign", statuses: ["assigned"] },
  { key: "quote", statuses: ["consulting"] },
  { key: "sent", statuses: ["quoted"] },
  { key: "won", statuses: ["accepted", "production", "shipping", "done"] },
];

/** Current step index; -1 when cancelled. */
export function leadStepIndex(status: LeadStatus): number {
  return LEAD_STEPS.findIndex((s) => s.statuses.includes(status));
}
