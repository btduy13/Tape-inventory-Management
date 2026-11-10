"use client";
// The order list as the app's Thống kê "Tóm tắt" (thongke.js:299-385): Mã · Ngày đặt · Tên đơn ·
// Khách · Ngày giao (red overdue, amber due soon) · Công nợ (or "Đã tất toán") · Nợ NCC (orders.money)
// · Trạng thái (one column) · Thao tác, and a "└ TRỤC" line under printed tape with a new axis.
// Rows reload every 60 s from the browser (KPIs and paging total come from the server render).
import Link from "next/link";
import { useCallback, useState } from "react";
import { format, formatVnd } from "@/i18n";
import { DataTable, type Column } from "@/features/portal-ui/components/DataTable";
import { ToneBadge } from "@/features/portal-ui/components/StatusBadge";
import { Toast, type ToastMessage } from "@/features/portal-ui/components/Toast";
import { checkboxClass } from "@/features/portal-ui/components/styles";
import type { ListState } from "@/features/portal-ui/lib/list-params";
import type { WorkshopUser } from "@/features/workshop/server/queries";
import { fetchRows, type ListQuery } from "../lib/browser-rpc";
import { ordersCopy as c } from "../lib/copy";
import { dateVn, money } from "../lib/format";
import { listCopy as l } from "../lib/list-copy";
import { axisLine, statusBadges } from "../lib/list-row";
import { ORDERS_SPEC, dueTone, type OrderTab } from "../lib/list-spec";
import { exportHref, orderEditHref, orderHref } from "../lib/paths";
import type { ListPerms } from "../lib/perms";
import type { AdminOrderRow, OrderType } from "../lib/types";
import { AttachmentsDialog } from "./AttachmentsDialog";
import { OrdersAutoRefresh } from "./OrdersAutoRefresh";
import { OrdersToolbar } from "./OrdersToolbar";

type Props = {
  tab: OrderTab;
  rows: AdminOrderRow[];
  state: ListState;
  query: ListQuery;
  total: number;
  basePath: string;
  today: string;
  perms: ListPerms;
  workshopUsers: WorkshopUser[];
  filtered: boolean;
  failed: boolean;
  empty: { title: string; body: string; action: React.ReactNode };
};

const key = (o: AdminOrderRow) => `${o.type}:${o.id}`;
const rowLink = "whitespace-nowrap font-medium text-vt-blue underline-offset-2 hover:underline";

