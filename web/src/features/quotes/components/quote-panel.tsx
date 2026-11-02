// Server component embedded in the lead detail page (portal/admin).
// admin/manager: editor for the latest version + actions. staff/ctv: read-only (RLS limits rows).
import { format } from "@/i18n";
import { vi } from "@/i18n/vi";
import { ToneBadge, type Tone } from "@/features/portal-ui";
import { canManagePrices } from "@/lib/auth/roles";
import type { Profile } from "@/lib/types";
import { canCreateNewVersion, visibleQuotes } from "../lib/rules";
import type { QuoteWithLines } from "../lib/types";
import { listQuotesForLead } from "../server/queries";
import { QuoteEditor } from "./quote-editor";
import { QuoteLinesView } from "./quote-lines-view";
import { QuoteToolbarButton } from "./quote-toolbar";

/** Quote status colours (same meanings as the lead tones). */
const QUOTE_TONE: Record<QuoteWithLines["status"], Tone> = {
  draft: "grey",
  sent: "yellow",
  accepted: "green",
  changes_requested: "red",
  expired: "grey",
  cancelled: "grey",
};

const fmtDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "—";

function QuoteReadOnly({ quote }: { quote: QuoteWithLines }) {
  const t = vi.quotes;
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-pt-line p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-pt-text">{format(t.version, { version: quote.version })}</h3>
        <ToneBadge tone={QUOTE_TONE[quote.status]}>{vi.quoteStatus[quote.status]}</ToneBadge>
      </header>
      <QuoteLinesView
        lines={quote.lines}
        subtotal={quote.subtotal}
        vatPercent={quote.vat_percent}
        vatAmount={quote.vat_amount}
        total={quote.total}
      />
      <p className="text-xs text-pt-muted">
        {t.sentAt}: {fmtDateTime(quote.sent_at)} · {t.respondedAt}: {fmtDateTime(quote.responded_at)}
      </p>
      {quote.customer_response_note ? (
        <p className="whitespace-pre-line text-sm">
          <strong>{t.customerNote}:</strong> {quote.customer_response_note}
        </p>
      ) : null}
      {quote.pdf_path ? <QuoteToolbarButton kind="pdf" quoteId={quote.id} /> : null}
    </section>
  );
}

export async function QuotePanel({ leadId, profile }: { leadId: string; profile: Profile }) {
  const pricing = canManagePrices(profile);
  const quotes = visibleQuotes(await listQuotesForLead(leadId), pricing);
  const [latest, ...older] = quotes;

  return (
    <div className="flex flex-col gap-4">
      {/* The page section supplies the "Báo giá" heading; this row holds the version actions. */}
      <div className="flex flex-wrap items-center gap-2 empty:hidden">
        {pricing && !latest ? <QuoteToolbarButton kind="create" leadId={leadId} /> : null}
        {pricing && latest && canCreateNewVersion(latest.status) ? (
          <QuoteToolbarButton kind="new-version" quoteId={latest.id} />
        ) : null}
      </div>
      {!latest ? <p className="text-sm text-pt-muted">{pricing ? vi.quotes.noQuotes : vi.quotes.noSentQuotes}</p> : null}
      {latest && pricing && (latest.status === "draft" || latest.status === "sent") ? (
        <>
          <QuoteEditor key={latest.id} initial={latest} />
          {latest.pdf_path ? <QuoteToolbarButton kind="pdf" quoteId={latest.id} /> : null}
        </>
      ) : latest ? (
        <QuoteReadOnly quote={latest} />
      ) : null}
      {older.map((q) => (
        <QuoteReadOnly key={q.id} quote={q} />
      ))}
    </div>
  );
}
