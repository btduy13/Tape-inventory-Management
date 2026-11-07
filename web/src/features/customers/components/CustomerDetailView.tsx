// /admin/khach-hang/[id] body: edit the customer, every order of the 4 order tables (quotes too),
// web leads, and merge duplicates found with ?q=. Admin only: the page gates, the RPCs re-check.
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import type { LeadStatus } from "@/lib/types";
import { DataTable, type Column } from "@/features/portal-ui/components/DataTable";
import { FilterBar } from "@/features/portal-ui/components/FilterBar";
import { PageHeader, Section } from "@/features/portal-ui/components/Section";
import { ErrorState } from "@/features/portal-ui/components/States";
import { StatusBadge, ToneBadge } from "@/features/portal-ui/components/StatusBadge";
import { linkClass } from "@/features/portal-ui/components/styles";
import { parseListParams, type RawParams } from "@/features/portal-ui/lib/list-params";
import { dateTimeVn, instantVn, money, plain } from "@/features/admin-orders/lib/format";
import { orderHref } from "@/features/admin-orders/lib/paths";
import { TYPE_LABEL, customersCopy as c } from "../lib/copy";
import { CUSTOMERS_SPEC } from "../lib/list-spec";
import type { CustomerOrder } from "../lib/types";
import { getCustomer, listCustomers } from "../server/queries";
import { CustomerForm } from "./CustomerForm";
import { MergeForm } from "./MergeForm";

const columns: Column<CustomerOrder>[] = [
  { key: "order", header: c.colOrder, mobile: "title", cell: (o) => (
    <span className="flex min-w-0 flex-col">
      <span className="font-semibold">{o.ten_hang || "—"}</span>
      <span className="text-xs font-normal text-pt-muted">{o.id}</span>
    </span>
  ) },
  { key: "status", header: c.colStatus, mobile: "badge", cell: (o) => (
    <span className="flex flex-wrap gap-1">
      {o.is_quote ? <ToneBadge tone="blue">{c.quote}</ToneBadge> : (
        <>
          <ToneBadge tone={o.da_giao ? "green" : "yellow"}>{o.da_giao ? c.delivered : c.notDelivered}</ToneBadge>
          {o.da_tat_toan && <ToneBadge tone="green">{c.settled}</ToneBadge>}
        </>
      )}
    </span>
  ) },
  { key: "type", header: c.colType, cell: (o) => TYPE_LABEL[o.type] ?? o.type },
  { key: "date", header: c.colDate, className: "whitespace-nowrap", cell: (o) => dateTimeVn(o.thoi_gian) },
  { key: "total", header: c.colTotal, align: "end", className: "whitespace-nowrap", cell: (o) => money(o.tong_tien) },
  { key: "debt", header: c.colDebt, align: "end", className: "whitespace-nowrap", cell: (o) => (o.is_quote ? "—" : money(o.cong_no_khach)) },
];

export async function CustomerDetailView({ id, searchParams }: { id: string; searchParams: RawParams }) {
  const db = await createClient();
  const load = await getCustomer(db, id);
  if (!load.ok && load.reason === "not_found") notFound();
  if (!load.ok) return <ErrorState body={c.loadError} />;
  const { customer, orders, leads, totals } = load.detail;

  const search = parseListParams(CUSTOMERS_SPEC, searchParams);
  const found = search.q ? await listCustomers(db, search.q, { p_limit: 20, p_offset: 0 }) : null;
  const candidates = (found?.rows ?? []).filter((r) => r.id !== customer.id);

  return (
    <>
      <PageHeader
        title={customer.name}
        description={[customer.phone, customer.company].filter(Boolean).join(" · ") || undefined}
        breadcrumbs={[{ label: c.title, href: ROUTES.adminCustomers }, { label: customer.name }]}
      />

      <Section>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          {[[c.orderCount, plain(totals.order_count)], [c.colTotal, money(totals.tong_tien)], [c.colDebt, money(totals.cong_no_khach)]].map(([label, v]) => (
            <div key={label} className="flex flex-col gap-1 rounded-lg bg-pt-canvas p-3">
              <dt className="text-pt-muted">{label}</dt>
              <dd className="text-lg font-semibold tabular-nums text-pt-text">{v}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title={c.secOrders} variant="plain">
        <DataTable
          caption={c.secOrders}
          columns={columns}
          rows={orders}
          rowKey={(o) => `${o.type}:${o.id}`}
          rowHref={(o) => orderHref(o.type, o.id)}
          empty={{ title: c.noOrders }}
        />
      </Section>

      <Section title={c.secInfo}>
        <CustomerForm key={JSON.stringify(customer)} customer={customer} />
      </Section>

      {leads.length > 0 && (
        <Section title={c.secLeads}>
          <ul className="flex flex-col gap-2 text-sm">
            {leads.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-2">
                <Link href={ROUTES.adminLead(l.id)} className={linkClass}>{l.code}</Link>
                <StatusBadge status={l.status as LeadStatus} />
                <span className="text-pt-muted">{instantVn(l.created_at)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title={c.secMerge} description={c.mergeIntro}>
        <FilterBar basePath={ROUTES.adminCustomer(customer.id)} spec={CUSTOMERS_SPEC} state={search} searchPlaceholder={c.mergeSearch} />
        {found && <MergeForm target={customer.id} candidates={candidates} />}
      </Section>
    </>
  );
}
