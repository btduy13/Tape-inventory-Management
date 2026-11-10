// 4 money KPIs of this month with a delta line vs last month. Neutral cards: only the delta is
// coloured, by good / bad (debt going up is bad). Exact amount in the native tooltip.
import Link from "next/link";
import { formatVnd } from "@/i18n";
import { surfaceClass } from "@/features/portal-ui";
import { vndShort } from "@/features/admin-orders/lib/format";
import { dashboardCopy as c } from "../../lib/copy";
import { delta, monthLabel, ordersHref, type Overview } from "../../lib/overview";

const pctFmt = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
const DELTA_TONE = { good: "text-pt-green-ink", bad: "text-pt-red-ink", neutral: "text-pt-muted" } as const;

/** cur: compared with prev (debts: new debt of this month, value is the whole open balance). */
type Kpi = { label: string; value: number; cur?: number; prev: number; upIsGood: boolean; href: string; vs: string; hint?: string };

function KpiCard({ k }: { k: Kpi }) {
  const d = delta(k.cur ?? k.value, k.prev, k.upIsGood);
  return (
    <Link href={k.href} title={formatVnd(Math.round(k.value))}
      className={`${surfaceClass} flex h-full min-w-0 flex-col gap-2 p-3 sm:p-4 transition-colors hover:border-pt-line-strong`}>
      <span className="text-sm text-pt-muted">{k.label}</span>
      <span className={`text-2xl font-bold leading-none tracking-tight sm:text-3xl ${k.value < 0 ? "text-pt-red-ink" : "text-pt-text"}`}>
        {vndShort(k.value)}
      </span>
      {d.pct === null ? (
        <span className="text-xs text-pt-muted">{c.noPrev}</span>
      ) : (
        <span className="text-xs text-pt-muted">
          <span className={`font-semibold ${DELTA_TONE[d.tone]}`}>
            {d.dir === "up" ? "▲" : d.dir === "down" ? "▼" : "="} {pctFmt.format(Math.abs(d.pct))}%
          </span>{" "}
          {k.vs}
        </span>
      )}
      {k.hint && <span className="text-xs text-pt-muted">{k.hint}</span>}
    </Link>
  );
}

export function MoneyKpis({ data }: { data: Overview }) {
  const { kpi } = data;
  const prev = monthLabel(data.prevMonthStart.slice(0, 7));
  const month = { type: "all", from: data.monthStart };
  const unsettled = { type: "all", settled: "0" };
  const items: Kpi[] = [
    { label: c.revenue, value: kpi.revenue, prev: kpi.revenuePrev, upIsGood: true, href: ordersHref(month), vs: c.vsPrev(prev) },
    { label: c.profit, value: kpi.profit ?? 0, prev: kpi.profitPrev ?? 0, upIsGood: true, href: ordersHref(month), vs: c.vsPrev(prev) },
    {
      label: c.customerDebt, value: kpi.customerDebt, cur: kpi.customerDebtNew, prev: kpi.customerDebtNewPrev, upIsGood: false, hint: c.debtHint,
      href: ordersHref({ ...unsettled, sort: "cong_no_khach", dir: "desc" }), vs: c.newDebtVsPrev(prev),
    },
    {
      label: c.supplierDebt, value: kpi.supplierDebt ?? 0, cur: kpi.supplierDebtNew ?? 0, prev: kpi.supplierDebtNewPrev ?? 0, upIsGood: false, hint: c.debtHint,
      href: ordersHref(unsettled), vs: c.newDebtVsPrev(prev),
    },
  ];
  return (
    <ul className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {items.map((k) => <li key={k.label} className="min-w-0"><KpiCard k={k} /></li>)}
    </ul>
  );
}
