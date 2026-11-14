"use client";
// How the logo prints: one ink (default, logo-mono.ts) or the logo's own colours. In one-ink mode
// the customer sees the converted logo on the tape colour and can pick its ink (same as the text
// by default: no extra ink), make the lines bolder / thinner, or print the light parts instead.
import { useEffect, useId, useRef } from "react";
import { getDictionary } from "@/i18n";
import { useDesignState } from "./hooks";
import { ColorField } from "./ColorField";
import { RangeField } from "./RangeField";
import { chip, chipOff, chipOn, groupLabel, hint } from "./ui";
import { usePrintLogo } from "./use-logo-canvas";

/** Converted logo drawn on the tape colour (contain-fit, 2x for sharpness). */
function MonoPreview({ logo, background }: { logo: HTMLCanvasElement | null; background: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const size = 192;
    c.width = size;
    c.height = size;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, size, size);
    if (!logo || logo.width === 0 || logo.height === 0) return;
    const k = (size * 0.86) / Math.max(logo.width, logo.height);
    const w = logo.width * k;
    const h = logo.height * k;
    ctx.drawImage(logo, (size - w) / 2, (size - h) / 2, w, h);
  }, [logo, background]);
  return <canvas ref={ref} aria-hidden="true" data-testid="logo-mono-preview" className="h-24 w-24 shrink-0 rounded-lg ring-1 ring-slate-200" />;
}

export function LogoMonoControls() {
  const t = getDictionary().designer;
  const id = useId();
  const [s, dispatch] = useDesignState();
  const { logo } = usePrintLogo(s);
  if (!s.logo) return null;
  const m = s.logoMono;
  const level = (v: number) => (v < 40 ? t.logoMonoThin : v > 60 ? t.logoMonoBold : t.logoMonoAuto);

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-slate-200 p-3">
      <span id={`${id}-mode`} className={groupLabel}>{t.logoPrintMode}</span>
      <div role="radiogroup" aria-labelledby={`${id}-mode`} className="grid grid-cols-2 gap-2">
        {([true, false] as const).map((on) => (
          <button
            key={String(on)}
            type="button"
            role="radio"
            aria-checked={m.on === on}
            data-logo-mode={on ? "mono" : "original"}
            onClick={() => dispatch({ type: "setLogoMono", on })}
            className={`${chip} min-h-12 flex-col px-2 py-1 text-center leading-tight ${m.on === on ? chipOn : chipOff}`}
          >
            <span className="font-semibold">{on ? t.logoMonoOn : t.logoMonoOff}</span>
            <span className="text-xs opacity-80">{on ? t.logoMonoOnSub : t.logoMonoOffSub}</span>
          </button>
        ))}
      </div>
      {m.on ? (
        <>
          <div className="flex min-w-0 items-center gap-3">
            <MonoPreview logo={logo} background={s.backgroundColor} />
            <p className={hint}>{t.logoMonoHelp}</p>
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-slate-900">
            <input
              type="checkbox"
              checked={m.color === null}
              onChange={(e) => dispatch({ type: "setLogoMono", color: e.target.checked ? null : s.textColor === "#000000" ? "#cf1f27" : "#000000" })}
              className="h-5 w-5 shrink-0 accent-vt-navy"
            />
            {t.logoMonoSameAsText}
          </label>
          {m.color !== null && (
            <ColorField
              label={t.logoMonoColor}
              value={m.color}
              disabledColors={[s.backgroundColor]}
              onChange={(c) => dispatch({ type: "setLogoMono", color: c })}
            />
          )}
          <RangeField
            label={t.logoMonoLevel}
            value={m.level}
            min={0}
            max={100}
            display={level}
            onChange={(v) => dispatch({ type: "setLogoMono", level: v })}
          />
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-slate-900">
            <input
              type="checkbox"
              checked={m.invert}
              onChange={(e) => dispatch({ type: "setLogoMono", invert: e.target.checked })}
              className="h-5 w-5 shrink-0 accent-vt-navy"
            />
            {t.logoMonoInvert}
          </label>
        </>
      ) : (
        <p className={hint}>{t.logoOriginalNote}</p>
      )}
    </div>
  );
}
