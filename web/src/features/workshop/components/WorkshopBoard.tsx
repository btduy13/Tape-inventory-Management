// Board view: one lane per step in workflow order (rows arrive already filtered + sorted).
// Finished lanes (delivered / cancelled) fold away so the floor sees today's work first.
import { getDictionary, format } from "@/i18n";
import type { AppRole } from "@/lib/types";
import { wsCopy } from "../lib/copy";
import { BOARD_COLUMNS, type BoardColumn } from "../lib/group";
import type { JobListRow } from "../lib/list";
import { isClosedStep } from "../lib/steps";
import { JobCard } from "./JobCard";

const t = getDictionary();

const label = (c: BoardColumn) => (c === "pending" ? t.workshop.pending : t.productionStep[c]);

function Lane({ column, jobs, role }: { column: BoardColumn; jobs: JobListRow[]; role: AppRole }) {
  const id = `lane-${column}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="flex items-center gap-2 text-lg font-semibold text-pt-text">
        {label(column)}
        <span className="inline-flex min-w-7 justify-center rounded-full bg-pt-grey-tint px-2 text-sm tabular-nums text-pt-grey-ink">{jobs.length}</span>
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {jobs.map((job) => <JobCard key={job.job_id} job={job} role={role} />)}
      </ul>
    </section>
  );
}

export function WorkshopBoard({ jobs, role }: { jobs: readonly JobListRow[]; role: AppRole }) {
  const lanes = BOARD_COLUMNS.map((c) => ({ c, jobs: jobs.filter((j) => j.stage === c) })).filter((l) => l.jobs.length > 0);
  const open = lanes.filter((l) => l.c === "pending" || !isClosedStep(l.c));
  const closed = lanes.filter((l) => l.c !== "pending" && isClosedStep(l.c));
  const closedCount = closed.reduce((n, l) => n + l.jobs.length, 0);
  return (
    <div className="flex flex-col gap-8">
      {open.map((l) => <Lane key={l.c} column={l.c} jobs={l.jobs} role={role} />)}
      {closedCount > 0 && (
        <details open={open.length === 0} className="group flex flex-col gap-4">
          <summary className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-base font-semibold text-pt-muted hover:text-vt-blue">
            {format(wsCopy.closedGroup, { count: closedCount })}
          </summary>
          <div className="mt-4 flex flex-col gap-8">
            {closed.map((l) => <Lane key={l.c} column={l.c} jobs={l.jobs} role={role} />)}
          </div>
        </details>
      )}
    </div>
  );
}
