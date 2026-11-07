"use client";
// The order list (portal-ui DataTable) with multi-select: a checkbox per row, "select the page",
// the selection total, bulk actions and CSV export. Selection lives in the client and survives the
// 30 s refresh; ids that left the page are dropped.
import Link from "next/link";
import { useState, useTransition } from "react";
import { format, formatVnd } from "@/i18n";
import { DataTable, type Column } from "@/features/portal-ui/components/DataTable";
import { ToneBadge } from "@/features/portal-ui/components/StatusBadge";
import { Toast, type ToastMessage } from "@/features/portal-ui/components/Toast";
import { buttonClass, checkboxClass, surfaceClass } from "@/features/portal-ui/components/styles";
import type { ListState } from "@/features/portal-ui/lib/list-params";
import type { WorkshopUser } from "@/features/workshop/server/queries";
import { TYPE_LABEL, ordersCopy as c } from "../lib/copy";
import { ordersCsv } from "../lib/csv";
import { dateTimeVn, dateVn, plain, money } from "../lib/format";
import { ORDERS_SPEC, dueTone, type OrderTab } from "../lib/list-spec";
import { orderHref } from "../lib/paths";
import type { OrderRef } from "../lib/types";
import { exportCsvAction } from "../server/actions";
import type { ListedOrder } from "../server/queries";
import { OrderActions } from "./OrderActions";
import { OrderStatusBadges, OrderStepBadge, OriginBadge } from "./badges";

type Props = {
  tab: OrderTab;
  rows: ListedOrder[];
  state: ListState;
  total: number;
  basePath: string;
  today: string;
  workshopUsers: WorkshopUser[];
  filtered: boolean;
  failed: boolean;
  empty: { title: string; body: string; action: React.ReactNode };
};

const refOf = (o: ListedOrder): OrderRef => ({
  type: o.type, id: o.id, isQuote: o.is_quote, delivered: o.da_giao, settled: o.da_tat_toan, hasJob: !!o.job_id,
});

