"use client";
// "Tạo phiếu giao hàng": one big button creates the note (Server Action), then the A5 sheet with
// its QR appears with a big "In phiếu" button. The QR token exists only in this response, so a
// reload means creating a new note (which revokes the old, unconfirmed one).
import { useActionState } from "react";
import { ConfirmSubmit } from "@/features/portal-ui/components/ConfirmDialog";
import { ActionStatus } from "@/features/portal-ui/components/States";
import { buttonClass } from "@/features/portal-ui/components/styles";
import { wsCopy } from "../lib/copy";
import { IDLE } from "../lib/schemas";
import { createDeliveryNoteAction, type DeliveryNoteState } from "../server/actions";
import { DeliveryNoteSheet } from "./DeliveryNoteSheet";
import { floorButton, floorButtonGo } from "./ui";

const START: DeliveryNoteState = IDLE;

export function DeliveryNoteMaker({ jobId, nonce }: { jobId: string; nonce?: string }) {
  const [state, action, pending] = useActionState(createDeliveryNoteAction, START);
  const { note, qr } = state;
  if (state.status === "success" && note && qr) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 print:hidden">
          <ActionStatus state={state} />
          <button type="button" onClick={() => window.print()} className={floorButton}>{wsCopy.notePrint}</button>
          <p className="text-sm text-pt-muted">{wsCopy.noteKeepPage}</p>
        </div>
        <DeliveryNoteSheet note={note} qr={qr} nonce={nonce} />
        <form action={action} className="print:hidden">
          <input type="hidden" name="jobId" value={jobId} />
          <ConfirmSubmit
            label={pending ? wsCopy.noteCreating : wsCopy.noteRecreate}
            title={wsCopy.noteRecreate}
            body={wsCopy.noteRecreateHint}
            disabled={pending}
            className={buttonClass("secondary", "md", "w-full")}
          />
        </form>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="jobId" value={jobId} />
      <p className="text-base text-pt-text">{wsCopy.noteIntro}</p>
      <button type="submit" disabled={pending} className={floorButtonGo}>
        {pending ? wsCopy.noteCreating : wsCopy.noteCreate}
      </button>
      <p className="text-sm text-pt-muted">{wsCopy.noteRecreateHint}</p>
      <ActionStatus state={state} />
    </form>
  );
}
