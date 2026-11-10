"use client";
// Live totals of the order form (TS port of orderMath.js), in the bottom bar next to the save button.
// Display only: the RPC recomputes and stores the real numbers.
import { formatVnd } from "@/i18n";
import { fieldLabel as f, ordersCopy as c } from "../lib/copy";
import type { OrderSummary } from "../lib/form-totals";

export function OrderTotals({ totals: t, money = true }: { totals: OrderSummary; money?: boolean }) {
  // Line amounts are shown inline in the form cards; this keeps what the customer pays and the result.
  // Phones show only the strong ones (total, debt, profit).
  const rows: [string, number | null, boolean?][] = [
    [f.thanh_tien_ban, t.saleTotal],
    [f.truc_thanh_tien_ban, t.axisSaleTotal],
    [f.vat, t.vat + (t.axisVat ?? 0)],
    [f.tong_cong, t.payable, true],
    [f.tien_coc, t.deposit],
    [f.cong_no_khach, t.outstanding, true],
    [f.loi_nhuan_rong, money ? t.netProfit : null, true],
  ];
  return (
    <section aria-labelledby="order-totals-title" className="flex min-w-0 flex-col gap-1">
      <h2 id="order-totals-title" className="sr-only">{c.secTotals}</h2>
      <dl aria-live="polite" title={c.totalsHint} className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {rows.flatMap(([label, value, strong]) => value === null ? [] : [(
          <div key={label} className={`flex-col gap-0.5 ${strong ? "flex" : "hidden lg:flex"}`}>
            <dt className="text-xs text-pt-muted">{label}</dt>
            <dd className={`tabular-nums ${strong ? "text-base font-bold" : "font-medium"} ${value < 0 ? "text-pt-red-ink" : "text-pt-text"}`}>{formatVnd(value)}</dd>
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
