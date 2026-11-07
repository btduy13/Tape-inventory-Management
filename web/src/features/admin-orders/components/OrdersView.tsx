// /admin/don-hang body. The page calls requireRole(admin) first; rows and totals come from
// rpc('admin_orders_list') (admin-only in SQL), filtered, sorted and paged in SQL from whitelisted
// URL params. Tabs: the 4 order types + app quotes.
import Link from "next/link";
import { formatVnd, getDictionary } from "@/i18n";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import { FilterBar, type FilterControl } from "@/features/portal-ui/components/FilterBar";
import { PageHeader, Section, StatCard, StatGrid } from "@/features/portal-ui/components/Section";
import { buttonClass } from "@/features/portal-ui/components/styles";
import { listHref, parseListParams, patchListState, type RawParams } from "@/features/portal-ui/lib/list-params";
import { vnToday } from "@/features/workshop/lib/dates";
import { BOARD_STEPS } from "@/features/workshop/lib/steps";
import { listWorkshopUsers } from "@/features/workshop/server/queries";
import { TAB_LABEL, TYPE_LABEL, ordersCopy as c } from "../lib/copy";
import { vndShort } from "../lib/format";
import { ORDERS_SPEC, ORDER_TABS, tabOf, toOrdersQuery } from "../lib/list-spec";
import { newOrderHref, tabHref } from "../lib/paths";
import { listOrders } from "../server/queries";
import { OrdersAutoRefresh } from "./OrdersAutoRefresh";
import { OrdersTable } from "./OrdersTable";
import { PillNav } from "./badges";

const t = getDictionary();
const BASE = ROUTES.adminOrders;

export async function OrdersView({ searchParams }: { searchParams: RawParams }) {
  const state = parseListParams(ORDERS_SPEC, searchParams);
  const tab = tabOf(state);
  const quotes = tab === "quote";
  const db = await createClient();
  const [{ rows, totals, failed }, workshopUsers] = await Promise.all([listOrders(db, toOrdersQuery(state)), listWorkshopUsers(db)]);
  const filtered = !!state.q || Object.keys(state.filters).some((k) => k !== "type") || !!state.from || !!state.to;
  const newType = quotes || tab === "all" ? "bang_keo_in" : tab;
  const newButton = (
    <Link href={newOrderHref(newType, quotes)} className={buttonClass("primary")}>
      {quotes ? c.newQuoteButton : `${c.newButton} · ${TYPE_LABEL[newType]}`}
    </Link>
  );
  // Big amounts are shortened on the card ("25,4 tr"); the exact amount goes under it.
  const moneyCard = (n: number) => ({ value: vndShort(n), hint: Math.abs(n) >= 1e6 ? formatVnd(n) : undefined });
  const withDue = (due: "overdue" | "soon") => listHref(BASE, ORDERS_SPEC, patchListState(state, { filters: { ...state.filters, due: [due] } }));

  const controls: FilterControl[] = quotes ? [] : [
    ...(tab === "bang_keo_in" ? [{ kind: "select" as const, name: "step", label: c.filterStep, options: [
      ...BOARD_STEPS.map((s) => ({ value: s, label: t.productionStep[s] })),
      { value: "none", label: c.stepNone },
    ] }] : []),
    { kind: "select", name: "delivered", label: c.filterDelivered, options: [{ value: "1", label: c.delivered }, { value: "0", label: c.notDelivered }] },
    { kind: "select", name: "settled", label: c.filterSettled, options: [{ value: "1", label: c.settled }, { value: "0", label: c.notSettled }] },
    { kind: "select", name: "due", label: c.filterDue, options: [{ value: "overdue", label: c.dueOverdue }, { value: "soon", label: c.dueSoon }] },
  ];

  return (
    <>
      <OrdersAutoRefresh />
      <PageHeader title={c.title} description={c.intro} breadcrumbs={[{ label: c.title }]} actions={newButton} />
      <PillNav label={c.tabsLabel} current={tab} items={ORDER_TABS.map((k) => [k, TAB_LABEL[k], tabHref(k)] as const)} />
      {!failed && (
        <StatGrid>
          <StatCard label={c.sumCount} value={totals.count} />
          <StatCard label={c.sumTotal} {...moneyCard(totals.tongTien)} />
          {!quotes && <StatCard label={c.sumDebt} {...moneyCard(totals.congNoKhach)} tone="amber" />}
          {!quotes && <StatCard label={c.sumSupplier} {...moneyCard(totals.congNoNcc)} />}
          <StatCard label={c.sumProfit} {...moneyCard(totals.loiNhuanRong)} tone={totals.loiNhuanRong < 0 ? "red" : "green"} />
          {!quotes && <StatCard label={c.sumOverdue} value={totals.overdue} tone="red" href={withDue("overdue")} />}
          {!quotes && <StatCard label={c.sumSoon} value={totals.dueSoon} tone="amber" href={withDue("soon")} />}
        </StatGrid>
      )}
      <Section variant="plain">
        <FilterBar
          basePath={BASE}
          spec={ORDERS_SPEC}
          state={state}
          pinned={["type"]}
          searchPlaceholder={c.searchPlaceholder}
          dateRange
          dateLabel={c.dateLabel}
          controls={controls}
        />
        <OrdersTable
          tab={tab}
          rows={rows}
          state={state}
          total={totals.count}
          basePath={BASE}
          today={vnToday()}
          workshopUsers={workshopUsers}
          filtered={filtered}
          failed={failed}
          empty={{ title: quotes ? c.emptyQuotes : c.empty, body: c.emptyBody, action: newButton }}
        />
      </Section>
    </>
  );
}
