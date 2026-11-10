// Status tabs + filters + table for the quote-request list page (server component). Data comes from loadLeadListPage().
import Link from "next/link";
import { format, getDictionary } from "@/i18n";
import { InlineStatus, buttonClass, hasActiveFilters } from "@/features/portal-ui";
import { LEAD_SCAN_LIMIT, filteredHref, leadListEmpty } from "../lib/lead-list";
import type { LeadListData } from "../server/load";
import { CONTAIN_SCROLLERS } from "./contain-scrollers";
import { LeadFilters, LeadTabs } from "./LeadFilters";
import { LeadListTable } from "./LeadListTable";

const t = getDictionary();
const c = t.leadsUi;

type Props = {
  data: LeadListData;
  basePath: string;
  detail: "admin" | "portal";
  /** Staff/CTV: "Yêu cầu của tôi" copy, no assignee filter / column. */
  mine: boolean;
};

export function LeadList({ data, basePath, detail, mine }: Props) {
  const { spec, state, assignees } = data;
  const filtered = hasActiveFilters(state);
  const e = leadListEmpty(filtered, mine);
  const empty = {
    title: e.title && c[e.title],
    body: c[e.body],
    action: e.clear ? <Link href={filteredHref(basePath, {})} className={buttonClass("secondary", "sm")}>{t.portalUi.clearFilters}</Link> : undefined,
  };
  return (
    <div className={`flex flex-col gap-4 ${CONTAIN_SCROLLERS}`}>
      <LeadTabs basePath={basePath} spec={spec} state={state} counts={data.counts} />
      <LeadFilters basePath={basePath} spec={spec} state={state} assignees={assignees} mine={mine} />
      {data.capped && <InlineStatus tone="info">{format(c.capped, { count: LEAD_SCAN_LIMIT })}</InlineStatus>}
      <LeadListTable
        rows={data.rows}
        total={data.total}
        spec={spec}
        state={state}
        basePath={basePath}
        detail={detail}
        showAssignee={!mine}
        filtered={filtered}
        empty={empty}
        error={data.error ? c.loadError : null}
        now={data.now}
      />
    </div>
  );
}
