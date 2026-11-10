// /admin/khach-hang/gop body: old orders / leads the backfill could not match for sure
// (admin_customer_review_list), one item per name group, bulk create + undo (0036).
// ?q= searches customers; hits are added to every group's "ghép vào khách có sẵn" picker.
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import { FilterBar } from "@/features/portal-ui/components/FilterBar";
import { PageHeader, Section, StatCard, StatGrid } from "@/features/portal-ui/components/Section";
import { ErrorState } from "@/features/portal-ui/components/States";
import { parseListParams, type RawParams } from "@/features/portal-ui/lib/list-params";
import { format } from "@/i18n";
import { customersCopy as c } from "../lib/copy";
import { CUSTOMERS_SPEC } from "../lib/list-spec";
import { listCustomers, listReview } from "../server/queries";
import { ReviewGroups } from "./ReviewGroups";

const BASE = ROUTES.adminCustomerReview;
// shortcut: one page of the 200 biggest groups (SQL max) so "Chọn tất cả" covers the queue; page if it grows past that.
const LIMIT = 200;

export async function ReviewView({ searchParams }: { searchParams: RawParams }) {
  const state = parseListParams(CUSTOMERS_SPEC, searchParams);
  const db = await createClient();
  const [{ rows, total, totalRows, failed }, found] = await Promise.all([
    listReview(db, { p_limit: LIMIT, p_offset: 0 }),
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
        {!failed && total > 0 && (
          <StatGrid>
            <StatCard label={c.statGroups} value={total} />
            <StatCard label={c.statRows} value={totalRows} />
          </StatGrid>
        )}
        <FilterBar basePath={BASE} spec={CUSTOMERS_SPEC} state={state} searchPlaceholder={c.reviewSearch} />
        <p className="text-xs text-pt-muted">{c.reviewSearchHint}</p>
        {/* Rendered even when empty: it keeps the last batch's result and undo button. */}
        {failed ? <ErrorState body={c.reviewLoadError} /> : <ReviewGroups rows={rows} found={found?.rows ?? []} />}
        {total > rows.length && <p className="text-sm text-pt-muted">{format(c.limitNote, { n: rows.length })}</p>}
      </Section>
    </>
  );
}
