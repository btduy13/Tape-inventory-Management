// Board grouping: jobs not converted yet go to "pending", the rest by step.
import type { ProductionStep, WorkshopJobRow } from "@/lib/types";
import { BOARD_STEPS } from "./steps";

export type BoardColumn = ProductionStep | "pending";
export const BOARD_COLUMNS: readonly BoardColumn[] = ["pending", ...BOARD_STEPS];

export type JobGroups = Record<BoardColumn, WorkshopJobRow[]>;

const byDue = (a: WorkshopJobRow, b: WorkshopJobRow) =>
  (a.due_date ?? "9999-12-31").localeCompare(b.due_date ?? "9999-12-31") || a.lead_code.localeCompare(b.lead_code);

export function groupJobs(jobs: readonly WorkshopJobRow[]): JobGroups {
  const groups = Object.fromEntries(BOARD_COLUMNS.map((c) => [c, [] as WorkshopJobRow[]])) as JobGroups;
  for (const job of jobs) groups[job.order_id ? job.step : "pending"].push(job);
  for (const c of BOARD_COLUMNS) groups[c].sort(byDue);
  return groups;
}

/** "48mm × 100m × 50mic" (missing parts shown as "?"). */
export function formatSize(job: Pick<WorkshopJobRow, "width_mm" | "length_m" | "thickness_mic">): string {
  const v = (n: number | null) => (n === null || n === undefined ? "?" : String(Number(n)));
  return `${v(job.width_mm)}mm × ${v(job.length_m)}m × ${v(job.thickness_mic)}mic`;
}
