// /admin/khach-hang/gop body: old orders / leads the backfill could not match for sure
// (admin_customer_review_list). ?q= searches customers; hits are added to every row's picker.
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import { FilterBar } from "@/features/portal-ui/components/FilterBar";
import { Pagination } from "@/features/portal-ui/components/Pagination";
import { PageHeader, Section } from "@/features/portal-ui/components/Section";
import { EmptyState, ErrorState } from "@/features/portal-ui/components/States";
import { ToneBadge } from "@/features/portal-ui/components/StatusBadge";
import { surfaceClass } from "@/features/portal-ui/components/styles";
import { parseListParams, type RawParams } from "@/features/portal-ui/lib/list-params";
import { dateTimeVn } from "@/features/admin-orders/lib/format";
import { format } from "@/i18n";
import { TYPE_LABEL, customersCopy as c } from "../lib/copy";
import { CUSTOMERS_SPEC, pageArgs } from "../lib/list-spec";
import { listCustomers, listReview } from "../server/queries";
import { ReviewRowForm } from "./ReviewRowForm";

const BASE = ROUTES.adminCustomerReview;

export async function ReviewView({ searchParams }: { searchParams: RawParams }) {
  const state = parseListParams(CUSTOMERS_SPEC, searchParams);
  const db = await createClient();
  const [{ rows, total, failed }, found] = await Promise.all([
    listReview(db, pageArgs(state)),
    state.q ? listCustomers(db, state.q, { p_limit: 20, p_offset: 0 }) : null,
  ]);

  return (
    <>
      <PageHeader
        title={c.reviewTitle}
        description={c.reviewIntro}
        breadcrumbs={[{ label: c.title, href: ROUTES.adminCustomers }, { label: c.reviewTitle }]}
      />
      <Section variant="plain">
        <FilterBar basePath={BASE} spec={CUSTOMERS_SPEC} state={state} searchPlaceholder={c.reviewSearch} />
        <p className="text-xs text-pt-muted">{c.reviewSearchHint}</p>
        {failed ? <ErrorState body={c.reviewLoadError} /> : rows.length === 0 ? <EmptyState title={c.reviewEmpty} /> : (
          <ul aria-label={c.reviewCaption} className="flex flex-col gap-3">
            {rows.map((r) => (
              <li key={`${r.source_table}:${r.source_id}`} className={`${surfaceClass} grid grid-cols-1 gap-4 p-4 lg:grid-cols-2`}>
                <div className="flex min-w-0 flex-col gap-1 text-sm">
                  <span className="flex flex-wrap items-center gap-2">
                    <ToneBadge tone="blue">{TYPE_LABEL[r.order_type] ?? r.order_type}</ToneBadge>
                    <span className="font-semibold">{r.source_id}</span>
                    <span className="text-pt-muted">{dateTimeVn(r.thoi_gian)}</span>
                  </span>
                  <span className="break-words">{[r.ten_khach_hang, r.sdt_khach_hang].filter(Boolean).join(" · ") || "—"}</span>
                  {r.dia_chi_khach_hang && <span className="break-words text-pt-muted">{r.dia_chi_khach_hang}</span>}
                  <span className="text-pt-muted">{c.reviewReason}: {r.reason}</span>
                  {r.group_size > 1 && (
                    <span className="break-words font-medium">
                      {format(c.reviewGroup, { n: r.group_size })}: {r.group_ids.join(", ")}
                    </span>
                  )}
                </div>
                <ReviewRowForm row={r} found={found?.rows ?? []} />
              </li>
            ))}
          </ul>
        )}
        {total > 0 && <Pagination basePath={BASE} spec={CUSTOMERS_SPEC} state={state} total={total} />}
      </Section>
    </>
  );
}
