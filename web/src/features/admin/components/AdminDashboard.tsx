// /admin overview (server component). Main column: 4 money KPIs of the month, 12-month chart, two short
// tables. Rail (right from xl, on top below): what needs action today, workshop pipeline.
// Money (KPIs, chart, debtors) only with orders.money; the RPC nulls the cost side otherwise.
import { getDictionary } from "@/i18n";
import { ErrorState, Section } from "@/features/portal-ui";
import { SegmentBar, type Segment } from "@/features/portal-ui/components/SegmentBar";
import { dashboardCopy as c } from "../lib/copy";
import { PIPE_STEPS, pipelineHref, type Overview, type PipeStep } from "../lib/overview";
import { AttentionStrip } from "./overview/AttentionStrip";
import { MoneyKpis } from "./overview/MoneyKpis";
import { RevenueChart } from "./overview/RevenueChart";
import { DebtorsTable, OverdueTable } from "./overview/OverviewTables";

const t = getDictionary();

const PIPE_COLOR: Record<PipeStep, { fill: string; dot: string }> = {
  none: { fill: "fill-pt-red-ink", dot: "bg-pt-red-ink" },
  cho_san_xuat: { fill: "fill-pt-line-strong", dot: "bg-pt-line-strong" },
  dang_san_xuat: { fill: "fill-vt-blue", dot: "bg-vt-blue" },
  da_san_xuat: { fill: "fill-pt-yellow-ink", dot: "bg-pt-yellow-ink" },
  san_sang_giao: { fill: "fill-pt-green-ink", dot: "bg-pt-green-ink" },
};

export function AdminDashboard({ data }: { data: Overview | null }) {
  if (!data) return <ErrorState body={c.loadError} />;
  const segments: Segment[] = PIPE_STEPS.map((s) => ({
    key: s, label: s === "none" ? c.notInWorkshopStep : t.productionStep[s], value: data.pipeline[s], href: pipelineHref(s), ...PIPE_COLOR[s],
  }));
  const pipeTotal = segments.reduce((sum, s) => sum + s.value, 0);
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start [&>*]:min-w-0">
      {/* Rail: what to act on + the workshop. First on phones, right column from xl. */}
      <aside className="flex flex-col gap-5 xl:sticky xl:top-[4.75rem] xl:order-last">
        <AttentionStrip a={data.attention} />
        <Section id="xuong" title={c.pipelineTitle}>
          {pipeTotal === 0 ? <p className="text-sm text-pt-muted">{c.pipelineEmpty}</p> : (
            <SegmentBar stacked segments={segments} label={c.pipelineLabel(segments.map((s) => `${s.label} ${s.value}`).join(", "))} />
          )}
        </Section>
      </aside>
      <div className="flex flex-col gap-5">
        {data.money && (
          <section aria-labelledby="kinh-doanh-title" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id="kinh-doanh-title" className="text-base font-semibold text-pt-text">{c.kpiTitle(`${Number(data.monthStart.slice(5, 7))}/${data.monthStart.slice(0, 4)}`)}</h2>
              <p className="text-xs text-pt-muted">{c.kpiNote}</p>
            </div>
            <MoneyKpis data={data} />
          </section>
        )}
        {data.money && (
          <Section id="doanh-thu" title={c.chartTitle} description={c.chartDesc}>
            <RevenueChart months={data.months} money={data.money} />
          </Section>
        )}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 [&>*]:min-w-0">
          <OverdueTable rows={data.overdueList} />
          {data.money && <DebtorsTable rows={data.topDebtors} />}
        </div>
      </div>
    </div>
  );
}
