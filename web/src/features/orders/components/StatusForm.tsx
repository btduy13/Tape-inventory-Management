"use client";
import { useActionState } from "react";
import { getDictionary } from "@/i18n";
import type { LeadStatus } from "@/lib/types";
import { changeStatusAction } from "../server/actions";
import { IDLE } from "../lib/action-state";
import { ActionMessage, fieldClass, primaryButtonClass } from "./ActionMessage";

const t = getDictionary();

/** `options` comes from nextStatusOptions(role, status) on the server; the DB re-checks. */
export function StatusForm({ leadId, options }: { leadId: string; options: LeadStatus[] }) {
  const [state, action, pending] = useActionState(changeStatusAction, IDLE);
  if (options.length === 0) {
    return <p className="text-sm text-neutral-500">{t.orders.noOptions}</p>;
  }
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="leadId" value={leadId} />
      <label className="flex flex-col gap-1 text-sm">
        {t.orders.changeStatus}
        <select name="to" required defaultValue="" className={fieldClass}>
          <option value="" disabled>{t.orders.selectStatus}</option>
          {options.map((s) => <option key={s} value={s}>{t.leadStatus[s]}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {t.orders.statusNote}
        <textarea name="note" maxLength={1000} rows={2} className={fieldClass} />
      </label>
      <ActionMessage state={state} />
      <button type="submit" disabled={pending} className={primaryButtonClass}>{t.orders.changeStatus}</button>
    </form>
  );
}
