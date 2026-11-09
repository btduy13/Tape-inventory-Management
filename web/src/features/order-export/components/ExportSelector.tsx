"use client";
// Step 1 of the export (exportManager.js selector): filter by year / month / type / text, pick orders.
// The selection lives in sessionStorage so it survives filter changes (the filters reload the page).
import Form from "next/form";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import { buttonClass, checkboxClass, inputClass } from "@/features/portal-ui/components/styles";
import { InlineStatus } from "@/features/portal-ui/components/States";
import { ORDER_TYPES } from "@/features/admin-orders/lib/types";
import { DOC_LABEL, DOC_TYPES, ORDER_TYPE_SHORT, exportCopy as c, type DocType } from "../lib/copy";
import type { PickerFilter, PickerRow } from "../lib/picker";

const STORE = "order-export:selection";
const MAX = 200;
const qtyFmt = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 });
const vnd = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });
const day = (v: string | null) => (v ? dateFmt.format(new Date(v)) : "—");

type Props = { rows: PickerRow[]; filter: PickerFilter; years: number[]; capped: boolean; action: string; doc: DocType };

// Selection store: sessionStorage (memory when blocked), read through useSyncExternalStore.
let memory = "[]";
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
function snapshot(): string {
  try { return sessionStorage.getItem(STORE) ?? "[]"; } catch { return memory; }
}
function writeStore(ids: string[]) {
  memory = JSON.stringify(ids);
  try { sessionStorage.setItem(STORE, memory); } catch { /* private mode: memory only */ }
  listeners.forEach((fn) => fn());
}
function parseIds(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function ExportSelector({ rows, filter, years, capped, action, doc: initialDoc }: Props) {
  const router = useRouter();
  const raw = useSyncExternalStore(subscribe, snapshot, () => "[]");
  const selected = useMemo(() => parseIds(raw), [raw]);
  const [doc, setDoc] = useState(initialDoc);
  const [error, setError] = useState<string | null>(null);

  function save(next: string[]) {
    writeStore(next);
    setError(next.length > MAX ? c.tooMany : null);
  }

  const visible = new Set(rows.map((r) => r.id));
  const hidden = selected.filter((id) => !visible.has(id)).length;
  const allOn = rows.length > 0 && rows.every((r) => selected.includes(r.id));
  const toggle = (id: string) => save(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const toggleAll = () =>
    save(allOn ? selected.filter((id) => !visible.has(id)) : [...new Set([...selected, ...rows.map((r) => r.id)])]);

  function next(ids = selected) {
    if (ids.length === 0) return setError(c.pickOne);
    if (ids.length > MAX) return setError(c.tooMany);
    router.push(`${action}?ids=${ids.map(encodeURIComponent).join(",")}&doc=${doc}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Loại chứng từ">
        {DOC_TYPES.map((d) => (
          <button key={d} type="button" aria-pressed={doc === d} onClick={() => setDoc(d)}
            className={buttonClass(doc === d ? "primary" : "secondary", "sm")}>
            {DOC_LABEL[d]}
          </button>
        ))}
      </div>

      <Form action={action} className="grid grid-cols-2 gap-2 sm:grid-cols-[auto_auto_auto_1fr_auto] sm:items-end">
        <input type="hidden" name="doc" value={doc} />
        <label className="flex flex-col gap-1 text-sm font-medium">
          {c.year}
          <select name="year" defaultValue={filter.year} className={inputClass}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          {c.month}
          <select name="month" defaultValue={filter.month ?? ""} className={inputClass}>
            <option value="">{c.allMonths}</option>
            {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          {c.type}
          <select name="loai" defaultValue={filter.type === "all" ? "" : filter.type} className={inputClass}>
            <option value="">{c.allTypes}</option>
            {ORDER_TYPES.map((t) => <option key={t} value={t}>{ORDER_TYPE_SHORT[t]}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          <span className="sr-only">{c.search}</span>
          <input type="search" name="q" defaultValue={filter.q} maxLength={100} placeholder={c.search} className={inputClass} />
        </label>
        <button type="submit" className={buttonClass("secondary", "md", "col-span-2 sm:col-span-1")}>{c.filter}</button>
      </Form>

      {capped && <p className="text-sm text-pt-muted">{c.capped}</p>}

      <div className="max-h-[60vh] overflow-auto rounded-xl border border-pt-line">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="sticky top-0 bg-pt-grey-tint text-left">
            <tr>
              <th className="w-10 px-2 py-2">
                <input type="checkbox" className={checkboxClass} aria-label={c.selectAll} checked={allOn} onChange={toggleAll} />
              </th>
              <th className="px-2 py-2 font-semibold">{c.colId}</th>
              <th className="px-2 py-2 font-semibold">{c.colDate}</th>
              <th className="px-2 py-2 font-semibold">{c.colName}</th>
              <th className="px-2 py-2 font-semibold">{c.colCustomer}</th>
              <th className="px-2 py-2 text-right font-semibold">{c.colQty}</th>
              <th className="px-2 py-2 text-right font-semibold">{c.colPrice}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="px-2 py-6 text-center text-pt-muted">{c.empty}</td></tr>}
            {rows.map((r) => {
              const on = selected.includes(r.id);
              return (
                <tr key={r.id} onClick={() => toggle(r.id)} onDoubleClick={() => next([...new Set([...selected, r.id])])}
                  className={`cursor-pointer border-t border-pt-line ${on ? "bg-vt-blue/10" : "hover:bg-pt-grey-tint"}`}>
                  <td className="px-2 py-2">
                    <input type="checkbox" className={checkboxClass} aria-label={r.id} checked={on}
                      onClick={(e) => e.stopPropagation()} onChange={() => toggle(r.id)} />
                  </td>
                  <td className="px-2 py-2 font-semibold whitespace-nowrap">{r.id}</td>
                  <td className="px-2 py-2 whitespace-nowrap">{day(r.thoi_gian)}</td>
                  <td className="px-2 py-2">{r.ten_hang}</td>
                  <td className="px-2 py-2">{r.ten_khach_hang}</td>
                  <td className="px-2 py-2 text-right whitespace-nowrap">
                    {qtyFmt.format(Number(r.so_luong ?? 0))}{r.type === "bang_keo" ? " KG" : " cuộn"}
                  </td>
                  <td className="px-2 py-2 text-right whitespace-nowrap">{vnd.format(Number(r.don_gia_ban ?? 0))}đ</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium" aria-live="polite">{c.selected(selected.length, hidden)}</span>
        {selected.length > 0 && (
          <button type="button" className={buttonClass("ghost", "sm")} onClick={() => save([])}>{c.clear}</button>
        )}
        <button type="button" className={buttonClass("primary", "md", "ml-auto")} onClick={() => next()}>{c.next}</button>
      </div>
      {error && <InlineStatus tone="error">{error}</InlineStatus>}
    </div>
  );
}
