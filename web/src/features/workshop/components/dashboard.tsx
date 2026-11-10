// /portal/xuong: my jobs (workshop) or every job (admin). The page calls requireRole() first;
// rows come only from rpc('workshop_jobs') with the viewer's RLS client (specs only, own jobs
// for workshop users). Sort / search / filters run in memory over those rows.
import {
  EmptyState, FilterBar, PageHeader, StatCard, StatGrid, defaultListState, listHref, parseListParams,
  type FilterControl, type ListSpec, type ListState, type RawParams,
} from "@/features/portal-ui";
import { getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { wsCopy } from "../lib/copy";
import { BOARD_COLUMNS } from "../lib/group";
import { countJobs, isFiltered, jobListSpec, queryJobs, toListRow, viewOf } from "../lib/list";
import { listWorkshopJobs, listWorkshopUsers } from "../server/queries";
import { JobsTable } from "./JobsTable";
import { BoardSort, ViewToggle } from "./JobsToolbar";
import { LiveDot } from "./LiveDot";
import { WorkshopBoard } from "./WorkshopBoard";
import { WorkshopLiveRefresher } from "./WorkshopLiveRefresher";

const t = getDictionary();
const BASE = ROUTES.workshop;

// One workshop only: no assignee filter.
function controls(): FilterControl[] {
  const out: FilterControl[] = [
    { kind: "select", name: "due", label: wsCopy.filterDue, options: [
      { value: "overdue", label: wsCopy.dueOverdue }, { value: "today", label: wsCopy.dueToday },
      { value: "soon", label: wsCopy.dueSoon }, { value: "ok", label: wsCopy.dueOk }, { value: "none", label: wsCopy.dueNone },
    ] },
    { kind: "select", name: "phase", label: wsCopy.filterState, options: [
      { value: "open", label: wsCopy.stateOpen }, { value: "closed", label: wsCopy.stateClosed },
    ] },
  ];
  out.push({ kind: "select", name: "step", label: wsCopy.filterStep, options: BOARD_COLUMNS.map((c) => ({
    value: c, label: c === "pending" ? t.workshop.pending : t.productionStep[c],
  })) });
  return out;
}

/** Stat card link: one filter on top of the current view, everything else reset. */
const only = (spec: ListSpec, state: ListState, filters: Record<string, string[]>) =>
  listHref(BASE, spec, { ...defaultListState(spec), filters: { ...filters, ...(state.filters.view ? { view: state.filters.view } : {}) } });

export async function WorkshopDashboard({ profile, searchParams }: { profile: Profile; searchParams: RawParams }) {
  const db = await createClient();
  const isAdmin = profile.role === "admin";
  const [jobs, users] = await Promise.all([listWorkshopJobs(db), isAdmin ? listWorkshopUsers(db) : Promise.resolve(null)]);
  const spec = jobListSpec(users ? users.map((u) => u.id) : null);
  const state = parseListParams(spec, searchParams);
  const view = viewOf(state, profile.role);
  const now = new Date();
  const all = jobs.map((j) => toListRow(j, now));
  // Workshop floor (one workshop, low-literacy users): no filters, no stats, no codes. Just the
  // jobs, nearest due date first, each with one big "done" button.
  if (!isAdmin) {
    const { rows } = queryJobs(all, spec, defaultListState(spec), false);
    return (
      <div className="flex flex-col gap-6">
        <WorkshopLiveRefresher />
        <PageHeader title={wsCopy.myJobs} description={wsCopy.descFloor} meta={<LiveDot />} />
        <WorkshopBoard jobs={rows} role={profile.role} />
      </div>
    );
  }
  const counts = countJobs(all);
  const { rows, total } = queryJobs(all, spec, state, view === "table");
  const filtered = isFiltered(state);

  return (
    <div className="flex flex-col gap-6">
      <WorkshopLiveRefresher />
      <PageHeader
        title={isAdmin ? wsCopy.overviewTitle : wsCopy.myJobs}
        description={isAdmin ? wsCopy.descAdmin : wsCopy.descWorkshop}
        meta={<LiveDot />}
      />
      <StatGrid>
        <StatCard label={wsCopy.statOverdue} value={counts.overdue} tone="red" href={only(spec, state, { due: ["overdue"] })} />
        <StatCard label={wsCopy.statToday} value={counts.today} tone="yellow" href={only(spec, state, { due: ["today"] })} />
        <StatCard label={wsCopy.statWaiting} value={counts.waiting} tone="grey" href={only(spec, state, { step: ["cho_san_xuat"] })} />
        <StatCard label={wsCopy.statActive} value={counts.active} tone="amber" href={only(spec, state, { step: ["dang_san_xuat"] })} />
        <StatCard label={wsCopy.statReady} value={counts.ready} tone="green" href={only(spec, state, { step: ["san_sang_giao"] })} />
        {(isAdmin || counts.pending > 0) && (
          <StatCard label={wsCopy.statPending} value={counts.pending} tone="grey" href={only(spec, state, { step: ["pending"] })} />
        )}
      </StatGrid>
      <FilterBar
        basePath={BASE}
        spec={spec}
        state={state}
        controls={controls()}
        searchPlaceholder={wsCopy.searchPlaceholder}
        dateRange
        dateLabel={wsCopy.dueRange}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ViewToggle basePath={BASE} spec={spec} state={state} view={view} role={profile.role} />
        {view === "board" && <BoardSort basePath={BASE} spec={spec} state={state} />}
      </div>
      {view === "table" ? (
        <JobsTable key={listHref(BASE, spec, state)} rows={rows} role={profile.role} list={{ basePath: BASE, spec, state, total }} filtered={filtered} />
      ) : rows.length === 0 ? (
        <EmptyState
          title={filtered ? t.portalUi.emptyFiltered : isAdmin ? wsCopy.emptyAll : wsCopy.emptyMine}
          body={filtered || isAdmin ? undefined : wsCopy.emptyMineBody}
        />
      ) : (
        <WorkshopBoard jobs={rows} role={profile.role} />
      )}
    </div>
  );
}
