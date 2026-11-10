// "Báo giá" list: status tabs (?tab=), search + type + month (admin_quotes_list, 0032), then one
// row per quote (table on >= md, cards on phones). Sizes / axes are a summary chip here; the tree
// is on the detail page. Server component.
import Link from "next/link";
import { format, getDictionary } from "@/i18n";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import { DataTable, type Column } from "@/features/portal-ui/components/DataTable";
import { FilterBar, type FilterControl } from "@/features/portal-ui/components/FilterBar";
import { buttonClass } from "@/features/portal-ui/components/styles";
import { listHref, pageSlice, parseListParams, patchListState, type ListState, type RawParams } from "@/features/portal-ui/lib/list-params";
import { PillNav } from "@/features/admin-orders/components/badges";
import { dateVn, money } from "@/features/admin-orders/lib/format";
import { MONTHS, QUOTE_LIST_TYPES, QUOTES_SPEC, quoteStatus, sizeSummary, splitByTab, type QuoteStatus } from "../lib/list";
import { newQuoteHref, quotePrintHref } from "../lib/paths";
import { grandTotal, monthRange, normalizeItems, type QuoteRow } from "../lib/stored";
import { listQuotes } from "../server/queries";
import { QuoteRowActions, type QuoteCan } from "./QuoteRowActions";
import { QuoteStatusBadge, STATUS_LABEL, typeShort } from "./QuoteStatusBadge";

const c = getDictionary().baoGia;
const BASE = ROUTES.adminQuotes;

type Row = { key: string; type: string; id: string; quote: QuoteRow; summary: string; total: number; status: QuoteStatus };

const text = (v: unknown) => (v === null || v === undefined ? "" : String(v));

export async function QuotesView({ searchParams, can }: { searchParams: RawParams; can: QuoteCan }) {
  const state = parseListParams(QUOTES_SPEC, searchParams);
  const type = state.filters.type?.[0] ?? "all";
  const month = Number(state.filters.month?.[0] ?? 0);
  const [from, to] = month ? monthRange(month) : [null, null];
  const listed = await listQuotes(await createClient(), { type, q: state.q, from, to });

  const rows: Row[] = (listed ?? []).map(({ type: t, quote }) => {
    const items = normalizeItems(quote, t);
    const id = text(quote.id);
    return { key: `${t}:${id}`, type: t, id, quote, summary: sizeSummary(items), total: grandTotal(items), status: quoteStatus(quote) };
  });
  const { counts, tab, shown } = splitByTab(rows, state);
  const tabHref = (k: string) =>
    listHref(BASE, QUOTES_SPEC, patchListState(state, { filters: { ...state.filters, tab: k === "all" ? [] : [k] } }));
  const filtered = !!state.q || type !== "all" || month > 0;
  const anyQuote = counts.all > 0 || filtered;

  const controls: FilterControl[] = [
    { kind: "select", name: "type", label: c.filterType, options: QUOTE_LIST_TYPES.map((t) => ({ value: t, label: typeShort(t) })) },
    { kind: "select", name: "month", label: c.filterMonth, options: MONTHS.map((m) => ({ value: m, label: format(c.month, { n: m }) })) },
  ];

  const columns: Column<Row>[] = [
    {
      key: "customer", header: c.colCustomer, mobile: "title", cell: (r) => (
        <span className="inline-flex flex-wrap items-baseline gap-x-2 lg:flex-nowrap lg:whitespace-nowrap">
          <span>{text(r.quote.ten_khach_hang) || c.noCustomer}</span>
          {text(r.quote.sdt_khach_hang) && <span className="text-xs font-normal text-pt-muted tabular-nums">{text(r.quote.sdt_khach_hang)}</span>}
        </span>
      ),
    },
    { key: "product", header: c.colProduct, className: "lg:whitespace-nowrap", cell: (r) => text(r.quote.ten_hang) || "—" },
    { key: "type", header: c.colType, className: "whitespace-nowrap", cell: (r) => typeShort(r.type) },
    {
      key: "scope", header: c.colScope, className: "whitespace-nowrap", cell: (r) => (
        <span className="inline-flex rounded-md bg-pt-grey-tint px-2 py-0.5 text-xs font-medium text-pt-grey-ink tabular-nums">{r.summary}</span>
      ),
    },
    { key: "total", header: c.colTotal, align: "end", className: "whitespace-nowrap tabular-nums font-semibold", cell: (r) => money(r.total) },
    { key: "created", header: c.colCreated, className: "whitespace-nowrap tabular-nums text-pt-muted", cell: (r) => dateVn(r.quote.thoi_gian) },
    { key: "code", header: c.colCode, className: "hidden whitespace-nowrap text-xs text-pt-muted 2xl:table-cell", cell: (r) => r.id },
    { key: "status", header: c.colStatus, mobile: "badge", cell: (r) => <QuoteStatusBadge status={r.status} /> },
    { key: "actions", header: c.colActions, className: "whitespace-nowrap", cell: (r) => <QuoteRowActions type={r.type} id={r.id} can={can} /> },
  ];

  const create = can.convert ? <Link href={newQuoteHref("bang_keo_in")} className={buttonClass("primary")}>{c.create}</Link> : undefined;
  const clear = <Link href={tab === "all" ? BASE : tabHref(tab)} className={buttonClass("secondary")}>{getDictionary().portalUi.clearFilters}</Link>;

  return (
    <div className="flex flex-col gap-4">
      {anyQuote && (
        <>
          <PillNav
            label={c.tabsLabel}
            current={tab}
            items={(["all", "chua_gui", "da_gui"] as const).map((k) => [k, `${k === "all" ? c.tabAll : STATUS_LABEL[k]} · ${counts[k]}`, tabHref(k)] as const)}
          />
          <FilterBar basePath={BASE} spec={QUOTES_SPEC} state={state} controls={controls} searchPlaceholder={c.searchPlaceholder} pinned={["tab"]} />
        </>
      )}
      <DataTable
        caption={c.caption}
        columns={columns}
        rows={pageSlice(shown, state)}
        rowKey={(r) => r.key}
        rowHref={(r) => quotePrintHref(r.type, r.id)}
        list={shown.length > state.pageSize ? { basePath: BASE, spec: QUOTES_SPEC, state: state as ListState, total: shown.length } : undefined}
        error={listed === null ? c.loadError : null}
        filtered={filtered}
        empty={
          filtered ? { action: clear }
          : counts.all > 0 ? { title: c.emptyTab }
          : { title: c.emptyTitle, body: c.emptyBody, action: create }
        }
      />
      {shown.length > 0 && <p className="text-xs text-pt-muted">{format(c.count, { count: shown.length })}</p>}
    </div>
  );
}
