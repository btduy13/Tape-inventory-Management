// Lead detail "Sản xuất" panel frame (admin). Shows the accepted quote (total + VAT) next to the
// workshop hand-off form, which features/workshop renders as `children`. Before a quote is
// accepted the panel collapses to a one-line note (the form could not be used yet).
import { format, formatVnd, getDictionary } from "@/i18n";
import { Section } from "@/features/portal-ui";
import type { LeadStatus } from "@/lib/types";
import { PANEL, showsHandoff } from "../lib/next-step";
import type { QuoteSummary } from "../server/queries";

const c = getDictionary().leadsUi;

type Props = {
  quotes: QuoteSummary[];
  status: LeadStatus;
  productionOrderId: string | null;
  children: React.ReactNode;
};

export function ProductionSlot({ quotes, status, productionOrderId, children }: Props) {
  if (!showsHandoff(status, productionOrderId)) {
    return (
      <Section id={PANEL.production} title={c.panelProduction}>
        <p className="text-sm text-pt-muted">{c.productionNotYet}</p>
      </Section>
    );
  }
  const accepted = quotes.find((q) => q.status === "accepted");
  return (
    <Section id={PANEL.production} title={c.panelProduction}>
      <div className="rounded-lg bg-pt-canvas p-3 text-sm">
        <p className="text-pt-muted">{c.acceptedQuote}</p>
        <p className="font-semibold text-pt-text">
          {accepted
            ? format(c.acceptedQuoteValue, { version: accepted.version, total: formatVnd(accepted.total), vat: Number(accepted.vat_percent) })
            : c.noAcceptedQuote}
        </p>
      </div>
      {/* The hand-off panel brings its own frame and heading row: flatten them into this section. */}
      <div className="[&>section]:gap-4 [&>section]:border-0 [&>section]:p-0 [&>section>div:first-child]:hidden">{children}</div>
    </Section>
  );
}
