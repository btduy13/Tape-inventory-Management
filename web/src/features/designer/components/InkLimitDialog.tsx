"use client";
// Warning dialog when the logo alone, or logo + text, needs more than 3 print inks.
// Opens once per over-limit situation (logo + ink count); never blocks the quote.
// Accessible modal: role=dialog + aria-modal, focus moves in, Tab is trapped, Esc closes,
// focus returns to the control that had it.
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { format, getDictionary } from "@/i18n";
import { MAX_COLORS } from "../lib/constants";
import { useDesignState } from "./hooks";
import { inkCountText, useInks } from "./InkCounter";
import { btnBrand, btnGhost, btnSecondary } from "./ui";

/** Business contact (CONTACT_* env, lead-intake contactInfoFromEnv), passed by the page. */
export type DesignerContact = { phone: string | null; phoneHref: string | null };

/** zalo.me link from a Vietnamese tel: href (+84 / 84 / 0 prefixes), else null. */
export function zaloHref(phoneHref: string | null): string | null {
  const d = phoneHref?.replace(/^tel:/, "").replace(/^\+?84/, "0") ?? "";
  return /^0\d{8,10}$/.test(d) ? `https://zalo.me/${d}` : null;
}

type Props = {
  contact?: DesignerContact | null;
  /** No phone: open the quote form instead. */
  onContactForm: () => void;
  /** Show the logo picker (content step + file input). */
  onChangeLogo: () => void;
};

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function InkLimitDialog({ contact, onContactForm, onChangeLogo }: Props) {
  const t = getDictionary().designer;
  const [s] = useDesignState();
  const inks = useInks();
  const titleId = useId();
  const bodyId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);

  // One key per over-limit situation: a new logo or a higher count re-opens the dialog.
  const key = inks.overLimit ? `${s.logo?.url ?? ""}|${inks.logoCount}|${inks.count}` : null;
  const open = key !== null && key !== dismissed;
  const close = () => setDismissed(key);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Start on the main action (contact); the close button stays first in Tab order.
    (boxRef.current?.querySelector<HTMLElement>("[data-autofocus]") ?? boxRef.current?.querySelector<HTMLElement>(FOCUSABLE))?.focus();
    return () => {
      if (prev?.isConnected) prev.focus();
    };
  }, [open]);

  if (!open) return null;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== "Tab") return;
    const items = [...(boxRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const logoOver = inks.logoCount > MAX_COLORS;
  const zalo = zaloHref(contact?.phoneHref ?? null);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-slate-900/50 transition-opacity duration-200 ease-out starting:opacity-0 motion-reduce:transition-none" aria-hidden="true" onClick={close} />
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        onKeyDown={onKeyDown}
        className="relative flex transition-[opacity,transform] duration-200 ease-out starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none w-full max-w-md flex-col gap-4 rounded-2xl bg-white p-5 shadow-xl sm:p-6"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-700" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
            </svg>
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 id={titleId} className="text-base font-semibold text-slate-900">{t.inkDialogTitle}</h2>
            <div id={bodyId} className="flex flex-col gap-2 text-sm leading-6 text-slate-700">
              <p>{format(logoOver ? t.inkDialogBodyLogo : t.inkDialogBodyTotal, { count: inkCountText(logoOver ? inks.logoCount : inks.count) })}</p>
              <p>{t.inkDialogHelp}</p>
            </div>
          </div>
          <button type="button" onClick={close} aria-label={t.inkClose} className={`${btnGhost} -mt-2 -mr-2 h-11 w-11 shrink-0 px-0`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {contact?.phoneHref ? (
            <a href={contact.phoneHref} onClick={close} className={btnBrand} data-autofocus>
              {format(t.inkContactCall, { phone: contact.phone ?? "" })}
            </a>
          ) : (
            <button
              type="button"
              onClick={() => {
                close();
                onContactForm();
              }}
              className={btnBrand}
              data-autofocus
            >
              {t.inkContact}
            </button>
          )}
          {zalo && (
            <a href={zalo} target="_blank" rel="noopener noreferrer" onClick={close} className={btnSecondary}>
              {t.inkContactZalo}
            </a>
          )}
          {s.logo && (
            <button
              type="button"
              onClick={() => {
                close();
                onChangeLogo();
              }}
              className={btnSecondary}
            >
              {t.inkChangeLogo}
            </button>
          )}
          <button type="button" onClick={close} className={btnGhost}>
            {t.inkLater}
          </button>
        </div>
      </div>
    </div>
  );
}
