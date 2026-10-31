"use client";
import { useActionState, useEffect, useRef } from "react";
import { getDictionary } from "@/i18n";
import { addNoteAction } from "../server/actions";
import { IDLE } from "../lib/action-state";
import { ActionMessage, fieldClass, primaryButtonClass } from "./ActionMessage";

const t = getDictionary();

export function NoteForm({ leadId }: { leadId: string }) {
  const [state, action, pending] = useActionState(addNoteAction, IDLE);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3">
      <input type="hidden" name="leadId" value={leadId} />
      <label className="flex flex-col gap-1 text-sm">
        {t.orders.addNote}
        <textarea name="body" required maxLength={4000} rows={3} className={fieldClass} />
      </label>
      <ActionMessage state={state} />
      <button type="submit" disabled={pending} className={primaryButtonClass}>{t.orders.addNote}</button>
    </form>
  );
}
