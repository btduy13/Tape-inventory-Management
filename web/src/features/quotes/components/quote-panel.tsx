// Server component embedded in the lead detail page (portal/admin).
// admin/manager: editor for the latest version + actions. staff/ctv: read-only (RLS limits rows).
import { format } from "@/i18n";
import { vi } from "@/i18n/vi";
import { canManagePrices } from "@/lib/auth/roles";
import type { Profile } from "@/lib/types";
import { canCreateNewVersion } from "../lib/rules";
import type { QuoteWithLines } from "../lib/types";
import { listQuotesForLead } from "../server/queries";
import { QuoteEditor } from "./quote-editor";
import { QuoteLinesView } from "./quote-lines-view";
import { QuoteToolbarButton } from "./quote-toolbar";

const fmtDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "—";

function QuoteReadOnly({ quote }: { quote: QuoteWithLines }) {
  const t = vi.quotes;
  return (
    <section className="space-y-2 rounded border border-zinc-200 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{format(t.version, { version: quote.version })}</h3>
        <span className="text-sm text-zinc-600">{vi.quoteStatus[quote.status]}</span>
      </header>
      <QuoteLinesView
        lines={quote.lines}
        subtotal={quote.subtotal}
        vatPercent={quote.vat_percent}
        vatAmount={quote.vat_amount}
        total={quote.total}
      />
      <p className="text-xs text-zinc-500">
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
  const quotes = await listQuotesForLead(leadId);
  const pricing = canManagePrices(profile);
  const [latest, ...older] = quotes;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{vi.quotes.title}</h2>
        {pricing && !latest ? <QuoteToolbarButton kind="create" leadId={leadId} /> : null}
        {pricing && latest && canCreateNewVersion(latest.status) ? (
          <QuoteToolbarButton kind="new-version" quoteId={latest.id} />
        ) : null}
      </div>
      {!latest ? <p className="text-sm text-zinc-500">{vi.quotes.noQuotes}</p> : null}
      {latest && pricing && (latest.status === "draft" || latest.status === "sent") ? (
        <>
          <QuoteEditor key={`${latest.id}:${latest.updated_at}`} initial={latest} />
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
