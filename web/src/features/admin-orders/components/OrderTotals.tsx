"use client";
// Live totals of the order form (TS port of orderMath.js). Display only: the RPC recomputes and
// stores the real numbers.
import { formatVnd } from "@/i18n";
import { fieldLabel as f, ordersCopy as c } from "../lib/copy";
import type { OrderSummary } from "../lib/form-totals";

export function OrderTotals({ totals: t }: { totals: OrderSummary }) {
  const rows: [string, number | null, boolean?][] = [
    [f.don_gia_goc, t.costPrice],
    [f.thanh_tien_goc, t.costTotal],
    [f.thanh_tien_ban, t.saleTotal],
    [f.vat, t.vat],
    [f.truc_thanh_tien_ban, t.axisSaleTotal],
    [f.truc_vat, t.axisVat],
    [f.tong_cong, t.payable, true],
    [f.tien_coc, t.deposit],
    [f.cong_no_khach, t.outstanding, true],
    [f.tien_hoa_hong, t.commission],
    [f.loi_nhuan, t.profit],
    [f.loi_nhuan_rong, t.netProfit, true],
  ];
  return (
    <section aria-labelledby="order-totals-title" className="flex flex-col gap-3 rounded-xl border border-pt-line bg-pt-surface p-4">
      <div className="flex flex-col gap-0.5">
        <h2 id="order-totals-title" className="text-base font-semibold text-pt-text">{c.secTotals}</h2>
        <p className="text-xs text-pt-muted">{c.totalsHint}</p>
      </div>
      <dl aria-live="polite" className="flex flex-col gap-1.5 text-sm">
        {rows.flatMap(([label, value, strong]) => value === null ? [] : [(
          <div key={label} className={`flex items-baseline justify-between gap-3 ${strong ? "border-t border-pt-line pt-1.5 font-semibold" : ""}`}>
            <dt className={strong ? "text-pt-text" : "text-pt-muted"}>{label}</dt>
            <dd className={`tabular-nums ${value < 0 ? "text-pt-red-ink" : "text-pt-text"}`}>{formatVnd(value)}</dd>
          </div>
        )])}
      </dl>
      {t.errors.length > 0 && (
        <ul className="list-disc pl-5 text-xs text-pt-amber-ink">
          {t.errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
    </section>
  );
}
