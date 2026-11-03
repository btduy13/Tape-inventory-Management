// /portal/xuong/[id]/phieu-giao. The page calls requireRole() and validates the id; this returns
// null when the job is not visible to the viewer (workshop_jobs() RLS-filtered RPC) and the page
// 404s. Recipient data arrives only when the note is created (create_delivery_note re-checks
// admin / assigned workshop user and the san_sang_giao step).
import Link from "next/link";
import { PageHeader, Section, StepBadge, linkClass } from "@/features/portal-ui";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { wsCopy } from "../lib/copy";
import { jobName } from "../lib/group";
import { needsDeliveryNote } from "../lib/steps";
import { getWorkshopJob } from "../server/queries";
import { DeliveryNoteMaker } from "./DeliveryNoteMaker";

export async function WorkshopDeliveryNoteView({ jobId, nonce }: { jobId: string; nonce?: string }) {
  const db = await createClient();
  const job = await getWorkshopJob(db, jobId);
  if (!job) return null;
  const name = jobName(job);
  const ready = job.order_id !== null && needsDeliveryNote(job.step);
  return (
    <div className="flex flex-col gap-6">
      <div className="print:hidden">
        <PageHeader
          title={wsCopy.noteTitle}
          description={name}
          breadcrumbs={[
            { label: wsCopy.backToList, href: ROUTES.workshop },
            { label: name, href: ROUTES.workshopJob(jobId) },
            { label: wsCopy.noteTitle },
          ]}
          meta={<StepBadge step={job.step} size="md" />}
        />
      </div>
      {ready ? (
        <DeliveryNoteMaker jobId={jobId} nonce={nonce} />
      ) : (
        <Section>
          <p className="text-lg font-semibold text-pt-text">{job.step === "da_giao" ? wsCopy.noteDelivered : wsCopy.noteNotReady}</p>
        </Section>
      )}
      <Link href={ROUTES.workshopJob(jobId)} className={`${linkClass} inline-flex min-h-11 items-center print:hidden`}>
        {wsCopy.noteBack}
      </Link>
    </div>
  );
}
