"use client";
// Logo picker. Checks here are UX only; lead-intake's server re-validates and re-sanitizes.
import { useId, useState } from "react";
import { getDictionary } from "@/i18n";
import { MAX_LOGO_OFFSET, MAX_LOGO_SCALE, MIN_LOGO_SCALE } from "../lib/constants";
import { loadLogoFile } from "../lib/logo-load";
import { useDesignState } from "./hooks";

export function LogoUpload() {
  const t = getDictionary().designer;
  const inputId = useId();
  const [s, dispatch] = useDesignState();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const errorText = {
    tooLarge: t.logoTooLarge,
    invalidType: t.logoInvalidType,
    empty: t.logoEmpty,
    decode: t.logoDecodeError,
  } as const;

  async function onFile(file: File | undefined) {
    if (!file) return;
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

  const slider = (label: string, value: number, min: number, max: number, key: "scale" | "offsetX" | "offsetY") => (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <input
        type="range"
        min={min}
        max={max}
        step={0.01}
        value={value}
        onChange={(e) => dispatch({ type: "setLogoTransform", [key]: Number(e.target.value) })}
      />
    </label>
  );

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-semibold">{t.logo}</legend>
      <label htmlFor={inputId} className="text-xs text-neutral-600">{t.logoHint}</label>
      <input
        id={inputId}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,.png,.jpg,.jpeg,.svg"
        disabled={busy}
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
        className="text-sm"
      />
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      {s.logo && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-neutral-600">{t.logoTintNote}</p>
          {slider(t.logoScale, s.logoScale, MIN_LOGO_SCALE, MAX_LOGO_SCALE, "scale")}
          <div className="grid grid-cols-2 gap-3">
            {slider(t.logoOffsetX, s.logoOffsetX, -MAX_LOGO_OFFSET, MAX_LOGO_OFFSET, "offsetX")}
            {slider(t.logoOffsetY, s.logoOffsetY, -MAX_LOGO_OFFSET, MAX_LOGO_OFFSET, "offsetY")}
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: "setLogo", logo: null })}
            className="self-start text-xs text-red-700 underline"
          >
            {t.logoRemove}
          </button>
        </div>
      )}
    </fieldset>
  );
}
