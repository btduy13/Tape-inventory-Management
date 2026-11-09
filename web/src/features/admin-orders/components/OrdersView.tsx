// /admin/don-hang body, the app's Thống kê (thongke.js): 5 KPI cards over every order (admin_orders_totals,
// quotes excluded, not polled), type tabs, the app's filters, then the list (admin_orders_list, filtered,
// sorted and paged in SQL from whitelisted URL params). The page passes the user's order permissions.
import Link from "next/link";
import { format, formatVnd, getDictionary } from "@/i18n";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import { FilterBar, type FilterControl } from "@/features/portal-ui/components/FilterBar";
import { PageHeader, Section, StatCard, StatGrid } from "@/features/portal-ui/components/Section";
import { buttonClass } from "@/features/portal-ui/components/styles";
import { parseListParams, type RawParams } from "@/features/portal-ui/lib/list-params";
import { vnToday } from "@/features/workshop/lib/dates";
import { BOARD_STEPS } from "@/features/workshop/lib/steps";
import { listWorkshopUsers } from "@/features/workshop/server/queries";
import { TAB_LABEL, TYPE_LABEL, ordersCopy as c } from "../lib/copy";
import { vndShort } from "../lib/format";
import { listCopy as l } from "../lib/list-copy";
import { LIST_TABS, MONTHS, ORDERS_SPEC, tabOf, toOrdersQuery } from "../lib/list-spec";
import { newOrderHref, tabHref } from "../lib/paths";
import type { ListPerms } from "../lib/perms";
import { getOrdersTotals, listOrders } from "../server/queries";
import { OrdersTable } from "./OrdersTable";
import { PillNav } from "./badges";

const t = getDictionary();
const BASE = ROUTES.adminOrders;

export async function OrdersView({ searchParams, perms }: { searchParams: RawParams; perms: ListPerms }) {
  const state = parseListParams(ORDERS_SPEC, searchParams);
  const tab = tabOf(state);
  const today = vnToday();
  const query = toOrdersQuery(state, { today, money: perms.money });
  const db = await createClient();
  const [{ rows, totals, failed }, kpi, workshopUsers] = await Promise.all([
    listOrders(db, query),
    getOrdersTotals(db, { type: "all", filter: { sort: "thoi_gian", dir: "desc", limit: 1, offset: 0 } }),
    // Only for "Đưa vào xưởng" (printed tape, orders.edit).
    tab === "bang_keo_in" && perms.edit ? listWorkshopUsers(db) : Promise.resolve([]),
  ]);
  const filtered = !!state.q || Object.keys(state.filters).some((k) => k !== "type") || !!state.from || !!state.to;
  const newType = tab === "quote" || tab === "all" ? "bang_keo_in" : tab;
  const newButton = perms.create ? (
    <Link href={newOrderHref(newType)} className={buttonClass("primary")}>{`${c.newButton} · ${TYPE_LABEL[newType]}`}</Link>
  ) : null;
  // Short amount on the card ("25,4 tr"), exact amount in the hint.
  const hint = (text: string, n: number) => `${text} · ${formatVnd(n)}`;

  const controls: FilterControl[] = [
    { kind: "select", name: "month", label: l.filterMonth, options: MONTHS.map((m) => ({ value: m, label: format(l.month, { n: m }) })) },
    { kind: "select", name: "due", label: l.filterDue, options: [{ value: "soon", label: c.dueSoon }, { value: "overdue", label: c.dueOverdue }] },
    { kind: "select", name: "settled", label: l.filterSettled, options: [{ value: "0", label: c.notSettled }, { value: "1", label: c.settled }] },
    { kind: "select", name: "delivered", label: c.filterDelivered, options: [{ value: "1", label: c.delivered }, { value: "0", label: c.notDelivered }] },
    ...(tab === "bang_keo_in" ? [{ kind: "select" as const, name: "step", label: c.filterStep, options: [
      ...BOARD_STEPS.map((s) => ({ value: s, label: t.productionStep[s] })),
      { value: "none", label: c.stepNone },
    ] }] : []),
    ...(perms.money ? [{ kind: "text" as const, name: "ctv", label: l.filterCtv, placeholder: l.ctvPlaceholder }] : []),
  ];

  return (
    <>
      <PageHeader title={c.title} breadcrumbs={[{ label: c.title }]} actions={newButton} />
      {kpi && (
        <StatGrid>
          <StatCard label={l.kpiWarn} value={kpi.dueSoon + kpi.overdue} tone="red" hint={format(l.kpiWarnHint, { soon: kpi.dueSoon, overdue: kpi.overdue })} />
          <StatCard label={l.kpiState} value={kpi.unsettled} tone="amber" hint={format(l.kpiStateHint, { n: kpi.settled })} />
          <StatCard label={l.kpiDebt} value={vndShort(kpi.congNoKhach)} tone="blue" hint={hint(l.kpiDebtHint, kpi.congNoKhach)} />
          {kpi.money && (
            <StatCard label={l.kpiSupplier} value={vndShort(kpi.congNoNcc)} tone="amber" hint={hint(l.kpiSupplierHint, kpi.congNoNcc)} />
          )}
          {kpi.money && (
            <StatCard label={l.kpiProfit} value={vndShort(kpi.loiNhuanRong)} tone={kpi.loiNhuanRong < 0 ? "red" : "green"} hint={hint(l.kpiProfitHint, kpi.loiNhuanRong)} />
          )}
        </StatGrid>
      )}
      <PillNav label={c.tabsLabel} current={tab} items={LIST_TABS.map((k) => [k, TAB_LABEL[k], tabHref(k)] as const)} />
      <Section variant="plain">
        <FilterBar
          basePath={BASE}
          spec={ORDERS_SPEC}
          state={state}
          pinned={["type"]}
          searchPlaceholder={l.searchPlaceholder}
          dateRange
          dateLabel={l.dateLabel}
          controls={controls}
        />
        <OrdersTable
          tab={tab}
          rows={rows}
          state={state}
          query={query}
          total={totals.count}
          basePath={BASE}
          today={today}
          perms={perms}
          workshopUsers={workshopUsers}
          filtered={filtered}
          failed={failed}
          empty={{ title: c.empty, body: c.emptyBody, action: newButton }}
        />
      </Section>
    </>
  );
}
