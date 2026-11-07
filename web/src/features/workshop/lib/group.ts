// Board grouping: jobs not converted yet go to "pending", the rest by step.
import type { ProductionStep, WorkshopJobRow } from "@/lib/types";
import { BOARD_STEPS } from "./steps";

export type BoardColumn = ProductionStep | "pending";
export const BOARD_COLUMNS: readonly BoardColumn[] = ["pending", ...BOARD_STEPS];

/** Office reference of a job (admin only): order id, else lead code, else the job id. */
export function jobCode(job: Pick<WorkshopJobRow, "order_id" | "lead_code" | "job_id">): string {
  return job.order_id ?? job.lead_code ?? job.job_id;
}

/**
 * What everyone calls the job: the order's name (ten_hang), else the printed text
 * ("Băng keo in “VINH THINH”"), else the size. The workshop never sees order / customer codes.
 */
export function jobName(job: Pick<WorkshopJobRow, "order_name" | "print_text" | "width_mm" | "length_m">): string {
  const name = job.order_name?.trim();
  if (name) return name;
  const text = job.print_text?.trim();
  if (text) return `Băng keo in “${text}”`;
  return `Băng keo ${Number(job.width_mm)}mm × ${Number(job.length_m)}m`;
}

/** "48mm × 100m × 50mic" (missing parts shown as "?"). */
export function formatSize(job: Pick<WorkshopJobRow, "width_mm" | "length_m" | "thickness_mic">): string {
  const v = (n: number | null) => (n === null || n === undefined ? "?" : String(Number(n)));
  return `${v(job.width_mm)}mm × ${v(job.length_m)}m × ${v(job.thickness_mic)}mic`;
}

/**
 * Step-log note as the floor sees it: the DB prefixes "Chuyển sang sản xuất: <code> — " (lead
 * hand-off) and "Đơn mới từ app|web[: <code>]" (0024 trigger); workshop users never see codes.
 */
export function floorNote(note: string): string {
  return note.replace(/^(?:(?:Chuyển sang sản xuất|Đơn mới từ (?:app|web)): \S+(?: — )?|Đơn mới từ (?:app|web)$)/, "");
}
