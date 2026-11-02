"use client";
// Native <dialog> (focus trap, Esc, inert background for free). Two ways to use it:
//   <ConfirmDialog open onConfirm onCancel .../>      controlled, for client logic
//   <ConfirmSubmit label title .../> inside a <form>  asks first, then submits that form
import { useEffect, useId, useRef, useState } from "react";
import { getDictionary } from "@/i18n";
import { buttonClass } from "./styles";

const p = getDictionary().portalUi;

type Tone = "primary" | "danger";

type DialogProps = {
  open: boolean;
  title: string;
  body?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
  onCancel: () => void;
  /** Omit when the confirm button submits a form (`confirmSubmit`). */
  onConfirm?: () => void;
  /** Render the confirm button as type=submit (name/value are sent with the form). */
  confirmSubmit?: { name?: string; value?: string };
};

export function ConfirmDialog({ open, title, body, confirmLabel = p.confirm, cancelLabel = p.cancel, tone = "primary", onCancel, onConfirm, confirmSubmit }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={body ? bodyId : undefined}
      onClose={onCancel}
      className="pt-dialog m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-pt-line bg-pt-surface p-0 text-pt-text"
    >
      <div className="flex flex-col gap-3 p-5">
        <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
        {body && <div id={bodyId} className="text-sm text-pt-muted">{body}</div>}
        <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {/* Cancel first in DOM order after reverse: gets initial focus (safe default). */}
          <button type="button" autoFocus onClick={onCancel} className={buttonClass("secondary")}>{cancelLabel}</button>
          {confirmSubmit ? (
            // Closing on click does not stop the submit: the button stays in the form's DOM.
            <button type="submit" name={confirmSubmit.name} value={confirmSubmit.value} onClick={onCancel} className={buttonClass(tone === "danger" ? "danger" : "primary")}>
              {confirmLabel}
            </button>
          ) : (
            <button type="button" onClick={onConfirm} className={buttonClass(tone === "danger" ? "danger" : "primary")}>{confirmLabel}</button>
          )}
        </div>
      </div>
    </dialog>
  );
}

type SubmitProps = {
  /** Trigger button text. */
  label: string;
  title: string;
  body?: React.ReactNode;
  confirmLabel?: string;
  tone?: Tone;
  disabled?: boolean;
  name?: string;
  value?: string;
  className?: string;
};

/** Place inside a <form>: the trigger opens the dialog, the confirm button submits the form. */
export function ConfirmSubmit({ label, title, body, confirmLabel, tone = "primary", disabled, name, value, className }: SubmitProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" disabled={disabled} onClick={() => setOpen(true)} className={className ?? buttonClass(tone === "danger" ? "danger" : "primary")}>
        {label}
      </button>
      <ConfirmDialog
        open={open}
        title={title}
        body={body}
        confirmLabel={confirmLabel ?? label}
        tone={tone}
        onCancel={() => setOpen(false)}
        confirmSubmit={{ name, value }}
      />
    </>
  );
}
