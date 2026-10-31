"use client";
import { useActionState } from "react";
import { getDictionary } from "@/i18n";
import type { LeadStatus } from "@/lib/types";
import { convertToProductionAction } from "../server/actions-production";
import { IDLE } from "../lib/schemas";
import { ActionMessage, primaryButton } from "./ui";

const t = getDictionary();

type Props = { leadId: string; status: LeadStatus; productionOrderId: string | null };

/** Enabled only for accepted leads; the RPC re-checks status, admin role and idempotency. */
export function ConvertToProductionButton({ leadId, status, productionOrderId }: Props) {
  const [state, action, pending] = useActionState(convertToProductionAction, IDLE);
  if (productionOrderId) {
    return <p className="text-sm">{t.admin.productionOrder}: <span className="font-mono">{productionOrderId}</span></p>;
  }
  const ready = status === "accepted";
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(t.admin.toProductionConfirm)) e.preventDefault();
      }}
      className="flex flex-col gap-2"
    >
      <input type="hidden" name="leadId" value={leadId} />
      <button type="submit" disabled={pending || !ready} className={`self-start ${primaryButton}`}>
        {t.admin.toProduction}
      </button>
      {!ready && <p className="text-xs text-neutral-500">{t.admin.toProductionNotReady}</p>}
      <ActionMessage state={state} />
    </form>
  );
}
