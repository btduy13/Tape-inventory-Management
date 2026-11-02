// Filters + table for a lead list page (server component). Data comes from loadLeadListPage().
import Link from "next/link";
import { format, getDictionary } from "@/i18n";
import { FilterBar, InlineStatus, buttonClass, hasActiveFilters, type FilterControl } from "@/features/portal-ui";
import { LEAD_STATUSES } from "@/lib/types";
import { LEAD_SCAN_LIMIT, LEAD_SOURCES, UNASSIGNED, filteredHref, leadListEmpty } from "../lib/lead-list";
import type { LeadListData } from "../server/load";
import { CONTAIN_SCROLLERS } from "./contain-scrollers";
import { LeadListTable } from "./LeadListTable";

const t = getDictionary();
const c = t.leadsUi;

type Props = {
  data: LeadListData;
  basePath: string;
  detail: "admin" | "portal";
  /** Staff/CTV: "Việc của tôi" copy, no assignee filter / column. */
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
  const controls: FilterControl[] = [
    { kind: "chips", name: "status", label: c.filterStatus, options: LEAD_STATUSES.map((s) => ({ value: s, label: t.leadStatus[s] })) },
    ...(mine
      ? []
      : [{
          kind: "select" as const,
          name: "assignee",
          label: c.filterAssignee,
          options: [{ value: UNASSIGNED, label: c.unassigned }, ...assignees.map((a) => ({ value: a.id, label: a.name }))],
        }]),
    {
      kind: "select",
      name: "source",
      label: c.filterSource,
      options: LEAD_SOURCES.map((s) => ({ value: s, label: s === "preset" ? c.sourcePreset : c.sourceCustom })),
    },
  ];
  return (
    <div className={`flex flex-col gap-4 ${CONTAIN_SCROLLERS}`}>
      <FilterBar
        basePath={basePath}
        spec={spec}
        state={state}
        controls={controls}
        searchPlaceholder={c.searchPlaceholder}
        dateRange
        dateLabel={c.dateCreated}
      />
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
      />
    </div>
  );
}
