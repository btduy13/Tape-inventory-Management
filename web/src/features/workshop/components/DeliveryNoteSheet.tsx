// The printable A5 delivery note: order name, specs, recipient, dates, QR, signatures.
// Print rules: Tailwind print: variants here; the page size and "print only the sheet" rule are
// a nonce'd <style> (CSP style-src is nonce-only), rendered only while a sheet is on screen.
import { format, getDictionary } from "@/i18n";
import { wsCopy } from "../lib/copy";
import { formatDueDate } from "../lib/dates";
import type { PrintableNote } from "../lib/delivery";
import { formatSize } from "../lib/group";

const t = getDictionary();

export const PRINT_CSS =
  "@page{size:A5 portrait;margin:8mm}" +
  "@media print{body *:not(:has([data-print-sheet])):not([data-print-sheet]):not([data-print-sheet] *){display:none!important}" +
  // The sheet's ancestors keep their screen padding / gaps / min-height: drop them so A5 stays 1 page.
  "body *:has([data-print-sheet]){padding:0!important;margin:0!important;gap:0!important;min-height:0!important}}";

const dateTime = (iso: string) =>
  new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(iso));

function Line({ label, value, big = false }: { label: string; value: string | null; big?: boolean }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-2 border-t border-black/20 py-1.5 first:border-t-0">
      <dt className="text-sm text-black/70">{label}</dt>
      <dd className={`min-w-0 break-words ${big ? "text-lg font-bold" : "text-base"}`}>{value || "—"}</dd>
    </div>
  );
}

function SignBox({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-xs text-black/70">{wsCopy.noteSignHint}</span>
      <span className="h-16" aria-hidden />
    </div>
  );
}

export function DeliveryNoteSheet({ note, qr, nonce }: { note: PrintableNote; qr: string; nonce?: string }) {
  const qty = `${note.quantity.toLocaleString("vi-VN")} cuộn`;
  return (
    <article
      data-print-sheet
      aria-label={wsCopy.noteTitle}
      className="mx-auto flex w-full max-w-[148mm] flex-col gap-3 rounded-xl border border-pt-line bg-white p-5 text-black print:max-w-none print:break-inside-avoid print:rounded-none print:border-0 print:p-0"
    >
      <style nonce={nonce}>{PRINT_CSS}</style>
      <header className="flex items-start justify-between gap-3 border-b-2 border-black pb-2">
        <div className="flex flex-col">
          <span className="text-sm font-semibold">{wsCopy.noteBrand}</span>
          <h2 className="text-2xl font-black uppercase tracking-tight">{wsCopy.noteTitle}</h2>
        </div>
        <span className="text-right text-xs">
          {wsCopy.noteCreatedAt}
          <br />
          {dateTime(note.createdAt)}
        </span>
      </header>
      <div className="flex flex-col">
        <p className="text-xl font-bold leading-snug" data-testid="note-name">{note.orderName}</p>
        {note.orderId && <p className="text-xs text-black/70">{format(wsCopy.noteCode, { code: note.orderId })}</p>}
      </div>
      <dl>
        <Line label={wsCopy.specs} value={formatSize(note)} />
        <Line label={wsCopy.quantity} value={qty} big />
        {note.colors?.length ? <Line label={t.workshop.colors} value={note.colors.join(", ")} /> : null}
        {note.printText && <Line label={t.workshop.printText} value={`“${note.printText}”`} />}
        <Line label={wsCopy.noteDue} value={formatDueDate(note.dueDate)} />
      </dl>
      <dl className="rounded-lg border-2 border-black px-3 py-1">
        <Line label={wsCopy.noteRecipient} value={note.recipientName} big />
        <Line label={wsCopy.notePhone} value={note.recipientPhone} big />
        <Line label={wsCopy.noteAddress} value={note.recipientAddress} />
      </dl>
      <div className="flex items-center gap-4">
        {/* Server-rendered SVG from the qrcode package (our own URL; presentation attributes only, no style). */}
        <div
          role="img"
          aria-label={wsCopy.noteScan}
          className="size-36 shrink-0 [&_svg]:size-full"
          dangerouslySetInnerHTML={{ __html: qr }}
        />
        <p className="text-sm font-medium">{wsCopy.noteScan}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 border-t border-black/20 pt-2">
        <SignBox label={wsCopy.noteSignShipper} />
        <SignBox label={wsCopy.noteSignReceiver} />
      </div>
    </article>
  );
}
