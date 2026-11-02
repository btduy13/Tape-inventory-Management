// Lead detail page panel (admin): assign the workshop user and convert with a due date.
// Renders nothing for other roles; the Server Actions and SQL re-check the role anyway.
import Link from "next/link";
import { Section, linkClass } from "@/features/portal-ui";
import { getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import type { Lead, Profile } from "@/lib/types";
import { defaultDueDate, vnToday } from "../lib/dates";
import { acceptedQuoteVat, jobForLead, listWorkshopUsers } from "../server/queries";
import { AssignWorkshopForm } from "./AssignWorkshopForm";
import { ConvertForm } from "./ConvertForm";
import { JobStepper } from "./JobStepper";

const t = getDictionary();

export async function ProductionHandoffPanel({ profile, lead }: { profile: Profile; lead: Pick<Lead, "id" | "status" | "production_order_id"> }) {
  if (profile.role !== "admin") return null;
  const db = await createClient();
  const [job, users, vatPercent] = await Promise.all([
    jobForLead(db, lead.id),
    listWorkshopUsers(db),
    lead.production_order_id ? Promise.resolve(null) : acceptedQuoteVat(db, lead.id),
  ]);
  const ready = lead.status === "accepted";
  const assignable = ["accepted", "production", "shipping"].includes(lead.status) && !(job && ["da_giao", "huy"].includes(job.step));
  return (
    <Section title={t.admin.production} id="san-xuat">
      {lead.production_order_id ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-pt-text">
            {t.admin.productionOrder}: <span className="font-semibold">{lead.production_order_id}</span>
          </p>
          {job && (
            <>
              <JobStepper step={job.step} />
              <Link className={`${linkClass} inline-flex min-h-11 items-center`} href={ROUTES.workshopJob(job.id)}>{t.workshop.open}</Link>
            </>
          )}
        </div>
      ) : (
        <>
          <ConvertForm
            leadId={lead.id}
            defaultDue={defaultDueDate()}
            minDue={vnToday()}
            workshopUsers={users}
            currentWorkshopUserId={job?.workshop_user_id ?? null}
            showVat
            vatPercent={vatPercent}
            disabled={!ready}
          />
          {!ready && <p className="text-xs text-pt-muted">{t.workshop.convertNotReady}</p>}
        </>
      )}
      {assignable && <AssignWorkshopForm leadId={lead.id} users={users} currentUserId={job?.workshop_user_id ?? null} />}
    </Section>
  );
}