function download(csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `don-hang-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function OrdersTable({ tab, rows, state, total, basePath, today, workshopUsers, filtered, failed, empty }: Props) {
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [exporting, startExport] = useTransition();
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const key = (o: ListedOrder) => `${o.type}:${o.id}`;
  const selected = rows.filter((o) => picked.has(key(o)));
  const allOnPage = rows.length > 0 && selected.length === rows.length;
  const toggle = (k: string) => setPicked((s) => {
    const next = new Set(s);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    return next;
  });
  const isPrinted = tab === "bang_keo_in";
  const isQuotes = tab === "quote";

  const columns: Column<ListedOrder>[] = [
    { key: "select", header: c.colSelect, mobile: "badge", className: "w-12", cell: (o) => (
      <input
        type="checkbox" className={checkboxClass} checked={picked.has(key(o))} onChange={() => toggle(key(o))}
        aria-label={format(c.selectRow, { id: o.id })}
      />
    ) },
    { key: "order", header: c.colOrder, sortKey: "ten_hang", mobile: "title", cell: (o) => (
      <Link href={orderHref(o.type, o.id)} className="flex min-w-0 flex-col font-semibold text-vt-blue hover:underline">
        <span>{o.ten_hang || "—"}</span>
        <span className="text-xs font-normal text-pt-muted">
          {o.id}{o.quy_cach ? ` · ${o.quy_cach}` : ""}{o.has_quote_items ? ` · ${c.multiSize}` : ""}
        </span>
      </Link>
    ) },
    ...(isQuotes || tab === "all" ? [{ key: "type", header: c.colType, cell: (o: ListedOrder) => TYPE_LABEL[o.type] } satisfies Column<ListedOrder>] : []),
    ...(isPrinted ? [{ key: "step", header: c.colStep, cell: (o: ListedOrder) => (
      <span className="flex flex-col items-start gap-1">
        <OrderStepBadge step={o.step} />
        {o.job_id && !o.workshop_user_id && o.step !== "da_giao" && o.step !== "huy" && (
          <span className="text-xs text-pt-amber-ink">{c.unassigned}</span>
        )}
      </span>
    ) } satisfies Column<ListedOrder>] : []),
    { key: "customer", header: c.colCustomer, sortKey: "ten_khach_hang", cell: (o) => (
      <span className="flex min-w-0 flex-col">
        <span>{o.ten_khach_hang || "—"}</span>
        {o.sdt_khach_hang && <span className="text-xs text-pt-muted">{o.sdt_khach_hang}</span>}
      </span>
    ) },
    { key: "date", header: c.colDate, sortKey: "thoi_gian", className: "hidden lg:table-cell whitespace-nowrap", cell: (o) => dateTimeVn(o.thoi_gian) },
    { key: "due", header: c.colDue, sortKey: "ngay_du_kien", className: "whitespace-nowrap", cell: (o) => {
      const tone = dueTone(o.ngay_du_kien, o.da_giao, o.is_quote, today);
      return (
        <span className="flex flex-col items-start gap-1">
          <span>{dateVn(o.ngay_du_kien)}</span>
          {tone && <ToneBadge tone={tone === "overdue" ? "red" : "amber"}>{tone === "overdue" ? c.dueOverdue : c.sumSoon}</ToneBadge>}
        </span>
      );
    } },
    { key: "qty", header: c.colQty, sortKey: "so_luong", align: "end", className: "hidden xl:table-cell", cell: (o) => plain(o.so_luong) },
    { key: "total", header: c.colTotal, sortKey: "tong_tien", align: "end", className: "whitespace-nowrap tabular-nums", cell: (o) => money(o.tong_tien) },
    { key: "debt", header: c.colDebt, sortKey: "cong_no_khach", align: "end", className: "whitespace-nowrap tabular-nums", cell: (o) =>
      o.da_tat_toan && !o.is_quote ? <ToneBadge tone="green">{c.settled}</ToneBadge> : money(o.cong_no_khach) },
    { key: "profit", header: c.colProfit, sortKey: "loi_nhuan_rong", align: "end", className: "hidden xl:table-cell whitespace-nowrap tabular-nums", cell: (o) => (
      <span className={Number(o.loi_nhuan_rong) < 0 ? "text-pt-red-ink" : ""}>{money(o.loi_nhuan_rong)}</span>
    ) },
    ...(!isQuotes ? [{ key: "status", header: c.colStatus, className: "hidden lg:table-cell", cell: (o: ListedOrder) => (
      <OrderStatusBadges delivered={o.da_giao} settled={o.da_tat_toan} isQuote={o.is_quote} />
    ) } satisfies Column<ListedOrder>] : []),
    ...(isPrinted ? [{ key: "origin", header: c.colOrigin, className: "hidden 2xl:table-cell", cell: (o: ListedOrder) => <OriginBadge origin={o.origin} /> } satisfies Column<ListedOrder>] : []),
  ];

  const exportCsv = () => {
    if (selected.length > 0) return download(ordersCsv(selected));
    startExport(async () => {
      const r = await exportCsvAction(window.location.search);
      if (r.ok) download(r.csv);
      else setToast({ id: Date.now(), message: r.message, tone: "error" });
    });
  };

  const sumTotal = selected.reduce((s, o) => s + Number(o.tong_tien), 0);
  const sumDebt = selected.reduce((s, o) => s + (o.da_tat_toan ? 0 : Number(o.cong_no_khach)), 0);

  return (
    <div className="flex flex-col gap-3">
      {!failed && rows.length > 0 && (
        <div className={`${surfaceClass} flex flex-col gap-3 p-3 lg:flex-row lg:flex-wrap lg:items-center`}>
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-medium text-pt-text">
            <input
              type="checkbox" className={checkboxClass} checked={allOnPage}
              onChange={() => setPicked(allOnPage ? new Set() : new Set(rows.map(key)))}
            />
            {c.selectPage}
          </label>
          {selected.length > 0 && (
            <p role="status" className="flex flex-col text-sm">
              <span className="font-semibold text-pt-text">{format(c.selected, { count: selected.length })}</span>
              <span className="tabular-nums text-pt-muted">{format(c.selectedTotal, { total: formatVnd(sumTotal), debt: formatVnd(sumDebt) })}</span>
            </p>
          )}
          <div className="flex flex-wrap gap-2 lg:ml-auto">
            {selected.length > 0 && (
              <>
                <OrderActions
                  items={selected.map(refOf)} workshopUsers={workshopUsers} today={today}
                  onDone={() => setPicked(new Set())} onResult={setToast}
                />
                <button type="button" onClick={() => setPicked(new Set())} className={buttonClass("ghost", "sm")}>{c.clearSelection}</button>
              </>
            )}
            <button type="button" onClick={exportCsv} disabled={exporting} className={buttonClass("secondary", "sm")}>
              {selected.length > 0 ? c.actCsvSelected : c.actCsv}
            </button>
          </div>
        </div>
      )}
      <DataTable
        caption={c.caption}
        columns={columns}
        rows={rows}
        rowKey={key}
        rowClassName={(o) => {
          const tone = dueTone(o.ngay_du_kien, o.da_giao, o.is_quote, today);
          return tone === "overdue" ? "bg-pt-red-tint/40" : tone === "soon" ? "bg-pt-amber-tint/40" : "";
        }}
        list={{ basePath, spec: ORDERS_SPEC, state, total }}
        filtered={filtered}
        empty={empty}
        error={failed ? c.loadError : null}
      />
      <Toast toast={toast} />
    </div>
  );
}
