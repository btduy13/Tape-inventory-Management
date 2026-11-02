"use client";
import { useActionState, useEffect, useRef } from "react";
import { getDictionary } from "@/i18n";
import { ActionStatus } from "@/features/portal-ui/components/States";
import { TextareaField } from "@/features/portal-ui/components/Field";
import { buttonClass } from "@/features/portal-ui/components/styles";
import { addNoteAction } from "../server/actions";
import { IDLE } from "../lib/action-state";

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
      <TextareaField label={t.orders.addNote} hint={t.leadsUi.noteAddHint} name="body" required maxLength={2000} rows={3} />
      <ActionStatus state={state} />
      <button type="submit" disabled={pending} className={buttonClass("secondary")}>{t.orders.addNote}</button>
    </form>
  );
}
