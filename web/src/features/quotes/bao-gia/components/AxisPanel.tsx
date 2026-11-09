"use client";
// Printed tape: "Trục đang nhập" + "+ Thêm trục tiếp theo", and the axis tree of the open size
// (├─/└─ Trục i, Sửa moves it back to the inputs, Xóa) like quotations.js:457-534.
import { buttonClass, inputClass } from "@/features/portal-ui/components/styles";
import { money } from "@/features/admin-orders/lib/format";
import { buildAxis, type Fields } from "../lib/bundle";
import { AXIS_KEYS } from "../lib/schema";
import { labelOf } from "./SizeFields";

const LABEL: Record<string, string> = { ten_truc: "Tên trục", truc_chu_vi: "Chu vi" };

type Props = {
  draft: Fields;
  saved: Fields[];
  error: string | null;
  onDraft: (key: string, value: string) => void;
  onAdd: () => void;
  onEdit: (i: number) => void;
  onRemove: (i: number) => void;
};

export function AxisPanel({ draft, saved, error, onDraft, onAdd, onEdit, onRemove }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {AXIS_KEYS.map((key) => (
          <label key={key} className="flex flex-col gap-1.5 text-sm font-medium text-pt-text">
            {LABEL[key] ?? labelOf(key)}
            <input
              className={inputClass}
              value={draft[key] ?? ""}
              inputMode={key === "ten_truc" || key === "truc_ctv" ? undefined : "decimal"}
              onChange={(e) => onDraft(key, e.target.value)}
            />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onAdd} className={buttonClass("secondary", "sm")}>+ Thêm trục tiếp theo</button>
        {error && <p role="alert" className="text-sm font-medium text-pt-red-ink">{error}</p>}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-pt-text">Danh sách trục của kích thước này</h3>
        {saved.length === 0 ? (
          <p className="mt-1 text-sm text-pt-muted">Chưa có trục nào.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {saved.map((a, i) => {
              const r = buildAxis(a);
              return (
                <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-pt-line p-2">
                  <div className="min-w-0 text-sm">
                    <p className="font-semibold text-pt-text">{i === saved.length - 1 ? "└─" : "├─"} Trục {i + 1}: {r.name}</p>
                    <p className="text-pt-muted">
                      Chu vi {r.circumference ?? "-"} · SL {r.quantity} · {money(r.unitPrice)}/trục · VAT {r.vatPercent}% = {money(r.vat)} · Tổng {money(r.total + r.vat)}
                    </p>
                  </div>
                  <span className="flex gap-2">
                    <button type="button" onClick={() => onEdit(i)} className={buttonClass("ghost", "sm")}>Sửa</button>
                    <button type="button" onClick={() => onRemove(i)} className={buttonClass("ghost", "sm", "text-pt-red-ink")}>Xóa</button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
