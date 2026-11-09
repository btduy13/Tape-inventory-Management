"use client";
// Toolbar over the list: "Chọn cả trang", "Đã chọn: N đơn · Tổng CN", the bulk actions the user may use
// (Cập nhật trạng thái, Đưa vào xưởng, Xóa), Xuất đơn (export page with the selected ids) and Excel.
import Link from "next/link";
import { format, formatVnd } from "@/i18n";
import type { ToastMessage } from "@/features/portal-ui/components/Toast";
import { buttonClass, checkboxClass, surfaceClass } from "@/features/portal-ui/components/styles";
import type { WorkshopUser } from "@/features/workshop/server/queries";
import type { ListQuery } from "../lib/browser-rpc";
import { ordersCopy as c } from "../lib/copy";
import { listCopy as l } from "../lib/list-copy";
import { selectedDebt } from "../lib/list-row";
import type { OrderTab } from "../lib/list-spec";
import { exportHref } from "../lib/paths";
import type { ListPerms } from "../lib/perms";
import type { AdminOrderRow, OrderRef } from "../lib/types";
import { OrderActions } from "./OrderActions";
import { OrdersExcel } from "./OrdersExcel";

type Props = {
  tab: OrderTab; rows: readonly AdminOrderRow[]; selected: readonly AdminOrderRow[]; query: ListQuery; perms: ListPerms;
  today: string; workshopUsers: WorkshopUser[]; allOnPage: boolean;
  onSelectPage: () => void; onClear: () => void; onResult: (t: ToastMessage) => void;
};

const refOf = (o: AdminOrderRow): OrderRef => ({
  type: o.type, id: o.id, isQuote: o.is_quote, delivered: o.da_giao, settled: o.da_tat_toan, hasJob: !!o.job_id,
});

export function OrdersToolbar({ tab, rows, selected, query, perms, today, workshopUsers, allOnPage, onSelectPage, onClear, onResult }: Props) {
  const exportIds = selected.filter((o) => !o.is_quote).map((o) => o.id);
  return (
    <div className={`${surfaceClass} flex flex-col gap-3 p-3 lg:flex-row lg:flex-wrap lg:items-center`}>
      {rows.length > 0 && (
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-medium text-pt-text">
          <input type="checkbox" className={checkboxClass} checked={allOnPage} onChange={onSelectPage} />
          {c.selectPage}
        </label>
      )}
      {selected.length > 0 && (
        <p role="status" className="flex flex-col text-sm">
          <span className="font-semibold text-pt-text">{format(l.selectedCount, { count: selected.length })}</span>
          <span className="tabular-nums text-pt-muted">{format(l.selectedDebt, { debt: formatVnd(selectedDebt(selected)) })}</span>
        </p>
      )}
      <div className="flex flex-wrap gap-2 lg:ml-auto">
        {selected.length > 0 && (
          <>
            <OrderActions
              items={selected.map(refOf)} workshopUsers={workshopUsers} today={today} onDone={onClear} onResult={onResult}
              can={{ status: perms.status, edit: perms.edit, create: perms.create, delete: perms.delete }}
            />
            <button type="button" onClick={onClear} className={buttonClass("ghost", "sm")}>{c.clearSelection}</button>
          </>
        )}
        {perms.export && (
          <Link href={exportHref(exportIds)} className={buttonClass("secondary", "sm")}>{l.exportDocs}</Link>
        )}
        <OrdersExcel tab={tab} selected={selected} query={query} perms={perms} onResult={onResult} />
      </div>
    </div>
  );
}
