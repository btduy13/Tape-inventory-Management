import { getDictionary } from "@/i18n";
import type { Profile } from "@/lib/types";
import { nextStatusOptions } from "@/lib/lead-status";
import { seesAllLeads } from "@/lib/auth/roles";
import type { LeadDetail } from "../server/queries";
import { LeadLiveRefresher } from "./LeadLiveRefresher";
import { LeadSummary } from "./LeadSummary";
import { NoteForm } from "./NoteForm";
import { QuoteList } from "./QuoteList";
import { StatusForm } from "./StatusForm";
import { Timeline } from "./Timeline";

const t = getDictionary();

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-neutral-200 p-4">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

type Props = {
  detail: LeadDetail;
  profile: Profile;
  /** Extra panels from other features (assignment, quotes editor, production hand-off). */
  aside?: React.ReactNode;
  /** Replaces the read-only quote list (e.g. features/quotes editor). */
  quotesSlot?: React.ReactNode;
};

export function LeadDetailView({ detail, profile, aside, quotesSlot }: Props) {
  const { lead } = detail;
  const assigneeName = lead.assigned_to ? detail.names[lead.assigned_to] ?? null : null;
  return (
    <div className="flex flex-col gap-6">
      <LeadLiveRefresher leadId={lead.id} userId={profile.id} seesAll={seesAllLeads(profile)} />
      <LeadSummary lead={lead} design={detail.design} previewUrl={detail.previewUrl} assigneeName={assigneeName} />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-6">
          {quotesSlot ? (
            <section className="rounded-lg border border-neutral-200 p-4">{quotesSlot}</section>
          ) : (
            <Card title={t.quotes.title}>
              <QuoteList quotes={detail.quotes} />
            </Card>
          )}
          <Card title={t.orders.timeline}>
            <Timeline entries={detail.timeline} names={detail.names} />
          </Card>
        </div>
        <div className="flex flex-col gap-6">
          {aside}
          <Card title={t.orders.changeStatus}>
            <StatusForm leadId={lead.id} options={nextStatusOptions(profile.role, lead.status)} />
          </Card>
          <Card title={t.orders.notes}>
            <NoteForm leadId={lead.id} />
          </Card>
        </div>
      </div>
    </div>
  );
}
