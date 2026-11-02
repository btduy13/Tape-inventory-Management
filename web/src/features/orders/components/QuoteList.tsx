import { formatVnd, format, getDictionary } from "@/i18n";
import type { QuoteSummary } from "../server/queries";
import { formatDateTime } from "../lib/timeline";

const t = getDictionary();

/** Read-only quote summary. The editor itself lives in features/quotes. */
export function QuoteList({ quotes }: { quotes: QuoteSummary[] }) {
  if (quotes.length === 0) return <p className="text-sm text-pt-muted">{t.orders.noQuotes}</p>;
  return (
    <ul className="flex flex-col divide-y divide-pt-line text-sm">
      {quotes.map((q) => (
        <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
          <span>{format(t.quotes.version, { version: q.version })}, {t.quoteStatus[q.status]}</span>
          <span className="font-semibold tabular-nums">{formatVnd(q.total)}</span>
          {q.sent_at && <span className="w-full text-xs text-pt-muted">{formatDateTime(q.sent_at)}</span>}
        </li>
      ))}
    </ul>
  );
}
