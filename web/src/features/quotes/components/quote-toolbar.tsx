"use client";
// Small action buttons around the quote list: create draft, new version, open PDF.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { vi } from "@/i18n/vi";
import { buttonClass } from "@/features/portal-ui/components/styles";
import { createDraftQuoteAction, createQuoteVersionAction, getQuotePdfUrlAction } from "../server/actions-edit";

type Props =
  | { kind: "create"; leadId: string }
  | { kind: "new-version"; quoteId: string }
  | { kind: "pdf"; quoteId: string };

const btnFor = (kind: Props["kind"]) => buttonClass(kind === "pdf" ? "ghost" : kind === "create" ? "primary" : "secondary", "sm");

export function QuoteToolbarButton(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const t = vi.quotes;

  function run() {
    setError(null);
    startTransition(async () => {
      if (props.kind === "pdf") {
        const res = await getQuotePdfUrlAction(props.quoteId);
        if (!res.ok) return setError(res.error);
        window.open(res.data, "_blank", "noopener,noreferrer");
        return;
      }
      const res =
        props.kind === "create"
          ? await createDraftQuoteAction(props.leadId)
          : await createQuoteVersionAction(props.quoteId);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  const label = props.kind === "create" ? t.createQuote : props.kind === "new-version" ? t.newVersion : t.downloadPdf;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" className={btnFor(props.kind)} disabled={pending} onClick={run}>
        {pending ? vi.common.loading : label}
      </button>
      {error ? (
        <span role="alert" className="text-sm font-medium text-pt-red-ink">
          {error}
        </span>
      ) : null}
    </span>
  );
}
