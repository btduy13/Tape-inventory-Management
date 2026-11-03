"use client";
// Live totals of the order form (TS port of orderMath.calculatePrintedTape). Display only:
// admin_order_create recomputes and stores the real numbers.
import { fieldLabel as f, ordersCopy as c } from "../lib/copy";
import type { PrintedTapeResult } from "../lib/order-math";
import { money } from "../lib/format";

export function OrderTotals({ totals, axis }: { totals: PrintedTapeResult; axis: boolean }) {
  const p = totals.product;
  const rows: [string, number, boolean?][] = [
    [f.don_gia_goc, Math.round(p.costPrice)],
    [f.thanh_tien_goc, p.costTotal],
    [f.thanh_tien_ban, p.saleTotal],
    [f.vat, totals.vat],
    ...(axis ? ([[f.truc_thanh_tien_ban, totals.axis.saleTotal], [f.truc_vat, totals.axis.vat]] as [string, number][]) : []),
    [f.tong_cong, totals.combinedSaleTotal + totals.vat + totals.axis.vat, true],
    [f.tien_coc, totals.deposit],
    [f.cong_no_khach, totals.outstanding, true],
    [f.tien_hoa_hong, totals.combinedCommission],
    [f.loi_nhuan, totals.combinedProfit],
    [f.loi_nhuan_rong, totals.combinedNetProfit, true],
  ];
  return (
    <section aria-labelledby="order-totals-title" className="flex flex-col gap-3 rounded-xl border border-pt-line bg-pt-surface p-4">
      <div className="flex flex-col gap-0.5">
        <h2 id="order-totals-title" className="text-base font-semibold text-pt-text">{c.secTotals}</h2>
        <p className="text-xs text-pt-muted">{c.totalsHint}</p>
      </div>
      <dl aria-live="polite" className="flex flex-col gap-1.5 text-sm">
        {rows.map(([label, value, strong]) => (
          <div key={label} className={`flex items-baseline justify-between gap-3 ${strong ? "border-t border-pt-line pt-1.5 font-semibold" : ""}`}>
            <dt className={strong ? "text-pt-text" : "text-pt-muted"}>{label}</dt>
            <dd className={`tabular-nums ${value < 0 ? "text-pt-red-ink" : "text-pt-text"}`}>{money(value)}</dd>
          </div>
        ))}
      </dl>
      {!totals.valid && (
        <ul className="list-disc pl-5 text-xs text-pt-amber-ink">
          {totals.errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
    </section>
  );
}
