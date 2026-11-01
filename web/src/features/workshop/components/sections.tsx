// Server-rendered entry points used by thin pages. Pages call requireRole() first; every query
// below runs with the logged-in user's RLS client, and the SQL functions re-check role and
// assignment, so a wrong role would see nothing anyway.
import Link from "next/link";
import { getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import type { Lead, Profile } from "@/lib/types";
import { defaultDueDate, vnToday } from "../lib/dates";
import { designUrls, getWorkshopJob, jobForLead, listStepLog, listWorkshopJobs, listWorkshopUsers } from "../server/queries";
import { AdvanceStepForm } from "./AdvanceStepForm";
import { AssignWorkshopForm } from "./AssignWorkshopForm";
import { ConvertForm } from "./ConvertForm";
import { JobDesign, JobSpecs, StepHistory } from "./JobDetail";
import { WorkshopBoard } from "./WorkshopBoard";
import { WorkshopLiveRefresher } from "./WorkshopLiveRefresher";

const t = getDictionary();

/** /portal/xuong: my jobs (workshop) or all jobs (admin overview), grouped by step. */
export async function WorkshopDashboard({ profile }: { profile: Profile }) {
  const jobs = await listWorkshopJobs(await createClient());
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold">{profile.role === "admin" ? t.workshop.overviewTitle : t.workshop.title}</h1>
        <span className="text-xs text-neutral-500">{t.workshop.liveHint}</span>
      </div>
      <WorkshopLiveRefresher />
      <WorkshopBoard jobs={jobs} role={profile.role} />
    </div>
  );
}

/** /portal/xuong/[id]. Returns null when the job is not visible to this user (page -> 404). */
export async function WorkshopJobView({ profile, jobId }: { profile: Profile; jobId: string }) {
  const db = await createClient();
  const job = await getWorkshopJob(db, jobId);
  if (!job) return null;
  const isAdmin = profile.role === "admin";
  const [log, urls, users] = await Promise.all([
    listStepLog(db, jobId),
    designUrls(db, job),
    isAdmin ? listWorkshopUsers(db) : Promise.resolve([]),
  ]);
  const closed = job.step === "da_giao" || job.step === "huy";
  return (
    <div className="flex flex-col gap-4">
      <WorkshopLiveRefresher jobId={jobId} />
      <Link href={ROUTES.workshop} className="text-base text-amber-800 underline">{t.workshop.back}</Link>
      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-4">
          <JobSpecs job={job} />
          <JobDesign job={job} urls={urls} />
        </div>
        <aside className="flex flex-col gap-4">
          <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
            {job.order_id ? (
              <AdvanceStepForm jobId={job.job_id} step={job.step} role={profile.role} />
            ) : (
              <>
                <h2 className="font-semibold">{t.workshop.convertTitle}</h2>
                <ConvertForm
                  leadId={job.lead_id}
                  defaultDue={defaultDueDate()}
                  minDue={vnToday()}
                  workshopUsers={isAdmin ? users : undefined}
                  currentWorkshopUserId={job.workshop_user_id}
                />
              </>
            )}
          </section>
          {isAdmin && !closed && (
            <section className="rounded-xl border border-neutral-200 bg-white p-4">
              <AssignWorkshopForm leadId={job.lead_id} users={users} currentUserId={job.workshop_user_id} />
            </section>
          )}
          <StepHistory log={log} />
        </aside>
      </div>
    </div>
  );
}

/** Lead detail page panel (admin): assign the workshop user and convert with a due date. */
export async function ProductionHandoffPanel({ profile, lead }: { profile: Profile; lead: Pick<Lead, "id" | "status" | "production_order_id"> }) {
  if (profile.role !== "admin") return null;
  const db = await createClient();
  const [job, users] = await Promise.all([jobForLead(db, lead.id), listWorkshopUsers(db)]);
  const ready = lead.status === "accepted";
  const assignable = ["accepted", "production", "shipping"].includes(lead.status) && !(job && ["da_giao", "huy"].includes(job.step));
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4">
      <h2 className="font-semibold">{t.admin.production}</h2>
      {lead.production_order_id ? (
        <p className="text-sm">
          {t.admin.productionOrder}: <span className="font-mono">{lead.production_order_id}</span>
          {job && <> · {t.productionStep[job.step]} · <Link className="text-amber-800 underline" href={ROUTES.workshopJob(job.id)}>{t.workshop.open}</Link></>}
        </p>
      ) : (
        <>
          <ConvertForm
            leadId={lead.id}
            defaultDue={defaultDueDate()}
            minDue={vnToday()}
            workshopUsers={users}
            currentWorkshopUserId={job?.workshop_user_id ?? null}
            disabled={!ready}
          />
          {!ready && <p className="text-xs text-neutral-500">{t.workshop.convertNotReady}</p>}
        </>
      )}
      {assignable && <AssignWorkshopForm leadId={lead.id} users={users} currentUserId={job?.workshop_user_id ?? null} />}
    </section>
  );
}
