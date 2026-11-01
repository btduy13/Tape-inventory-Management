import Link from "next/link";
import { getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import type { AppRole, WorkshopJobRow } from "@/lib/types";
import { formatSize } from "../lib/group";
import { dueState } from "../lib/dates";
import { AdvanceStepForm } from "./AdvanceStepForm";
import { DueBadge, StepBadge } from "./ui";

const t = getDictionary();

/** Card on the board. Workshop users get the one-tap next-step button right on the card. */
export function JobCard({ job, role }: { job: WorkshopJobRow; role: AppRole }) {
  const overdue = dueState(job.due_date, job.step) === "overdue";
  return (
    <li className={`flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm ${overdue ? "border-red-500 ring-1 ring-red-500" : "border-neutral-200"}`}>
      <Link href={ROUTES.workshopJob(job.job_id)} className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-lg font-semibold">{job.order_id ?? job.lead_code}</span>
          <StepBadge step={job.step} />
        </div>
        <div className="text-base">{formatSize(job)}</div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-700">
          <span>{t.workshop.quantity}: <b>{job.quantity.toLocaleString("vi-VN")}</b></span>
          {job.print_text && <span className="truncate">“{job.print_text}”</span>}
        </div>
        <DueBadge dueDate={job.due_date} step={job.step} />
        {role === "admin" && (
          <div className="text-xs text-neutral-500">{t.workshop.assignee}: {job.workshop_user_name ?? t.workshop.unassigned}</div>
        )}
        <span className="text-sm text-amber-800 underline">{t.workshop.open}</span>
      </Link>
      {job.order_id && role === "workshop" && <AdvanceStepForm jobId={job.job_id} step={job.step} role={role} compact />}
    </li>
  );
}
