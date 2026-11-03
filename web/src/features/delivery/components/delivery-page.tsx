// Server component for /giao/<token>: the courier's view of a delivery note (no login).
import { headers } from "next/headers";
import { vi } from "@/i18n/vi";
import { deliveryCopy as t, fmtDeliveredAt } from "../lib/copy";
import type { DeliveryNoteView } from "../lib/token";
import { loadDeliveryNote } from "../server/load-note";
import { PhotoCapture } from "./photo-capture";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full min-w-0 max-w-md space-y-5 px-4 py-8 text-base">
      <header className="space-y-1">
        <p className="text-sm text-zinc-500">{vi.common.appName}</p>
        <h1 className="text-2xl font-semibold">{t.title}</h1>
      </header>
      {children}
    </main>
  );
}

function NoteSummary({ note }: { note: DeliveryNoteView }) {
  return (
    <dl className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
      <div>
        <dt className="text-sm text-zinc-500">{t.orderName}</dt>
        <dd className="break-words text-xl font-semibold">{note.orderName}</dd>
      </div>
      <div className="flex gap-6">
        <div>
          <dt className="text-sm text-zinc-500">{t.quantity}</dt>
          <dd className="text-lg font-medium">
            {note.quantity.toLocaleString("vi-VN")} {t.quantityUnit}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-sm text-zinc-500">{t.recipient}</dt>
          <dd className="break-words text-lg font-medium">{note.recipientName}</dd>
        </div>
      </div>
    </dl>
  );
}

const Notice = ({ text, tone = "zinc" }: { text: string; tone?: "zinc" | "green" | "amber" }) => (
  <p
    role="status"
    className={
      tone === "green"
        ? "rounded-xl bg-green-50 p-4 text-lg font-semibold text-green-800"
        : tone === "amber"
          ? "rounded-xl bg-amber-50 p-4 text-amber-900"
          : "rounded-xl bg-zinc-100 p-4 text-zinc-800"
    }
  >
    {text}
  </p>
);

export async function DeliveryPage({ token }: { token: string }) {
  const result = await loadDeliveryNote(token, new Headers(await headers()));
  if (result.access === "rate_limited") return <Shell><Notice text={t.errors.rate_limited} /></Shell>;
  if (result.access === "invalid") return <Shell><Notice text={t.invalid} /></Shell>;
  // A replaced note shows nothing about the order: only the newest QR is the valid one.
  if (result.access === "replaced") return <Shell><Notice text={t.replaced} tone="amber" /></Shell>;

  const { note } = result;
  return (
    <Shell>
      <NoteSummary note={note} />
      {result.access === "confirmed" ? (
        <Notice
          tone="green"
          text={t.deliveredAt.replace("{time}", note.confirmedAt ? fmtDeliveredAt(note.confirmedAt) : "")}
        />
      ) : null}
      {result.access === "not_ready" ? <Notice text={t.notReady} tone="amber" /> : null}
      {result.access === "capture" ? <PhotoCapture token={token} /> : null}
    </Shell>
  );
}
