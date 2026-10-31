"use client";
// Customer Accept / Request changes form on /q/<token>.
import { useState } from "react";
import { vi } from "@/i18n/vi";
import { ROUTES } from "@/lib/routes";
import { RESPONSE_NOTE_MAX } from "../lib/schemas";

type Phase = "idle" | "sending" | "accepted" | "changes_requested";

const ERRORS: Record<string, string> = {
  rate_limited: vi.common.errorRateLimited,
  already_used: vi.quotes.alreadyResponded,
  invalid_token: vi.quotes.linkExpired,
  quote_expired: vi.quotes.quoteExpired,
  invalid_body: vi.quotes.changesNoteRequired,
};

export function RespondForm({ token }: { token: string }) {
  const t = vi.quotes;
  const [note, setNote] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(action: "accept" | "request_changes") {
    setError(null);
    if (action === "request_changes" && note.trim().length < 3) return setError(t.changesNoteRequired);
    if (action === "accept" && !window.confirm(t.acceptConfirm)) return;
    setPhase("sending");
    try {
      const res = await fetch(ROUTES.api.quoteRespond(token), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: note.trim() || undefined }),
        credentials: "omit",
        cache: "no-store",
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; result?: Phase; error?: string };
      if (res.ok && body.ok && body.result) return setPhase(body.result);
      setError(ERRORS[body.error ?? ""] ?? vi.common.errorGeneric);
    } catch {
      setError(vi.common.errorGeneric);
    }
    setPhase("idle");
  }

  if (phase === "accepted") return <p className="font-medium text-green-700">{t.thanksAccepted}</p>;
  if (phase === "changes_requested") return <p className="font-medium text-green-700">{t.thanksChanges}</p>;

  const busy = phase === "sending";
  return (
    <div className="space-y-3">
      <label className="flex flex-col gap-1 text-sm">
        {t.responseNote}
        <textarea
          className="rounded border border-zinc-300 px-2 py-1"
          rows={3}
          maxLength={RESPONSE_NOTE_MAX}
          placeholder={t.responseNotePlaceholder}
          value={note}
          disabled={busy}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded bg-green-700 px-4 py-2 text-white disabled:opacity-50"
          disabled={busy}
          onClick={() => submit("accept")}
        >
          {t.accept}
        </button>
        <button
          type="button"
          className="rounded border border-zinc-400 px-4 py-2 disabled:opacity-50"
          disabled={busy}
          onClick={() => submit("request_changes")}
        >
          {t.requestChanges}
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
