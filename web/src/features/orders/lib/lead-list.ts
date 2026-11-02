// Lead list (/admin table, /portal "Việc của tôi"): URL spec + row shaping. Pure, isomorphic.
// Rows are loaded through the caller's RLS client (staff/ctv only get their own leads), then
// searched / sorted / paged in memory so sort by assignee name and quote value works and the
// search ignores Vietnamese accents.
import { defineListSpec } from "@/features/portal-ui/lib/list-params";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/types";
import { STATUS_FLOW } from "@/lib/lead-status";

/** Design source: picked from a showcase preset, or drawn from scratch in the designer. */
export const LEAD_SOURCES = ["preset", "custom"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

/** Most recently updated leads considered per request (search / sort run over these). */
export const LEAD_SCAN_LIMIT = 1000;

/** `?assignee=none`: leads nobody owns yet. */
export const UNASSIGNED = "none";

/** Spec per request: the assignee filter only accepts ids of known internal users. */
export function leadListSpec(assigneeIds: readonly string[] = []) {
  return defineListSpec({
    sort: {
      keys: {
        updated: { column: "updated_at", firstDir: "desc" },
        created: { column: "created_at", firstDir: "desc" },
        code: { column: "code" },
        customer: { column: "customer_name" },
        status: { column: "statusRank" },
        assignee: { column: "assigneeName" },
        value: { column: "quoteTotal", firstDir: "desc" },
        quantity: { column: "quantity", firstDir: "desc" },
      },
      default: { key: "updated", dir: "desc" },
      tiebreak: "id",
    },
    search: { columns: ["code", "customer_name", "phone", "company"] },
    filters: {
      status: { kind: "enum", column: "status", values: LEAD_STATUSES, multi: true },
      assignee: { kind: "enum", column: "assigneeKey", values: [UNASSIGNED, ...assigneeIds] },
      source: { kind: "enum", column: "source", values: LEAD_SOURCES },
    },
    dateRange: { column: "created_at" },
    pageSizes: [25, 50, 100],
  });
}

export type LeadListSpec = ReturnType<typeof leadListSpec>;

/** What the leads query returns (embedded design + quotes are RLS-filtered too). */
export type RawLeadRow = {
  id: string;
  code: string;
  customer_name: string;
  phone: string;
  company: string | null;
  quantity: number;
  status: LeadStatus;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  designs: { preset_id: string | null }[] | null;
  quotes: { total: number; version: number }[] | null;
};

export type LeadRow = Omit<RawLeadRow, "designs" | "quotes"> & {
  assigneeName: string | null;
  assigneeKey: string;
  /** Position on the main road; cancelled sorts last. */
  statusRank: number;
  source: LeadSource | null;
  /** Total of the latest quote version (VND), null when there is no quote yet. */
  quoteTotal: number | null;
};

export function statusRank(status: LeadStatus): number {
  const i = STATUS_FLOW.indexOf(status);
  return i < 0 ? STATUS_FLOW.length : i;
}

export function toLeadRow(raw: RawLeadRow, names: Readonly<Record<string, string>>): LeadRow {
  const { designs, quotes, ...lead } = raw;
  const design = designs?.[0];
  const latest = [...(quotes ?? [])].sort((a, b) => b.version - a.version)[0];
  return {
    ...lead,
    assigneeName: lead.assigned_to ? names[lead.assigned_to] || null : null,
    assigneeKey: lead.assigned_to ?? UNASSIGNED,
    statusRank: statusRank(lead.status),
    source: design ? (design.preset_id ? "preset" : "custom") : null,
    quoteTotal: latest ? Number(latest.total) : null,
  };
}

/** Lead statuses that still need work (KPI and queues). */
export const OPEN_STATUSES: readonly LeadStatus[] = LEAD_STATUSES.filter((s) => s !== "done" && s !== "cancelled");

/** Link to the lead table (section id `anchor`) on `basePath` with the given filters. */
export function filteredHref(basePath: string, filters: { status?: readonly LeadStatus[]; assignee?: string }, anchor = "danh-sach"): string {
  const qs = new URLSearchParams();
  if (filters.status?.length) qs.set("status", filters.status.join(","));
  if (filters.assignee) qs.set("assignee", filters.assignee);
  const s = qs.toString();
  return `${s ? `${basePath}?${s}` : basePath}${anchor ? `#${anchor}` : ""}`;
}

/** Empty-table copy: "no match" (with a clear-filters link) vs "nothing yet" for this viewer. */
export type LeadListEmpty = {
  /** Omitted when filtered: the table supplies its own "no match" title. */
  title?: "emptyMine" | "emptyAll";
  body: "emptyFilteredBody" | "emptyMineBody" | "emptyAllBody";
  clear: boolean;
};

export function leadListEmpty(filtered: boolean, mine: boolean): LeadListEmpty {
  if (filtered) return { body: "emptyFilteredBody", clear: true };
  return { title: mine ? "emptyMine" : "emptyAll", body: mine ? "emptyMineBody" : "emptyAllBody", clear: false };
}
