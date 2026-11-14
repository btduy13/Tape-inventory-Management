"use client";
// Printed tape: "Trục đang nhập" ("Kê khai trục" + read-only "Kết quả trục") + "+ Thêm trục tiếp theo",
// and the axis tree of the open size (├─/└─ Trục i, Sửa moves it back to the inputs, Xóa) like
// quotations.js:457-534 and restructureQuoteForm.
import { buttonClass } from "@/features/portal-ui/components/styles";
import { money as vnd } from "@/features/admin-orders/lib/format";
import { buildAxis, type Fields } from "../lib/bundle";
import { AXIS_GROUPS, AXIS_RESULTS } from "../lib/layout";
import { InputGroups, labelOf, Results } from "./SizeFields";

type Props = {
  draft: Fields;
  saved: Fields[];
  error: string | null;
  /** orders.money: may see axis cost, commission and profit. */
  money: boolean;
  onDraft: (key: string, value: string) => void;
  onAdd: () => void;
  onEdit: (i: number) => void;
  onRemove: (i: number) => void;
};

export function AxisPanel({ draft, saved, error, money, onDraft, onAdd, onEdit, onRemove }: Props) {
  const d = buildAxis(draft);
  const results = {
    truc_thanh_tien_goc: d.costTotal ?? 0, truc_thanh_tien_ban: d.total, truc_tien_hoa_hong: d.commission ?? 0,
    truc_loi_nhuan: d.profit ?? 0, truc_loi_nhuan_rong: d.netProfit ?? 0,
  };
  return (
    <div className="flex flex-col gap-4">
      <InputGroups groups={AXIS_GROUPS} values={draft} label={labelOf} onChange={onDraft} />
      <Results title="Kết quả trục" description="Giá trị được tính riêng cho trục này." keys={AXIS_RESULTS} values={results} money={money} />
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
                      Chu vi {r.circumference ?? "-"} · SL {r.quantity} · {vnd(r.unitPrice)}/trục · VAT {r.vatPercent}% = {vnd(r.vat)} · Tổng {vnd(r.total + r.vat)}
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
