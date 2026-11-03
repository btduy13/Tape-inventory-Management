// /admin/don-hang body. The page calls requireRole(admin) first; rows come from
// rpc('admin_orders_list') (admin-only in SQL), filtered and paged in SQL from whitelisted URL params.
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import { DataTable, type Column } from "@/features/portal-ui/components/DataTable";
import { FilterBar } from "@/features/portal-ui/components/FilterBar";
import { PageHeader, Section } from "@/features/portal-ui/components/Section";
import { ToneBadge } from "@/features/portal-ui/components/StatusBadge";
import { buttonClass } from "@/features/portal-ui/components/styles";
import { parseListParams, type RawParams } from "@/features/portal-ui/lib/list-params";
import { STEP_LABEL, ordersCopy as c } from "../lib/copy";
import { dateTimeVn, dateVn, money, plain, toNumber } from "../lib/format";
import { ORDERS_SPEC, toOrdersFilter } from "../lib/list-spec";
import { ORDER_STEPS } from "../lib/types";
import { listOrders, type OrdersPage } from "../server/queries";
import { OrderStepBadge, OriginBadge } from "./badges";

const BASE = ROUTES.adminOrders;
type Row = OrdersPage["rows"][number];

const columns: Column<Row>[] = [
  { key: "order", header: c.colOrder, mobile: "title", cell: (o) => (
    <span className="flex min-w-0 flex-col">
      <span className="font-semibold">{o.ten_hang || "—"}</span>
      <span className="text-xs font-normal text-pt-muted">{o.id}</span>
    </span>
  ) },
  { key: "step", header: c.colStep, mobile: "badge", cell: (o) => (
    <span className="flex flex-col items-start gap-1">
      <OrderStepBadge step={o.step} />
      {o.job_id && !o.workshop_user_id && o.step !== "da_giao" && o.step !== "huy" && (
        <span className="text-xs text-pt-amber-ink">{c.unassigned}</span>
      )}
    </span>
  ) },
  { key: "customer", header: c.colCustomer, cell: (o) => (
    <span className="flex min-w-0 flex-col">
      <span>{o.ten_khach_hang || "—"}</span>
      {o.sdt_khach_hang && <span className="text-xs text-pt-muted">{o.sdt_khach_hang}</span>}
    </span>
  ) },
  { key: "date", header: c.colDate, className: "hidden lg:table-cell whitespace-nowrap", cell: (o) => dateTimeVn(o.thoi_gian) },
  { key: "due", header: c.colDue, className: "whitespace-nowrap", cell: (o) => dateVn(o.ngay_du_kien) },
  { key: "qty", header: c.colQty, align: "end", className: "hidden xl:table-cell", cell: (o) => plain(o.so_luong) },
  { key: "total", header: c.colTotal, align: "end", className: "whitespace-nowrap", cell: (o) => money(o.tong_tien) },
  { key: "debt", header: c.colDebt, align: "end", className: "whitespace-nowrap", cell: (o) =>
    o.da_tat_toan ? <ToneBadge tone="green">{c.settled}</ToneBadge> : money(o.cong_no_khach) },
  { key: "profit", header: c.colProfit, align: "end", className: "hidden xl:table-cell whitespace-nowrap", cell: (o) => (
    <span className={(toNumber(o.loi_nhuan_rong) ?? 0) < 0 ? "text-pt-red-ink" : ""}>{money(o.loi_nhuan_rong)}</span>
  ) },
  { key: "origin", header: c.colOrigin, className: "hidden lg:table-cell", cell: (o) => <OriginBadge origin={o.origin} /> },
];

export async function OrdersView({ searchParams }: { searchParams: RawParams }) {
  const state = parseListParams(ORDERS_SPEC, searchParams);
  const { rows, total, failed } = await listOrders(await createClient(), toOrdersFilter(state));
  const filtered = !!state.q || Object.keys(state.filters).length > 0 || !!state.from || !!state.to;
  const newButton = <Link href={ROUTES.adminOrderNew} className={buttonClass("primary")}>{c.newButton}</Link>;

  return (
    <>
      <PageHeader title={c.title} description={c.intro} breadcrumbs={[{ label: c.title }]} actions={newButton} />
      <Section variant="plain">
        <FilterBar
          basePath={BASE}
          spec={ORDERS_SPEC}
          state={state}
          searchPlaceholder={c.searchPlaceholder}
          dateRange
          dateLabel={c.dateLabel}
          controls={[
            { kind: "select", name: "step", label: c.filterStep, options: [
              ...ORDER_STEPS.map((s) => ({ value: s, label: STEP_LABEL[s] })),
              { value: "none", label: c.stepNone },
            ] },
            { kind: "select", name: "delivered", label: c.filterDelivered, options: [{ value: "1", label: c.delivered }, { value: "0", label: c.notDelivered }] },
            { kind: "select", name: "settled", label: c.filterSettled, options: [{ value: "1", label: c.settled }, { value: "0", label: c.notSettled }] },
          ]}
        />
        <DataTable
          caption={c.caption}
          columns={columns}
          rows={rows}
          rowKey={(o) => o.id}
          rowHref={(o) => ROUTES.adminOrder(o.id)}
          list={{ basePath: BASE, spec: ORDERS_SPEC, state, total }}
          filtered={filtered}
          empty={{ title: c.empty, body: c.emptyBody, action: newButton }}
          error={failed ? c.loadError : null}
        />
      </Section>
    </>
  );
}