export function OrdersTable({ tab, rows, state, query, total, basePath, today, perms, workshopUsers, filtered, failed, empty }: Props) {
  // Server rows win whenever a new render arrives (filter, page, after an action); polling replaces them in between.
  const [live, setLive] = useState({ src: rows, rows });
  if (live.src !== rows) setLive({ src: rows, rows });
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [files, setFiles] = useState<{ type: OrderType; id: string } | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const poll = useCallback(
    () =>
      fetchRows(query).then((next) => {
        if (next) setLive((s) => ({ src: s.src, rows: next }));
      }),
    [query],
  );

  const shown = live.rows;
  const selected = shown.filter((o) => picked.has(key(o)));
  const allOnPage = shown.length > 0 && selected.length === shown.length;
  const toggle = (k: string) => setPicked((s) => {
    const next = new Set(s);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    return next;
  });

  const columns: Column<AdminOrderRow>[] = [
    { key: "select", header: c.colSelect, mobile: "badge", className: "w-12", cell: (o) => (
      <input
        type="checkbox" className={checkboxClass} checked={picked.has(key(o))} onChange={() => toggle(key(o))}
        aria-label={format(c.selectRow, { id: o.id })}
      />
    ) },
    { key: "id", header: l.colId, sortKey: "id", mobile: "title", className: "whitespace-nowrap", cell: (o) => (
      <Link href={orderHref(o.type, o.id)} className="font-bold text-vt-blue hover:underline">{o.id}</Link>
    ) },
    { key: "date", header: l.colDate, sortKey: "thoi_gian", className: "whitespace-nowrap", cell: (o) => dateVn(o.thoi_gian) },
    { key: "name", header: l.colName, sortKey: "ten_hang", mobile: "title", className: "min-w-40", cell: (o) => <span className="font-medium">{o.ten_hang || "—"}</span> },
    { key: "customer", header: l.colCustomer, sortKey: "ten_khach_hang", className: "min-w-32", cell: (o) => o.ten_khach_hang || "—" },
    { key: "due", header: l.colDue, sortKey: "ngay_du_kien", className: "whitespace-nowrap", cell: (o) => {
      const tone = dueTone(o.ngay_du_kien, o.da_giao, o.is_quote, today);
      const cls = tone === "overdue" ? "font-semibold text-pt-red-ink" : tone === "soon" ? "font-semibold text-pt-amber-ink" : "";
      return (
        <span className={cls}>
          {dateVn(o.ngay_du_kien)}
          {tone && <span className="sr-only"> ({tone === "overdue" ? c.dueOverdue : c.sumSoon})</span>}
        </span>
      );
    } },
    { key: "debt", header: l.colDebt, sortKey: "cong_no_khach", align: "end", className: "whitespace-nowrap tabular-nums", cell: (o) =>
      o.da_tat_toan && !o.is_quote ? <ToneBadge tone="green">{c.settled}</ToneBadge> : money(o.cong_no_khach) },
    ...(perms.money ? [{ key: "supplier", header: l.colSupplier, align: "end", className: "whitespace-nowrap tabular-nums",
      cell: (o: AdminOrderRow) => money(o.cong_no_ncc) } satisfies Column<AdminOrderRow>] : []),
    { key: "status", header: l.colStatus, className: "whitespace-nowrap", cell: (o) =>
      statusBadges(o).map((b) => <ToneBadge key={b.label} tone={b.tone}>{b.label}</ToneBadge>) },
    { key: "actions", header: l.colActions, className: "whitespace-nowrap", cell: (o) => (
      <span className="flex gap-3 text-sm">
        {perms.export && !o.is_quote && (
          <Link href={exportHref([o.id], "phieu_giao_hang")} aria-label={format(l.printNoteOf, { id: o.id })} className={rowLink}>{l.printNote}</Link>
        )}
        {perms.edit && <Link href={orderEditHref(o.type, o.id)} aria-label={format(l.editOf, { id: o.id })} className={rowLink}>{l.edit}</Link>}
        <button type="button" onClick={() => setFiles({ type: o.type, id: o.id })} aria-label={format(l.filesOf, { id: o.id })} className={rowLink}>{l.files}</button>
      </span>
    ) },
  ];

  const subRow = (o: AdminOrderRow) => {
    const a = axisLine(o, perms.money);
    if (!a) return null;
    return (
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 border-l-2 border-pt-line-strong pl-3 text-sm text-pt-muted">
        <span aria-hidden className="font-mono text-vt-blue">└─</span>
        <ToneBadge tone="blue">{l.axisBadge.toUpperCase()}</ToneBadge>
        <span className="font-semibold text-pt-text">{a.name}</span>
        <span>{a.meta}</span>
        <span>{l.axisTotal} <b className="tabular-nums text-pt-text">{formatVnd(a.total)}</b></span>
        {a.ctv !== null && <span>{a.ctv ? format(l.axisCtv, { name: a.ctv }) : l.axisNoCtv}</span>}
        {a.commission && <span>{format(l.axisCommission, { pct: a.commission.pct, amount: formatVnd(a.commission.amount) })}</span>}
        {a.netProfit !== null && <b className="tabular-nums text-pt-green-ink">{format(l.axisProfit, { amount: formatVnd(a.netProfit) })}</b>}
      </p>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <OrdersAutoRefresh onTick={poll} />
      {!failed && (
        <OrdersToolbar
          tab={tab} rows={shown} selected={selected} query={query} perms={perms} today={today} workshopUsers={workshopUsers}
          allOnPage={allOnPage}
          onSelectPage={() => setPicked(allOnPage ? new Set() : new Set(shown.map(key)))}
          onClear={() => setPicked(new Set())}
          onResult={setToast}
        />
      )}
      <DataTable
        caption={c.caption}
        columns={columns}
        rows={shown}
        rowKey={key}
        subRow={subRow}
        list={{ basePath, spec: ORDERS_SPEC, state, total }}
        filtered={filtered}
        empty={empty}
        error={failed ? c.loadError : null}
      />
      <AttachmentsDialog order={files} canEdit={perms.edit} onClose={() => setFiles(null)} />
      {/* Import errors can list several rows: give them time to be read. */}
      <Toast toast={toast} durationMs={toast?.tone === "error" ? 12000 : 4000} />
    </div>
  );
}
