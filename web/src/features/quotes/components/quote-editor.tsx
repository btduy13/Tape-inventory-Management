"use client";
// Price editor for one quote version (admin/manager). Totals shown are the DB values;
// while there are unsaved edits a browser-side estimate is shown and labelled as such.
// Mounted with key = quote id: a server refresh (revalidatePath after save/send) syncs the
// new props in place instead of remounting, so the success message stays visible.
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, formatVnd } from "@/i18n";
import { vi } from "@/i18n/vi";
import { emptyLine, parseMoney, parseQty, toEditorState, toSaveInput, type EditorState } from "../lib/editor-state";
import { isEditable, isSendable } from "../lib/rules";
import { estimateTotals } from "../lib/totals";
import type { QuoteWithLines } from "../lib/types";
import { saveQuoteDraftAction } from "../server/actions-edit";
import { sendQuoteAction } from "../server/actions-send";
import { ToneBadge } from "@/features/portal-ui/components/StatusBadge";
import { buttonClass, inputClass, textareaClass } from "@/features/portal-ui/components/styles";
import { QuoteLineRow } from "./quote-line-row";

const t = vi.quotes;

export function QuoteEditor({ initial }: { initial: QuoteWithLines }) {
  const router = useRouter();
  const [quote, setQuote] = useState(initial);
  const [form, setForm] = useState<EditorState>(() => toEditorState(initial));
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [seenVersion, setSeenVersion] = useState(`${initial.updated_at}:${initial.status}`);
  const incoming = `${initial.updated_at}:${initial.status}`;
  if (incoming !== seenVersion && !dirty) {
    // Newer server data (another tab, send, realtime refresh): adopt it without remounting.
    setSeenVersion(incoming);
    setQuote(initial);
    setForm(toEditorState(initial));
  }
  const editable = isEditable(quote.status);

  const estimate = useMemo(
    () =>
      estimateTotals(
        form.lines.map((l) => ({ quantity: parseQty(l.quantity), unitPrice: parseMoney(l.unitPrice) })),
        parseQty(form.vatPercent),
      ),
    [form],
  );

  function update(patch: Partial<EditorState>) {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  }

  function save(then?: () => void) {
    startTransition(async () => {
      const res = await saveQuoteDraftAction(toSaveInput(quote.id, form));
      if (!res.ok) return setMessage({ kind: "error", text: res.error });
      setQuote(res.data);
      setSeenVersion(`${res.data.updated_at}:${res.data.status}`);
      setForm(toEditorState(res.data));
      setDirty(false);
      setMessage({ kind: "ok", text: vi.common.savedSuccess });
      then?.();
    });
  }

  function send() {
    setConfirming(false);
    startTransition(async () => {
      const res = await sendQuoteAction(quote.id);
      setMessage(res.ok ? { kind: "ok", text: t.sentSuccess } : { kind: "error", text: res.error });
      if (res.ok) router.refresh();
    });
  }

  const totals = dirty ? estimate : { subtotal: quote.subtotal, vatAmount: quote.vat_amount, total: quote.total };

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-pt-line p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-pt-text">{format(t.version, { version: quote.version })}</h3>
        <ToneBadge tone={quote.status === "sent" ? "yellow" : "grey"}>{`${t.status}: ${vi.quoteStatus[quote.status]}`}</ToneBadge>
      </header>
      {!editable ? <p className="text-sm text-pt-yellow-ink">{t.readOnlyHint}</p> : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-xs text-pt-muted">
            <tr className="border-b border-pt-line text-left">
              <th className="py-2 font-semibold">{t.description}</th>
              <th className="font-semibold">{t.unit}</th>
              <th className="text-right font-semibold">{t.quantity}</th>
              <th className="text-right font-semibold">{t.unitPrice}</th>
              <th className="pr-2 text-right font-semibold">{t.lineTotal}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {form.lines.map((line, i) => (
              <QuoteLineRow
                key={line.key}
                line={line}
                disabled={!editable || pending}
                canRemove={form.lines.length > 1}
                onChange={(patch) =>
                  update({ lines: form.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) })
                }
                onRemove={() => update({ lines: form.lines.filter((_, j) => j !== i) })}
              />
            ))}
          </tbody>
        </table>
      </div>
      {editable ? (
        <button
          type="button"
          className={buttonClass("ghost", "sm", "self-start text-vt-blue")}
          disabled={pending || form.lines.length >= 50}
          onClick={() => update({ lines: [...form.lines, emptyLine()] })}
        >
          + {t.addLine}
        </button>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-pt-text">
          {t.vatPercent}
          <input
            className={inputClass}
            inputMode="decimal"
            value={form.vatPercent}
            disabled={!editable || pending}
            onChange={(e) => update({ vatPercent: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-pt-text">
          {t.validUntil}
          <input
            type="date"
            className={inputClass}
            value={form.validUntil}
            disabled={!editable || pending}
            onChange={(e) => update({ validUntil: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-pt-text sm:col-span-3">
          {t.notes}
          <textarea
            className={textareaClass}
            rows={3}
            maxLength={4000}
            value={form.notes}
            disabled={!editable || pending}
            onChange={(e) => update({ notes: e.target.value })}
          />
        </label>
      </div>

      <dl className="ml-auto grid w-full max-w-xs grid-cols-2 gap-y-1 text-sm tabular-nums">
        <dt>{t.subtotal}</dt>
        <dd className="text-right">{formatVnd(totals.subtotal)}</dd>
        <dt>{t.vat}</dt>
        <dd className="text-right">{formatVnd(totals.vatAmount)}</dd>
        <dt className="border-t border-pt-line pt-1 font-semibold">{t.total}</dt>
        <dd className="border-t border-pt-line pt-1 text-right text-base font-bold">{formatVnd(totals.total)}</dd>
      </dl>
      <p className="text-right text-xs text-pt-muted">{dirty ? t.estimateHint : t.savedTotalsHint}</p>

      <div className="flex flex-wrap items-center gap-2">
        {editable ? (
          <button
            type="button"
            className={buttonClass("secondary")}
            disabled={pending || !dirty}
            onClick={() => save()}
          >
            {t.saveDraft}
          </button>
        ) : null}
        {isSendable(quote.status) && !confirming ? (
          <button
            type="button"
            className={buttonClass("primary")}
            disabled={pending}
            onClick={() => setConfirming(true)}
          >
            {t.send}
          </button>
        ) : null}
        {isSendable(quote.status) && confirming ? (
          <span role="group" aria-label={t.sendConfirm} className="flex flex-wrap items-center gap-2 rounded-lg bg-pt-yellow-tint p-2">
            <span className="text-sm font-medium text-pt-text">{t.sendConfirm}</span>
            <button
              type="button"
              className={buttonClass("primary")}
              disabled={pending}
              onClick={() => (dirty ? save(send) : send())}
            >
              {vi.common.confirm}
            </button>
            <button
              type="button"
              className={buttonClass("secondary", "sm")}
              disabled={pending}
              onClick={() => setConfirming(false)}
            >
              {vi.common.cancel}
            </button>
          </span>
        ) : null}
        {pending ? <span className="text-sm text-pt-muted">{vi.common.loading}</span> : null}
      </div>
      {message ? (
        <p role="status" className={`rounded-lg px-3 py-2 text-sm font-medium ${message.kind === "ok" ? "bg-pt-green-tint text-pt-green-ink" : "bg-pt-red-tint text-pt-red-ink"}`}>
          {message.text}
        </p>
      ) : null}
    </section>
  );
}
