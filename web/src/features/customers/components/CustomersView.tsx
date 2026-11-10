// /admin/khach-hang body: searchable, paged customer list (admin_customers_list, admin-only in SQL)
// with order count, sales and debt, plus the create form.
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import { DataTable, type Column } from "@/features/portal-ui/components/DataTable";
import { FilterBar } from "@/features/portal-ui/components/FilterBar";
import { PageHeader, Section } from "@/features/portal-ui/components/Section";
import { buttonClass } from "@/features/portal-ui/components/styles";
import { parseListParams, type RawParams } from "@/features/portal-ui/lib/list-params";
import { dateTimeVn, money, plain, toNumber } from "@/features/admin-orders/lib/format";
import { format } from "@/i18n";
import { customersCopy as c } from "../lib/copy";
import { CUSTOMERS_SPEC, pageArgs } from "../lib/list-spec";
import type { CustomerRow } from "../lib/types";
import { listCustomers, listReview } from "../server/queries";
import { CustomerForm } from "./CustomerForm";

const BASE = ROUTES.adminCustomers;

const columns: Column<CustomerRow>[] = [
  { key: "name", header: c.colName, mobile: "title", cell: (r) => (
    <span className="flex min-w-0 flex-col">
      <span className="font-semibold">{r.name}</span>
      {r.company && <span className="text-xs font-normal text-pt-muted">{r.company}</span>}
    </span>
  ) },
  { key: "phone", header: c.colPhone, className: "whitespace-nowrap", cell: (r) => r.phone || "—" },
  { key: "orders", header: c.colOrders, align: "end", cell: (r) => plain(r.order_count) },
  { key: "total", header: c.colTotal, align: "end", className: "hidden lg:table-cell whitespace-nowrap", cell: (r) => money(r.tong_tien) },
  { key: "debt", header: c.colDebt, align: "end", className: "whitespace-nowrap", cell: (r) => (
    <span className={(toNumber(r.cong_no_khach) ?? 0) > 0 ? "font-semibold text-pt-red-ink" : ""}>{money(r.cong_no_khach)}</span>
  ) },
  { key: "last", header: c.colLast, className: "hidden lg:table-cell whitespace-nowrap", cell: (r) => dateTimeVn(r.last_order_at) },
];

export async function CustomersView({ searchParams }: { searchParams: RawParams }) {
  const state = parseListParams(CUSTOMERS_SPEC, searchParams);
  const db = await createClient();
  const { rows, total, sumDebt, failed } = await listCustomers(db, state.q, pageArgs(state));
  const review = <Link href={ROUTES.adminCustomerReview} className={buttonClass("secondary")}>{c.reviewButton}</Link>;
  // No customer yet: point at the review queue (customers are only created from there or by hand).
  const queue = !failed && total === 0 && !state.q ? await listReview(db, { p_limit: 1, p_offset: 0 }) : null;
  const pending = queue && !queue.failed && queue.total > 0 ? { groups: queue.total, rows: queue.totalRows } : null;

  return (
    <>
      <PageHeader title={c.title} description={c.intro} breadcrumbs={[{ label: c.title }]} actions={review} />
      <Section variant="plain">
        <FilterBar basePath={BASE} spec={CUSTOMERS_SPEC} state={state} searchPlaceholder={c.searchPlaceholder} />
        {!failed && total > 0 && (
          <p className="text-sm text-pt-muted">
            {c.totalDebt}: <span className="font-semibold tabular-nums text-pt-text">{money(sumDebt)}</span>
          </p>
        )}
        <DataTable
          caption={c.caption}
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          rowHref={(r) => ROUTES.adminCustomer(r.id)}
          list={{ basePath: BASE, spec: CUSTOMERS_SPEC, state, total }}
          filtered={!!state.q}
          empty={pending ? {
            title: format(c.pendingTitle, pending),
            body: format(c.pendingBody, pending),
            action: <Link href={ROUTES.adminCustomerReview} className={buttonClass("primary")}>{format(c.pendingAction, pending)}</Link>,
          } : { title: c.empty, body: c.emptyBody }}
          error={failed ? c.loadError : null}
        />
      </Section>
      <Section title={c.newButton}>
        <CustomerForm />
      </Section>
    </>
  );
}
