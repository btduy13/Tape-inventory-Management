"use client";
// Logo file picker: Vietnamese drop zone (drag-and-drop or click), spinner, thumbnail + file name.
// Checks here are UX only; lead-intake's server re-validates and re-sanitizes.
import { useId, useRef, useState, type DragEvent } from "react";
import { getDictionary } from "@/i18n";
import { loadLogoFile } from "../lib/logo-load";
import { useDesignState } from "./hooks";

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
      if (res.ok) dispatch({ type: "setLogo", logo: res.logo });
      else setError(errorText[res.error]);
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
          className={`flex items-center gap-3 rounded-md border p-2 ${over ? "border-amber-600 bg-amber-50" : "border-neutral-300"}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- blob: preview of a local file */}
          <img src={s.logo.url} alt={t.logoThumbAlt} className="h-12 w-12 shrink-0 rounded border border-neutral-200 bg-neutral-100 object-contain" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate font-medium" title={s.logo.file.name}>{s.logo.file.name}</p>
            <p className="text-xs text-neutral-500">{s.logo.width} x {s.logo.height}px · {Math.max(1, Math.round(s.logo.file.size / 1024))}KB</p>
          </div>
          <label htmlFor={inputId} className="inline-flex min-h-11 cursor-pointer items-center rounded-md border border-amber-700 px-3 text-sm font-semibold text-amber-800 hover:bg-amber-50 focus-within:ring-2">
            {busy ? t.logoLoading : t.logoChange}
          </label>
          <button
            type="button"
            onClick={() => dispatch({ type: "setLogo", logo: null })}
            className="min-h-11 rounded-md px-2 text-sm text-red-700 underline"
          >
            {t.logoRemove}
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={() => setOver(false)}
          aria-busy={busy}
          className={`flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed p-4 text-center text-sm ${
            over ? "border-amber-600 bg-amber-50" : "border-neutral-300 hover:border-amber-500"
          }`}
        >
          {busy ? (
            <span className="flex items-center gap-2" role="status">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-700 border-t-transparent" aria-hidden="true" />
              {t.logoLoading}
            </span>
          ) : (
            <>
              <span className="font-semibold text-amber-800">{t.logoDrop}</span>
              <span className="text-xs text-neutral-600">{t.logoHint}</span>
            </>
          )}
        </label>
      )}
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
