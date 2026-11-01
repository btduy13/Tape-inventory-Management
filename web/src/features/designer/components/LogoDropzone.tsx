"use client";
// Logo file picker: Vietnamese drop zone (drag-and-drop or click), spinner, thumbnail + file name.
// Checks here are UX only; lead-intake's server re-validates and re-sanitizes.
import { useId, useRef, useState, type DragEvent } from "react";
import { getDictionary } from "@/i18n";
import { analyzeLogoUrl } from "../lib/logo-colors-dom";
import { loadLogoFile } from "../lib/logo-load";
import { useDesignState } from "./hooks";
import { focusRing } from "./ui";

export const LOGO_ACCEPT =
  "image/png,image/jpeg,image/svg+xml,image/webp,image/gif,.png,.jpg,.jpeg,.svg,.webp,.gif";

export function LogoDropzone() {
  const t = getDictionary().designer;
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [s, dispatch] = useDesignState();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);

  const errorText = { tooLarge: t.logoTooLarge, invalidType: t.logoInvalidType, empty: t.logoEmpty, decode: t.logoDecodeError } as const;

  async function onFile(file: File | undefined) {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await loadLogoFile(file);
      if (res.ok) {
        dispatch({ type: "setLogo", logo: res.logo });
        // Count the logo's inks in the background (max-3-ink rule); the reducer ignores a stale result.
        const { url, width, height } = res.logo;
        void analyzeLogoUrl(url, width, height).then((a) =>
          dispatch({ type: "setLogoInks", url, inks: a ? a.inks : null }),
        );
      } else setError(errorText[res.error]);
    } catch {
      setError(t.logoDecodeError);
    } finally {
      setBusy(false);
    }
  }

  const onDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setOver(false);
    void onFile(e.dataTransfer.files?.[0]);
  };
  const onDragOver = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setOver(true);
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={LOGO_ACCEPT}
        disabled={busy}
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
        className="sr-only"
        data-testid="logo-input"
      />
      {s.logo ? (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={() => setOver(false)}
          className={`flex min-w-0 flex-wrap items-center gap-3 rounded-xl border p-3 transition-colors duration-150 motion-reduce:transition-none ${over ? "border-vt-navy bg-vt-navy/5" : "border-slate-200 bg-white"}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- blob: preview of a local file */}
          <img src={s.logo.url} alt={t.logoThumbAlt} className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 bg-slate-100 object-contain" />
          <div className="min-w-0 flex-1 basis-32 text-sm">
            <p className="truncate font-medium text-slate-900" title={s.logo.file.name}>{s.logo.file.name}</p>
            <p className="text-xs text-slate-600 tabular-nums">{s.logo.width} × {s.logo.height}px · {Math.max(1, Math.round(s.logo.file.size / 1024))}KB</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <label htmlFor={inputId} className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 transition-colors duration-150 hover:border-slate-500 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-slate-900 motion-reduce:transition-none">
              {busy ? t.logoLoading : t.logoChange}
            </label>
            <button
              type="button"
              onClick={() => dispatch({ type: "setLogo", logo: null })}
              className={`inline-flex min-h-11 cursor-pointer items-center rounded-lg px-3 text-sm font-medium text-red-700 transition-colors duration-150 hover:bg-red-50 motion-reduce:transition-none ${focusRing}`}
            >
              {t.logoRemove}
            </button>
          </div>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={() => setOver(false)}
          aria-busy={busy}
          className={`flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center text-sm transition-colors duration-150 motion-reduce:transition-none focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-slate-900 ${
            over ? "border-vt-navy bg-vt-navy/5" : "border-slate-300 bg-slate-50/50 hover:border-slate-500 hover:bg-slate-50"
          }`}
        >
          {busy ? (
            <span className="flex items-center gap-2 text-slate-700" role="status">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-700 border-t-transparent motion-reduce:animate-none" aria-hidden="true" />
              {t.logoLoading}
            </span>
          ) : (
            <>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
              </svg>
              <span className="font-semibold text-slate-900">{t.logoDrop}</span>
              <span className="text-xs text-slate-600">{t.logoHint}</span>
            </>
          )}
        </label>
      )}
      {error && <p role="alert" className="text-xs leading-5 font-medium text-red-700">{error}</p>}
    </div>
  );
}
