// Lead detail as a workflow page: header with the viewer's next action, the pipeline strip,
// then action panels (aside) and the record (main). On phones the action panels come first.
import { getDictionary } from "@/i18n";
import type { Profile } from "@/lib/types";
import { nextStatusOptions } from "@/lib/lead-status";
import { ROUTES } from "@/lib/routes";
import { canManagePrices, seesAllLeads } from "@/lib/auth/roles";
import { PageHeader, Section, StatusBadge, WorkflowStepper, buttonClass, type Crumb } from "@/features/portal-ui";
import type { LeadDetail } from "../server/queries";
import { PANEL, primaryActionFor } from "../lib/next-step";
import { CONTAIN_SCROLLERS } from "./contain-scrollers";
import { LeadLiveRefresher } from "./LeadLiveRefresher";
import { CustomerPanel, DesignPanel } from "./LeadPanels";
import { NoteForm } from "./NoteForm";
import { QuoteList } from "./QuoteList";
import { StatusForm } from "./StatusForm";
import { Timeline } from "./Timeline";

const t = getDictionary();
const c = t.leadsUi;

type Props = {
  detail: LeadDetail;
  profile: Profile;
  /** Extra action panels from other features (assignment, production hand-off). */
  aside?: React.ReactNode;
  /** Replaces the read-only quote list (e.g. features/quotes editor). */
  quotesSlot?: React.ReactNode;
};

export function LeadDetailView({ detail, profile, aside, quotesSlot }: Props) {
  const { lead } = detail;
  const assigneeName = lead.assigned_to ? detail.names[lead.assigned_to] ?? null : null;
  const primary = primaryActionFor(lead.status, profile.role);
  const crumbs: Crumb[] = [
    { label: seesAllLeads(profile) ? t.portalUi.navLeads : t.portalUi.navMyLeads, href: ROUTES.portal },
    { label: lead.code },
  ];
  return (
    <div className={`flex flex-col gap-6 ${CONTAIN_SCROLLERS}`}>
      <LeadLiveRefresher leadId={lead.id} userId={profile.id} seesAll={seesAllLeads(profile)} />
      <PageHeader
        title={lead.code}
        meta={<StatusBadge status={lead.status} size="md" />}
        description={[lead.customer_name, lead.company].filter(Boolean).join(", ")}
        breadcrumbs={crumbs}
        actions={primary ? <a href={`#${primary.anchor}`} className={buttonClass("primary")}>{c[primary.label]}</a> : undefined}
      />
      <WorkflowStepper status={lead.status} role={profile.role} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6 lg:col-start-2 lg:row-start-1">
          {aside}
          <Section id={PANEL.status} title={c.panelStatus}>
            <StatusForm key={lead.status} leadId={lead.id} code={lead.code} status={lead.status} options={nextStatusOptions(profile.role, lead.status)} />
          </Section>
          <Section id={PANEL.notes} title={c.panelNotes}>
            <NoteForm leadId={lead.id} />
          </Section>
        </div>
        <div className="flex min-w-0 flex-col gap-6 lg:col-start-1 lg:row-start-1">
          <CustomerPanel lead={lead} assigneeName={assigneeName} />
          <DesignPanel code={lead.code} design={detail.design} previewUrl={detail.previewUrl} />
          <Section id={PANEL.quotes} title={c.panelQuotes} description={canManagePrices(profile) ? undefined : c.fieldNoPrice}>
            {quotesSlot ?? <QuoteList quotes={detail.quotes} />}
          </Section>
          <Section title={c.panelTimeline}>
            <Timeline entries={detail.timeline} names={detail.names} />
          </Section>
        </div>
      </div>
    </div>
  );
}
