// Job ticket on the board: what to make (size, rolls, colours, text), when it is due, and for a
// workshop user the one-tap next-step button. The whole card links to the job; the button sits
// above the link (.pt-row rules).
import Link from "next/link";
import { StepBadge, surfaceClass } from "@/features/portal-ui";
import { format, getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import type { AppRole } from "@/lib/types";
import { wsCopy } from "../lib/copy";
import { formatSize } from "../lib/group";
import type { JobListRow } from "../lib/list";
import { AdvanceStepForm } from "./AdvanceStepForm";
import { ColorSwatches, DueBadge } from "./ui";

const t = getDictionary();

export function JobCard({ job, role }: { job: JobListRow; role: AppRole }) {
  const overdue = job.due_state === "overdue";
  return (
    <li
      data-job={job.code}
      data-overdue={overdue ? "1" : undefined}
      className={`pt-row ${surfaceClass} flex flex-col gap-3 p-4 ${overdue ? "border-l-[6px] border-l-pt-red-ink" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <Link href={ROUTES.workshopJob(job.job_id)} className="pt-row-link text-xl font-bold tracking-tight text-pt-text hover:text-vt-blue">
            {job.code}
          </Link>
          {job.order_id && <span className="text-xs text-pt-muted">{format(wsCopy.lead, { code: job.lead_code })}</span>}
        </div>
        <StepBadge step={job.step} />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-lg font-semibold tabular-nums text-pt-text">{formatSize(job)}</span>
        <span className="text-base text-pt-text">
          <b className="tabular-nums">{format(wsCopy.rolls, { count: job.quantity.toLocaleString("vi-VN") })}</b>
        </span>
      </div>
      <ColorSwatches colors={job.colors} />
      {job.print_text && <p className="line-clamp-2 text-sm text-pt-text">“{job.print_text}”</p>}
      <div className="flex flex-wrap items-center gap-2">
        <DueBadge dueDate={job.due_date} step={job.step} />
        {role === "admin" && (
          <span className="text-xs text-pt-muted">{t.workshop.assignee}: {job.workshop_user_name ?? t.workshop.unassigned}</span>
        )}
      </div>
      {job.order_id && role === "workshop" && job.phase === "open" && (
        <AdvanceStepForm jobId={job.job_id} code={job.code} step={job.step} role={role} compact />
      )}
    </li>
  );
}
