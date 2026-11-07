// /admin KPI overview (server component): month sales, debt, deadlines, workshop pipeline.
// Admin pages only: shows revenue, profit and debt.
import { formatVnd, getDictionary } from "@/i18n";
import { ErrorState, Section, StatCard, StatGrid } from "@/features/portal-ui";
import { vndShort } from "@/features/admin-orders/lib/format";
import { dashboardCopy as c } from "../lib/copy";
import { OPEN_STEPS, ordersHref, type AdminDashboard as Data } from "../lib/dashboard";

const t = getDictionary();

export function AdminDashboard({ data }: { data: Data | null }) {
  if (!data) return <ErrorState body={c.loadError} />;
  const month: Record<string, string> = data.monthStart ? { from: data.monthStart } : {};
  // Same as OrdersView: short amount on the card ("125 tr"), the exact one in the hint (fits 375px).
  const moneyCard = (n: number, hint?: string) => {
    const exact = Math.abs(n) >= 1e6 ? formatVnd(n) : undefined;
    return { value: vndShort(n), hint: [exact, hint].filter(Boolean).join(" · ") || undefined };
  };
  return (
    <div className="flex flex-col gap-6">
      <Section id="kinh-doanh" title={c.title} description={c.description} variant="plain">
        <StatGrid>
          <StatCard label={c.orders} value={data.orders} href={ordersHref({ type: "all", ...month })} />
          <StatCard label={c.revenue} {...moneyCard(data.revenue, c.revenueHint)} href={ordersHref({ type: "all", ...month })} />
          <StatCard label={c.profit} {...moneyCard(data.profit)} tone={data.profit < 0 ? "red" : "green"} href={ordersHref({ type: "all", ...month })} />
          <StatCard label={c.openDebt} {...moneyCard(data.openDebt, c.debtHint)} tone="amber" href={ordersHref({ type: "all", settled: "0" })} />
          <StatCard label={c.supplierDebt} {...moneyCard(data.supplierDebt, c.debtHint)} href={ordersHref({ type: "all", settled: "0" })} />
          <StatCard label={c.overdue} value={data.overdue} tone={data.overdue > 0 ? "red" : undefined} hint={c.overdueHint} href={ordersHref({ type: "all", due: "overdue" })} />
          <StatCard label={c.dueSoon} value={data.dueSoon} tone={data.dueSoon > 0 ? "yellow" : undefined} hint={c.dueSoonHint} href={ordersHref({ type: "all", due: "soon" })} />
          <StatCard label={c.pendingQuotes} value={data.pendingQuotes} />
          <StatCard label={c.newLeads} value={data.newLeads} tone="blue" />
        </StatGrid>
      </Section>
      <Section id="xuong" title={c.pipelineTitle} variant="plain">
        <StatGrid>
          <StatCard label={c.notInWorkshop} value={data.notInWorkshop} tone={data.notInWorkshop > 0 ? "red" : undefined} hint={c.notInWorkshopHint} href={ordersHref({ step: "none", delivered: "0" })} />
          {OPEN_STEPS.map((s) => (
            <StatCard key={s} label={t.productionStep[s]} value={data.steps[s]} href={ordersHref({ step: s })} />
          ))}
        </StatGrid>
      </Section>
    </div>
  );
}
