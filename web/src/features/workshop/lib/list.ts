// Workshop job list: URL-driven sort / search / filters over the workshop_jobs() RPC rows
// (in memory; the RPC already limits rows to what the viewer may see). Pure, unit-tested.
import { applyListInMemory } from "@/features/portal-ui/lib/apply-memory";
import { defineListSpec, pageSlice, type ListSpec, type ListState } from "@/features/portal-ui/lib/list-params";
import type { WorkshopJobRow } from "@/lib/types";
import { dueState, type DueState } from "./dates";
import { BOARD_COLUMNS, type BoardColumn } from "./group";
import { isClosedStep } from "./steps";

export type JobView = "board" | "table";
export const JOB_VIEWS: readonly JobView[] = ["board", "table"];
export const DUE_FILTER_VALUES: readonly DueState[] = ["overdue", "today", "soon", "ok", "none"];
export const PHASES = ["open", "closed"] as const;
export const NO_ASSIGNEE = "none";

/** A job plus the derived columns the list filters / sorts on. */
export type JobListRow = WorkshopJobRow & {
  code: string;
  stage: BoardColumn;
  step_rank: number;
  due_state: DueState;
  phase: (typeof PHASES)[number];
  assignee: string;
};

export function toListRow(job: WorkshopJobRow, now: Date = new Date()): JobListRow {
  const stage: BoardColumn = job.order_id ? job.step : "pending";
  return {
    ...job,
    code: job.order_id ?? job.lead_code,
    stage,
    step_rank: BOARD_COLUMNS.indexOf(stage),
    due_state: dueState(job.due_date, job.step, now),
    phase: isClosedStep(job.step) ? "closed" : "open",
    assignee: job.workshop_user_id ?? NO_ASSIGNEE,
  };
}

/**
 * Spec for /portal/xuong. `assigneeIds` (admin only) enables the assignee filter; values are the
 * active workshop user ids the server just loaded, so only known ids pass the URL whitelist.
 * `view` is a UI-only filter: `dataSpec()` drops it before rows are filtered.
 */
export function jobListSpec(assigneeIds: readonly string[] | null) {
  return defineListSpec({
    sort: {
      keys: {
        due: { column: "due_date", firstDir: "asc" },
        step: { column: "step_rank", firstDir: "asc" },
        updated: { column: "updated_at", firstDir: "desc" },
        code: { column: "code", firstDir: "asc" },
        qty: { column: "quantity", firstDir: "desc" },
      },
      default: { key: "due", dir: "asc" },
      tiebreak: "code",
    },
    search: { columns: ["code", "lead_code", "print_text", "production_note", "workshop_user_name"] },
    filters: {
      step: { kind: "enum", column: "stage", values: BOARD_COLUMNS, multi: true },
      due: { kind: "enum", column: "due_state", values: DUE_FILTER_VALUES },
      phase: { kind: "enum", column: "phase", values: PHASES },
      ...(assigneeIds ? { assignee: { kind: "enum" as const, column: "assignee", values: [...assigneeIds, NO_ASSIGNEE] } } : {}),
      view: { kind: "enum", column: "view", values: JOB_VIEWS },
    },
    dateRange: { column: "due_date", type: "date" },
    pageSizes: [25, 50, 100],
  });
}

/** Same spec without the UI-only `view` filter (rows have no such column). */
export function dataSpec(spec: ListSpec): ListSpec {
  const filters = { ...(spec.filters ?? {}) };
  delete filters.view;
  return { ...spec, filters };
}

/** Workshop users work from the board (one-tap buttons); admin starts on the table. */
export function defaultView(role: string): JobView {
  return role === "workshop" ? "board" : "table";
}

export function viewOf(state: ListState, role: string): JobView {
  const v = state.filters.view?.[0];
  return v === "board" || v === "table" ? v : defaultView(role);
}

/** State with the view switched; the role's default view is left out of the URL. */
export function withView(state: ListState, view: JobView, role: string): ListState {
  const filters = { ...state.filters };
  if (view === defaultView(role)) delete filters.view;
  else filters.view = [view];
  return { ...state, page: 1, filters };
}

/** Search, date or a real filter is on (the view switch does not count). */
export function isFiltered(state: ListState): boolean {
  return !!state.q || !!state.from || !!state.to || Object.entries(state.filters).some(([k, v]) => k !== "view" && v.length > 0);
}

export type JobQueryResult = { rows: JobListRow[]; total: number };

/**
 * Filters + sorts, then keeps open jobs above finished ones (a delivered job from last month
 * must not push today's work down). `paginate` false for the board. An out-of-range page is
 * clamped (?page=99 shows the last page, not a false empty state).
 */
export function queryJobs(rows: readonly JobListRow[], spec: ListSpec, state: ListState, paginate: boolean): JobQueryResult {
  const { rows: sorted, total } = applyListInMemory(rows, dataSpec(spec), state, { paginate: false });
  const ordered = [...sorted.filter((r) => r.phase === "open"), ...sorted.filter((r) => r.phase === "closed")];
  if (!paginate) return { rows: ordered, total };
  return { rows: pageSlice(ordered, state), total };
}

export type JobCounts = { overdue: number; today: number; active: number; ready: number; pending: number };

/** Header counters over every visible job (before filters). */
export function countJobs(rows: readonly JobListRow[]): JobCounts {
  const c: JobCounts = { overdue: 0, today: 0, active: 0, ready: 0, pending: 0 };
  for (const r of rows) {
    if (r.due_state === "overdue") c.overdue++;
    if (r.due_state === "today") c.today++;
    if (r.stage === "pending") c.pending++;
    else if (r.stage === "san_sang_giao") c.ready++;
    else if (r.phase === "open") c.active++;
  }
  return c;
}
