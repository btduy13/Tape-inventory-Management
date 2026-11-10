"use client";
// Lead table for /admin and /portal. Server parses the URL and loads the page of rows; this
// client part adds realtime refresh + per-viewer unread highlighting on top of the kit table.
import { useCallback } from "react";
import { format, getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import { DataTable, type Column } from "@/features/portal-ui/components/DataTable";
import { ToneBadge } from "@/features/portal-ui/components/StatusBadge";
import { linkClass } from "@/features/portal-ui/components/styles";
import type { ListState } from "@/features/portal-ui/lib/list-params";
import type { LeadListSpec, LeadRow } from "../lib/lead-list";
import { affectedLeadId, type ChangePayload } from "../lib/realtime-events";
import { formatDate } from "../lib/timeline";
import { LeadBadge, WaitingTag } from "./LeadBits";
import { useLeadRealtime } from "./useLeadRealtime";
import { useUnread } from "./useUnread";

const t = getDictionary();
const c = t.leadsUi;

type Props = {
  rows: LeadRow[];
  total: number;
  spec: LeadListSpec;
  state: ListState;
  basePath: string;
  /** Detail link target: the pricing route (/admin/leads) or the portal route. */
  detail: "admin" | "portal";
  /** Show the assignee column (admin/manager; staff/ctv only see their own leads). */
  showAssignee: boolean;
  filtered: boolean;
  empty: { title?: string; body: string; action?: React.ReactNode };
  error?: string | null;
  now: number;
};

function columns(unread: ReadonlySet<string>, showAssignee: boolean, now: number): Column<LeadRow>[] {
  const cols: (Column<LeadRow> | false)[] = [
    {
      key: "customer",
      header: c.colCustomer,
      sortKey: "customer",
      mobile: "title",
      cell: (r) => (
        <span className="flex min-w-0 flex-col">
          <span className="inline-flex flex-wrap items-center gap-2 text-pt-text">
            {r.customer_name}
            {unread.has(r.id) && <ToneBadge tone="red">{c.newBadge}</ToneBadge>}
          </span>
          <span className="text-xs font-normal text-pt-muted">
            {[r.code, r.company].filter(Boolean).join(" · ")}
            <span className="hidden md:inline"> · {r.phone}</span>
          </span>
        </span>
      ),
    },
    // Phones only (the table shows the number under the name): a tap-to-call link above the card link.
    { key: "phone", header: c.colPhone, className: "hidden", cell: (r) => <a href={`tel:${r.phone}`} className={`pt-row-raise ${linkClass}`}>{r.phone}</a> },
    { key: "quantity", header: c.colQty, sortKey: "quantity", align: "end", className: "tabular-nums", cell: (r) => r.quantity.toLocaleString("vi-VN") },
    showAssignee && {
      key: "assignee",
      header: c.colAssignee,
      sortKey: "assignee",
      cell: (r) => r.assigneeName ?? <span className="text-pt-muted">{c.unassigned}</span>,
    },
    { key: "status", header: c.colStatus, sortKey: "status", mobile: "badge", cell: (r) => <LeadBadge status={r.status} /> },
    { key: "waiting", header: c.colWaiting, cell: (r) => <WaitingTag status={r.status} since={r.updated_at} now={now} /> },
    { key: "updated", header: c.colUpdated, sortKey: "updated", mobile: "hidden", className: "whitespace-nowrap text-pt-muted", cell: (r) => formatDate(r.updated_at) },
  ];
  return cols.filter((x): x is Column<LeadRow> => !!x);
}

export function LeadListTable({ rows, total, spec, state, basePath, detail, showAssignee, filtered, empty, error, now }: Props) {
  const { unreadIds, count, markLive } = useUnread(rows);
  const onChange = useCallback(
    (p: ChangePayload) => {
      const id = affectedLeadId(p);
      if (id) markLive(id);
    },
    [markLive],
  );
  useLeadRealtime({ onChange });
  const href = (r: LeadRow) => (detail === "admin" ? ROUTES.adminLead(r.id) : ROUTES.portalLead(r.id));

  return (
    <div className="flex flex-col gap-3">
      <p aria-live="polite" className="text-sm font-medium text-pt-red-ink empty:hidden">{count > 0 ? format(t.orders.unreadCount, { count }) : ""}</p>
      <DataTable
        caption={c.allLeads}
        columns={columns(unreadIds, showAssignee, now)}
        rows={rows}
        rowKey={(r) => r.id}
        rowHref={href}
        rowClassName={(r) => (unreadIds.has(r.id) ? "bg-pt-yellow-tint/40" : "")}
        list={{ basePath, spec, state, total }}
        filtered={filtered}
        empty={empty}
        error={error}
      />
    </div>
  );
}
