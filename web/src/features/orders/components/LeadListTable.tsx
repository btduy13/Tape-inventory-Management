"use client";
// Lead table for /admin and /portal. Server parses the URL and loads the page of rows; this
// client part adds realtime refresh + per-viewer unread highlighting on top of the kit table.
import { useCallback } from "react";
import { formatVnd, getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import { DataTable, type Column } from "@/features/portal-ui/components/DataTable";
import { StatusBadge, ToneBadge } from "@/features/portal-ui/components/StatusBadge";
import type { ListState } from "@/features/portal-ui/lib/list-params";
import type { LeadListSpec, LeadRow } from "../lib/lead-list";
import { affectedLeadId, type ChangePayload } from "../lib/realtime-events";
import { formatDateTime } from "../lib/timeline";
import { UnreadBadge } from "./UnreadBadge";
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
};

function columns(unread: ReadonlySet<string>, showAssignee: boolean): Column<LeadRow>[] {
  const cols: (Column<LeadRow> | false)[] = [
    {
      key: "code",
      header: c.colCode,
      sortKey: "code",
      mobile: "title",
      className: "w-32",
      cell: (r) => (
        <span className="inline-flex items-center gap-2 whitespace-nowrap">
          {r.code}
          {unread.has(r.id) && <ToneBadge tone="red">{c.newBadge}</ToneBadge>}
        </span>
      ),
    },
    {
      key: "customer",
      header: c.colCustomer,
      sortKey: "customer",
      cell: (r) => (
        <span className="flex min-w-0 flex-col">
          <span className="font-medium text-pt-text">{r.customer_name}</span>
          <span className="text-xs text-pt-muted">{[r.company, r.phone].filter(Boolean).join(", ")}</span>
        </span>
      ),
    },
    { key: "status", header: c.colStatus, sortKey: "status", mobile: "badge", cell: (r) => <StatusBadge status={r.status} /> },
    showAssignee && {
      key: "assignee",
      header: c.colAssignee,
      sortKey: "assignee",
      cell: (r) => r.assigneeName ?? <span className="text-pt-red-ink">{c.unassigned}</span>,
    },
    { key: "quantity", header: c.colQty, sortKey: "quantity", align: "end", className: "hidden xl:table-cell", cell: (r) => r.quantity.toLocaleString("vi-VN") },
    {
      key: "value",
      header: c.colValue,
      sortKey: "value",
      align: "end",
      cell: (r) => (r.quoteTotal === null ? <span className="text-pt-muted">{c.noQuote}</span> : formatVnd(r.quoteTotal)),
    },
    { key: "created", header: c.colCreated, sortKey: "created", className: "hidden 2xl:table-cell", mobile: "hidden", cell: (r) => formatDateTime(r.created_at) },
    { key: "updated", header: c.colUpdated, sortKey: "updated", className: "text-pt-muted", cell: (r) => formatDateTime(r.updated_at) },
  ];
  return cols.filter((x): x is Column<LeadRow> => !!x);
}

export function LeadListTable({ rows, total, spec, state, basePath, detail, showAssignee, filtered, empty, error }: Props) {
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
      <p className="flex items-center gap-2 text-sm text-pt-muted">
        <span aria-hidden className="size-2 rounded-full bg-pt-green-ink" />
        {c.live}
        <UnreadBadge count={count} />
      </p>
      <DataTable
        caption={c.allLeads}
        columns={columns(unreadIds, showAssignee)}
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
