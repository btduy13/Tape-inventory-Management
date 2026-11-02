"use client";
// Button that opens a form in a native <dialog> (focus trap, Esc). The form calls `done(message)`
// on success: the dialog closes and a toast confirms. Errors stay inside the dialog.
import { useEffect, useId, useRef, useState } from "react";
import { getDictionary } from "@/i18n";
import { Icon } from "@/features/portal-ui/components/Icon";
import { Toast, type ToastMessage } from "@/features/portal-ui/components/Toast";
import { buttonClass } from "@/features/portal-ui/components/styles";
import { nextToast } from "./useOnSuccess";

const a = getDictionary().adminUi;

type Props = {
  label: string;
  title: string;
  description?: string;
  icon?: "plus";
  triggerClassName?: string;
  children: (done: (message?: string) => void) => React.ReactNode;
};

export function FormDialog({ label, title, description, icon, triggerClassName, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const done = (message?: string) => {
    setOpen(false);
    if (message) setToast(nextToast(message));
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={triggerClassName ?? buttonClass("primary")}>
        {icon && <Icon name={icon} className="size-4" />}
        {label}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        className="pt-dialog m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border border-pt-line bg-pt-surface p-0 text-pt-text"
      >
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
              {description && <p className="text-sm text-pt-muted">{description}</p>}
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label={a.close} className={buttonClass("ghost", "sm", "-mr-2 -mt-2")}>
              <Icon name="close" className="size-5" />
            </button>
          </div>
          {/* Mounted only while open: every opening starts from a fresh form. */}
          {open && children(done)}
        </div>
      </dialog>
      <Toast toast={toast} />
    </>
  );
}
