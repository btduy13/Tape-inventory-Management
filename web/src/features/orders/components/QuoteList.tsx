import { formatVnd, getDictionary } from "@/i18n";
import type { QuoteSummary } from "../server/queries";
import { formatDateTime } from "../lib/timeline";

const t = getDictionary();

/** Read-only quote summary. The editor itself lives in features/quotes. */
export function QuoteList({ quotes }: { quotes: QuoteSummary[] }) {
  if (quotes.length === 0) return <p className="text-sm text-neutral-500">{t.orders.noQuotes}</p>;
  return (
    <ul className="flex flex-col gap-2 text-sm">
      {quotes.map((q) => (
        <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-200 px-3 py-2">
          <span>
            v{q.version} · {t.quoteStatus[q.status]}
          </span>
          <span className="font-medium">{formatVnd(q.total)}</span>
          {q.sent_at && <span className="text-xs text-neutral-500">{formatDateTime(q.sent_at)}</span>}
        </li>
      ))}
    </ul>
  );
}
