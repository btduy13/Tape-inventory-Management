// 12-month revenue (stacked by order type, fixed colours) + net profit line. Desktop shows 12 months,
// phones the last 6 (simpler, no horizontal scroll). Numbers also in a <details> table.
import { formatVnd } from "@/i18n";
import { BarChart, type BarRow, type BarSeries } from "@/features/portal-ui/components/BarChart";
import { TYPE_LABEL } from "@/features/admin-orders/lib/copy";
import { dashboardCopy as c } from "../../lib/copy";
import { CHART_TYPES, monthLabel, type MonthRow } from "../../lib/overview";

const FILL = { bang_keo_in: "fill-pt-cat-bki", truc_in: "fill-pt-cat-truc", bang_keo: "fill-pt-cat-bk", thank_you: "fill-pt-cat-ty" } as const;
const DOT = { bang_keo_in: "bg-pt-cat-bki", truc_in: "bg-pt-cat-truc", bang_keo: "bg-pt-cat-bk", thank_you: "bg-pt-cat-ty" } as const;
const SERIES: BarSeries[] = CHART_TYPES.map((t) => ({ key: t, label: TYPE_LABEL[t], className: FILL[t] }));

const total = (m: MonthRow) => CHART_TYPES.reduce((s, t) => s + m[t], 0);
const vnd = (v: number) => formatVnd(Math.round(v));

function toRow(m: MonthRow, money: boolean): BarRow {
  const lines = [`${c.month} ${m.month.slice(5)}/${m.month.slice(0, 4)}`, `${c.total}: ${vnd(total(m))}`,
    ...CHART_TYPES.filter((t) => m[t]).map((t) => `${TYPE_LABEL[t]}: ${vnd(m[t])}`),
    ...(money && m.profit !== null ? [`${c.profitLine}: ${vnd(m.profit)}`] : [])];
  return { label: monthLabel(m.month), title: lines.join("\n"), values: Object.fromEntries(CHART_TYPES.map((t) => [t, m[t]])), line: money ? m.profit : null };
}

export function RevenueChart({ months, money }: { months: readonly MonthRow[]; money: boolean }) {
  const rows = months.map((m) => toRow(m, money));
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-pt-muted">
        {CHART_TYPES.map((t) => (
          <li key={t} className="flex items-center gap-1.5"><span aria-hidden className={`size-2.5 rounded-sm ${DOT[t]}`} />{TYPE_LABEL[t]}</li>
        ))}
        {money && (
          <li className="flex items-center gap-1.5"><span aria-hidden className="h-0.5 w-4 rounded bg-pt-text" />{c.profitLine}</li>
        )}
      </ul>
      <BarChart series={SERIES} rows={rows} label={c.chartLabel} className="hidden sm:block" />
      <BarChart series={SERIES} rows={rows.slice(-6)} label={c.chartLabel} width={320} height={220} className="sm:hidden" />
      <details className="text-sm">
        <summary className="inline-flex min-h-11 cursor-pointer items-center font-medium text-vt-blue">{c.showData}</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="text-pt-muted">
              <tr>
                <th scope="col" className="py-1.5 pr-3 text-left font-medium">{c.month}</th>
                {CHART_TYPES.map((t) => <th key={t} scope="col" className="px-2 py-1.5 font-medium">{TYPE_LABEL[t]}</th>)}
                <th scope="col" className="px-2 py-1.5 font-medium">{c.total}</th>
                {money && <th scope="col" className="pl-2 py-1.5 font-medium">{c.profitLine}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-pt-line">
              {months.map((m) => (
                <tr key={m.month}>
                  <th scope="row" className="py-1.5 pr-3 text-left font-medium">{m.month.slice(5)}/{m.month.slice(0, 4)}</th>
                  {CHART_TYPES.map((t) => <td key={t} className="px-2 py-1.5">{vnd(m[t])}</td>)}
                  <td className="px-2 py-1.5 font-semibold">{vnd(total(m))}</td>
                  {money && <td className={`pl-2 py-1.5 ${(m.profit ?? 0) < 0 ? "text-pt-red-ink" : ""}`}>{vnd(m.profit ?? 0)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
