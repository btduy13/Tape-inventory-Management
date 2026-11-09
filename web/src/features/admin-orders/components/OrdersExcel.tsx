"use client";
// Excel buttons of the list (app Thống kê): Xuất Excel (selected rows, or every row of the filter),
// Tải mẫu nhập Excel and Nhập đơn từ Excel (printed tape, plain tape, print axis). SheetJS is loaded
// only on click. Import: parse here, confirm, then importOrdersAction validates and creates.
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { format } from "@/i18n";
import { ConfirmDialog } from "@/features/portal-ui/components/ConfirmDialog";
import type { ToastMessage } from "@/features/portal-ui/components/Toast";
import { buttonClass } from "@/features/portal-ui/components/styles";
import { vnToday } from "@/features/workshop/lib/dates";
import { fetchAllRows, fetchFullRows, saveBlob, type ListQuery } from "../lib/browser-rpc";
import { fieldLabel, TYPE_LABEL } from "../lib/copy";
import { columnWidths, exportAoa } from "../lib/excel-export";
import { isImportType, parseImportSheet, templateAoa, type ImportRow, type ImportType } from "../lib/excel-import";
import { listCopy as l } from "../lib/list-copy";
import type { OrderTab } from "../lib/list-spec";
import type { ListPerms } from "../lib/perms";
import type { AdminOrderRow } from "../lib/types";
import { importOrdersAction } from "../server/list-actions";

type Props = {
  tab: OrderTab; selected: readonly AdminOrderRow[]; query: ListQuery; perms: ListPerms;
  onResult: (t: ToastMessage) => void;
};

const xlsx = () => import("xlsx");
const toast = (message: string, tone: ToastMessage["tone"]): ToastMessage => ({ id: Date.now(), message, tone });
const REQUIRED = ["ten_hang", "ten_khach_hang", "ngay_du_kien"] as const;

async function writeBook(sheets: [string, (string | number)[][], { wch: number }[]?][], name: string) {
  const X = await xlsx();
  const wb = X.utils.book_new();
  for (const [title, aoa, cols] of sheets) {
    const ws = X.utils.aoa_to_sheet(aoa);
    if (cols) ws["!cols"] = cols;
    X.utils.book_append_sheet(wb, ws, title.slice(0, 31));
  }
  const data = X.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  saveBlob(new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), name);
}

export function OrdersExcel({ tab, selected, query, perms, onResult }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, startBusy] = useTransition();
  const [pending, setPending] = useState<{ type: ImportType; rows: ImportRow[] } | null>(null);
  const importType = isImportType(tab) ? tab : null;

  const exportExcel = () => startBusy(async () => {
    const rows = selected.length > 0 ? [...selected] : await fetchAllRows(query);
    if (rows === null) return onResult(toast(l.excelLoadError, "error"));
    if (rows === "too_many") return onResult(toast(l.excelTooMany, "error"));
    if (rows.length === 0) return onResult(toast(l.excelEmpty, "error"));
    const full = await fetchFullRows(rows);
    if (!full) return onResult(toast(l.excelLoadError, "error"));
    // One sheet per order type (the app's columns differ by type; the quote tab can mix them).
    const types = [...new Set(rows.map((r) => r.type))];
    await writeBook(types.map((type) => {
      const aoa = exportAoa(full.filter((_, i) => rows[i]!.type === type), type, perms.money);
      return [types.length > 1 ? TYPE_LABEL[type] : l.excelSheet, aoa, columnWidths(aoa[0] as string[])];
    }), `don_hang_${tab}_${vnToday()}.xlsx`);
  });

  const template = (type: ImportType) => startBusy(async () => {
    const { data, guide } = templateAoa(type, vnToday());
    await writeBook([[TYPE_LABEL[type], data, columnWidths(data[0] as string[])], [l.excelGuideSheet, guide]], `mau_nhap_${type}.xlsx`);
  });

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !importType) return;
    startBusy(async () => {
      try {
        const X = await xlsx();
        const wb = X.read(await file.arrayBuffer(), { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]!];
        const aoa = ws ? X.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: "" }) : [];
        const { rows, detailLines } = parseImportSheet(importType, aoa);
        if (detailLines.length > 0) {
          return onResult(toast(detailLines.slice(0, 5).map((line) => format(l.importLine, { line, reason: l.importDetailRow })).join(" · "), "error"));
        }
        if (rows.length === 0) return onResult(toast(l.excelNoRows, "error"));
        if (rows.length > 500) return onResult(toast(l.excelTooManyRows, "error"));
        // Unknown headers / empty required cells: say so now, not after the confirm dialog.
        const bad = rows.filter((r) => REQUIRED.some((k) => !r.fields[k])).slice(0, 5);
        if (bad.length > 0) {
          const reason = format(l.importBadFields, { fields: REQUIRED.map((k) => fieldLabel[k]).join(", ") });
          return onResult(toast(bad.map((r) => format(l.importLine, { line: r.line, reason })).join(" · "), "error"));
        }
        setPending({ type: importType, rows });
      } catch {
        onResult(toast(l.excelReadError, "error"));
      }
    });
  };

  const runImport = () => {
    const job = pending;
    setPending(null);
    if (!job) return;
    startBusy(async () => {
      const r = await importOrdersAction(job);
      const message = r.ok || !r.errors ? r.message : `${r.message} ${r.errors.join(" · ")}`;
      onResult(toast(message, r.ok ? "success" : "error"));
      router.refresh();
    });
  };

  return (
    <>
      {perms.export && (
        <button type="button" disabled={busy} onClick={exportExcel} className={buttonClass("secondary", "sm")}>
          {busy ? l.excelBusy : selected.length > 0 ? l.excelExportSelected : l.excelExport}
        </button>
      )}
      {perms.create && importType && (
        <>
          <button type="button" disabled={busy} onClick={() => template(importType)} className={buttonClass("secondary", "sm")}>{l.excelTemplate}</button>
          <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className={buttonClass("secondary", "sm")}>{l.excelImport}</button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="sr-only" tabIndex={-1} aria-hidden onChange={onPick} />
        </>
      )}
      <ConfirmDialog
        open={!!pending}
        title={format(l.importConfirmTitle, { count: pending?.rows.length ?? 0, type: pending ? TYPE_LABEL[pending.type] : "" })}
        body={l.importConfirmBody}
        confirmLabel={l.importConfirm}
        onCancel={() => setPending(null)}
        onConfirm={runImport}
      />
    </>
  );
}
