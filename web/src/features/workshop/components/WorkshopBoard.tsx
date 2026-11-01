import { getDictionary } from "@/i18n";
import type { AppRole, WorkshopJobRow } from "@/lib/types";
import { BOARD_COLUMNS, groupJobs, type BoardColumn } from "../lib/group";
import { JobCard } from "./JobCard";

const t = getDictionary();

const label = (c: BoardColumn) => (c === "pending" ? t.workshop.pending : t.productionStep[c]);

/** Jobs grouped by step, mobile-first (stacked sections, cards full width). */
export function WorkshopBoard({ jobs, role }: { jobs: WorkshopJobRow[]; role: AppRole }) {
  if (jobs.length === 0) return <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-neutral-600">{t.workshop.empty}</p>;
  const groups = groupJobs(jobs);
  return (
    <div className="flex flex-col gap-6">
      {BOARD_COLUMNS.filter((c) => groups[c].length > 0).map((c) => (
        <section key={c} aria-labelledby={`step-${c}`} className="flex flex-col gap-3">
          <h2 id={`step-${c}`} className="flex items-center gap-2 text-lg font-semibold">
            {label(c)} <span className="rounded-full bg-neutral-200 px-2 text-sm">{groups[c].length}</span>
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {groups[c].map((job) => <JobCard key={job.job_id} job={job} role={role} />)}
          </ul>
        </section>
      ))}
    </div>
  );
}
