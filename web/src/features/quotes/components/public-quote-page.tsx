// Server component for /q/<token>: the customer's view of a sent quote.
import { headers } from "next/headers";
import { format } from "@/i18n";
import { vi } from "@/i18n/vi";
import { loadPublicQuote } from "../server/public-quote";
import { QuoteLinesView } from "./quote-lines-view";
import { RespondForm } from "./respond-form";

const fmtDate = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T00:00:00+07:00` : iso).toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
  });

function Message({ text }: { text: string }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16 text-center">
      <p className="text-lg">{text}</p>
    </main>
  );
}

export async function PublicQuotePage({ token }: { token: string }) {
  const result = await loadPublicQuote(token, new Headers(await headers()));
  if (result.access === "rate_limited") return <Message text={vi.common.errorRateLimited} />;
  if (result.access === "invalid") return <Message text={vi.quotes.linkExpired} />;

  const { quote } = result;
  const t = vi.quotes;
  return (
    <main className="mx-auto w-full min-w-0 max-w-3xl space-y-6 px-4 py-10">
      <header className="space-y-1">
        <p className="text-sm text-zinc-500">{vi.common.appName}</p>
        <h1 className="text-2xl font-semibold">{format(t.pageTitle, { code: quote.code })}</h1>
        <p>{format(t.greeting, { name: quote.customerName })}</p>
        <p className="text-zinc-700">{t.intro}</p>
        <p className="text-sm text-zinc-500">
          {format(t.version, { version: quote.version })}
          {quote.validUntil ? ` · ${t.validUntil}: ${fmtDate(quote.validUntil)}` : ""}
        </p>
      </header>

      <QuoteLinesView
        lines={quote.lines}
        subtotal={quote.subtotal}
        vatPercent={quote.vatPercent}
        vatAmount={quote.vatAmount}
        total={quote.total}
      />
      {quote.notes ? <p className="whitespace-pre-line text-sm text-zinc-700">{quote.notes}</p> : null}

      {result.access === "open" ? <RespondForm token={token} /> : null}
      {result.access === "used" ? (
        <p className="font-medium text-green-700">
          {t.alreadyResponded} ({vi.quoteStatus[quote.status]})
        </p>
      ) : null}
      {result.access === "quote_expired" ? <p className="text-amber-700">{t.quoteExpired}</p> : null}
    </main>
  );
}
