// Quote-request detail: header (customer, phone, status, waiting time) with the viewer's next
// action, a 5-step strip, then action panels (aside, primary one outlined) and the record (main).
// On phones the action panels come first.
import { getDictionary } from "@/i18n";
import type { Profile } from "@/lib/types";
import { nextStatusOptions } from "@/lib/lead-status";
import { ROUTES } from "@/lib/routes";
import { canManagePrices, seesAllLeads } from "@/lib/auth/roles";
import { Breadcrumbs, Section, buttonClass, linkClass, surfaceClass, type Crumb } from "@/features/portal-ui";
import type { LeadDetail } from "../server/queries";
import { PANEL, primaryActionFor } from "../lib/next-step";
import { CONTAIN_SCROLLERS } from "./contain-scrollers";
import { LeadBadge, WaitingTag } from "./LeadBits";
import { LeadLiveRefresher } from "./LeadLiveRefresher";
import { LeadStepper } from "./LeadStepper";
import { CustomerPanel, DesignPanel } from "./LeadPanels";
import { NoteForm } from "./NoteForm";
import { QuoteList } from "./QuoteList";
import { StatusForm } from "./StatusForm";
import { Timeline } from "./Timeline";

const t = getDictionary();
const c = t.leadsUi;

/** Outlines the panel the header's primary button points at (static strings for Tailwind). */
const FOCUS_RING: Record<string, string> = {
  [PANEL.assign]: "[&_#phan-cong]:ring-2 [&_#phan-cong]:ring-vt-yellow",
  [PANEL.status]: "[&_#trang-thai]:ring-2 [&_#trang-thai]:ring-vt-yellow",
  [PANEL.quotes]: "[&_#bao-gia]:ring-2 [&_#bao-gia]:ring-vt-yellow",
  [PANEL.production]: "[&_#san-xuat]:ring-2 [&_#san-xuat]:ring-vt-yellow",
};

type Props = {
  detail: LeadDetail & { now: number };
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
      <header className="flex flex-col gap-2">
        <Breadcrumbs items={crumbs} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-pt-text">{lead.customer_name}</h1>
              <LeadBadge status={lead.status} size="md" />
            </div>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-pt-muted">
              <span className="font-semibold text-pt-text">{lead.code}</span>
              {lead.company && <span>{lead.company}</span>}
              <a href={`tel:${lead.phone}`} className={`inline-flex min-h-11 items-center sm:min-h-0 ${linkClass}`}>{lead.phone}</a>
              <WaitingTag status={lead.status} since={lead.updated_at} now={detail.now} prefix />
            </p>
          </div>
          {primary && <a href={`#${primary.anchor}`} className={buttonClass("primary", "md", "w-full sm:w-auto")}>{c[primary.label]}</a>}
        </div>
      </header>
      <div className={`${surfaceClass} p-4 sm:p-5`}>
        <LeadStepper status={lead.status} role={profile.role} />
      </div>
      <div className={`grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] ${primary ? FOCUS_RING[primary.anchor] ?? "" : ""}`}>
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
