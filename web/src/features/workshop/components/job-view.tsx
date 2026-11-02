// /portal/xuong/[id]. The page calls requireRole() and validates the id; this returns null when
// the job is not visible to the viewer (workshop_jobs() RLS-filtered RPC) and the page 404s.
import { PageHeader, Section, StepBadge } from "@/features/portal-ui";
import { format, getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { wsCopy } from "../lib/copy";
import { defaultDueDate, vnToday } from "../lib/dates";
import { jobName } from "../lib/group";
import { isClosedStep } from "../lib/steps";
import { designUrls, getWorkshopJob, listStepLog, listWorkshopUsers } from "../server/queries";
import { AdvanceStepForm } from "./AdvanceStepForm";
import { AssignWorkshopForm } from "./AssignWorkshopForm";
import { ConvertForm } from "./ConvertForm";
import { JobDesign, JobSpecs, StepHistory } from "./JobDetail";
import { JobStepper } from "./JobStepper";
import { LiveDot } from "./LiveDot";
import { DueBadge } from "./ui";
import { WorkshopLiveRefresher } from "./WorkshopLiveRefresher";

const t = getDictionary();

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
  // Workshop users see the job's name, never order / customer codes.
  const code = isAdmin ? job.order_id ?? job.lead_code : jobName(job);
  const closed = isClosedStep(job.step);

  return (
    <div className="flex flex-col gap-6">
      <WorkshopLiveRefresher jobId={jobId} />
      <PageHeader
        title={code}
        breadcrumbs={[{ label: wsCopy.backToList, href: ROUTES.workshop }, { label: code }]}
        meta={
          <>
            {job.order_id ? <StepBadge step={job.step} size="md" /> : <span className="text-sm font-medium text-pt-muted">{t.workshop.pending}</span>}
            <DueBadge dueDate={job.due_date} step={job.step} size="md" />
            <LiveDot />
          </>
        }
      />
      {job.order_id && <JobStepper step={job.step} />}
      {/* Phones: the action panel comes first (order-first), desktop: right column. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <aside className="flex flex-col gap-6 lg:order-2">
          {job.order_id ? (
            <Section title={wsCopy.stepPanel} description={format(wsCopy.nowAt, { step: t.productionStep[job.step] })}>
              <AdvanceStepForm jobId={job.job_id} code={code} step={job.step} role={profile.role} />
            </Section>
          ) : (
            <Section title={wsCopy.convertPanel}>
              <ConvertForm
                leadId={job.lead_id}
                defaultDue={defaultDueDate()}
                minDue={vnToday()}
                workshopUsers={isAdmin ? users : undefined}
                currentWorkshopUserId={job.workshop_user_id}
              />
            </Section>
          )}
          {isAdmin && !closed && (
            <Section title={wsCopy.assignPanel}>
              <AssignWorkshopForm leadId={job.lead_id} users={users} currentUserId={job.workshop_user_id} />
            </Section>
          )}
          <div className="hidden lg:flex lg:flex-col">
            <StepHistory log={log} floor={!isAdmin} />
          </div>
        </aside>
        <div className="flex min-w-0 flex-col gap-6 lg:order-1">
          <JobSpecs job={job} floor={!isAdmin} />
          <JobDesign job={job} urls={urls} />
          <div className="lg:hidden">
            <StepHistory log={log} floor={!isAdmin} />
          </div>
        </div>
      </div>
    </div>
  );
}
