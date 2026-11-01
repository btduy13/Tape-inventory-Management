"use client";
// Variant C interactive bento: hero preview (brand text + colour combo), width picker
// (true-proportion strips) and the three use scenes all share one state, so every card
// shows the visitor's own tape. No inline styles (CSP): colours are SVG fill attributes,
// sizes are SVG width/height attributes, motion is class-based transform/opacity.
import Link from "next/link";
import { useId, useState } from "react";
import { copy, fill } from "./copy";
import { CartonScene, CupScene, ParcelScene } from "./Scenes";
import { TapePrint } from "./TapePrint";
import { card, focusRing } from "./ui";
import { COMBOS, DEFAULT_WIDTH, MAX_BRAND_LENGTH, TAPE_WIDTHS_MM, safeId, type Combo, type TapeWidth } from "./tape";


function StripSvg({ text, combo, H, W, className }: { text: string; combo: Combo; H: number; W: number; className: string }) {
  const id = safeId(useId());
  return (
    <svg viewBox={`0 0 ${W} ${H + 8}`} className={`h-auto w-full ${className}`} aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={`${id}k`}>
          <rect width={W} height={H} />
        </clipPath>
      </defs>
      <rect y={6} width={W} height={H} fill="#000" opacity={0.4} />
      <rect width={W} height={H} fill={combo.bg} />
      <g clipPath={`url(#${id}k)`}>
        <TapePrint text={text} length={W} thick={H} fg={combo.fg} accent={combo.accent} offset={H * 0.6} />
      </g>
      <rect width={W} height={H * 0.14} fill="#fff" opacity={0.16} />
      <rect width={W} height={H} fill="none" stroke="#fff" strokeOpacity={0.12} strokeWidth={2} />
    </svg>
  );
}

function HeroStrip({ text, combo, mm }: { text: string; combo: Combo; mm: number }) {
  // Same mm-to-height ratio is too thin on phones, so phones get a shorter canvas.
  const H = mm * 4;
  return (
    <div className="relative">
      <div className="vc-reveal overflow-hidden">
        <div className="vc-reveal-inner">
          <StripSvg text={text} combo={combo} H={H} W={640} className="block sm:hidden" />
          <StripSvg text={text} combo={combo} H={H} W={1200} className="hidden sm:block" />
        </div>
      </div>
      {/* the roll travelling ahead of the strip; fades out when laid */}
      <div className={`pointer-events-none absolute inset-0 vc-roll`} aria-hidden="true">
        <svg viewBox="0 0 100 100" className="absolute top-1/2 right-0 h-[180%] w-auto translate-x-1/2 -translate-y-1/2">
          <circle cx={50} cy={50} r={48} fill={combo.bg} />
          <g className="vc-roll-spin">
            <circle cx={50} cy={50} r={48} fill="none" stroke="#000" strokeOpacity={0.18} strokeWidth={6} strokeDasharray="10 14" />
          </g>
          <circle cx={50} cy={50} r={26} fill="#d9b88c" />
          <circle cx={50} cy={50} r={20} fill="#1d2026" />
        </svg>
      </div>
    </div>
  );
}

export function TapeLab({ process, cta }: { process: React.ReactNode; cta: React.ReactNode }) {
  const [brand, setBrand] = useState("");
  const [comboKey, setComboKey] = useState(COMBOS[0].key);
  const [mm, setMm] = useState<TapeWidth>(DEFAULT_WIDTH);
  const combo = COMBOS.find((c) => c.key === comboKey) ?? COMBOS[0];
  const text = brand.trim() || copy.fallbackText;
  const inputId = useId();

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-6 lg:grid-cols-12">
      {/* HERO */}
      <section aria-labelledby="c-h1" className={`${card} flex flex-col overflow-hidden md:col-span-6 lg:col-span-8`}>
        <div className="p-5 sm:p-8 sm:pb-6">
          <h1 id="c-h1" className={`vc-display max-w-[16ch] text-[2.35rem] leading-[1.02] sm:text-6xl xl:text-[4.75rem]`}>
            {copy.h1}
          </h1>
          <p className="mt-5 max-w-[52ch] text-base text-[#b4b8c1] sm:text-lg">{copy.lead}</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="min-w-0">
              <label htmlFor={inputId} className="block text-sm font-semibold text-[#ece9e3]">
                {copy.inputLabel}
              </label>
              <input
                id={inputId}
                type="text"
                value={brand}
                maxLength={MAX_BRAND_LENGTH}
                autoComplete="organization"
                placeholder={copy.inputPlaceholder}
                onChange={(e) => setBrand(e.target.value)}
                className={`mt-2 h-12 w-full rounded-xl border border-white/15 bg-[#121419] px-4 text-lg font-semibold text-white placeholder:font-normal placeholder:text-[#7f848e] focus-visible:border-[#f5a524] ${focusRing}`}
              />
            </div>
            <fieldset className="min-w-0">
              <legend className="text-sm font-semibold text-[#ece9e3]">{copy.comboLabel}</legend>
              <div className="mt-2 flex gap-2">
                {COMBOS.map((c) => (
                  <label key={c.key} className="relative cursor-pointer" title={c.name}>
                    <input
                      type="radio"
                      name="c-combo"
                      value={c.key}
                      checked={c.key === comboKey}
                      onChange={() => setComboKey(c.key)}
                      className="peer sr-only"
                    />
                    <span className="sr-only">{c.name}</span>
                    <span
                      aria-hidden="true"
                      className="block size-12 rounded-xl border-2 border-white/10 p-1 transition-transform duration-150 peer-checked:border-[#f5a524] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#f5a524] hover:scale-105 motion-reduce:transition-none"
                    >
                      <svg viewBox="0 0 36 36" className="block size-full">
                        <rect width={36} height={36} rx={7} fill={c.bg} />
                        <text x={18} y={25} textAnchor="middle" fontSize={19} fontWeight={900} fill={c.fg}>
                          A
                        </text>
                        <circle cx={29} cy={7} r={3} fill={c.accent} />
                      </svg>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </div>

        {/* full-bleed live strip */}
        <div className="flex flex-1 flex-col justify-center pt-2 pb-5" aria-live="polite">
          <span className="sr-only">
            {fill(copy.previewCaption, { w: mm })}: {text}, {combo.name}
          </span>
          <HeroStrip key={`${combo.key}-${mm}`} text={text} combo={combo} mm={mm} />
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-3 px-5 pb-6 sm:px-8 sm:pb-8">
          <Link
            href="/thiet-ke"
            className={`inline-flex h-12 items-center rounded-xl bg-[#f5a524] px-5 text-base sm:px-6 font-bold text-[#17181c] transition-transform duration-150 hover:-translate-y-0.5 motion-reduce:transition-none ${focusRing}`}
          >
            {copy.ctaDesign}
          </Link>
          <Link
            href="/thiet-ke#yeu-cau-bao-gia"
            className={`inline-flex h-12 items-center rounded-xl border border-white/20 px-5 text-base font-semibold text-white hover:border-white/50 ${focusRing}`}
          >
            {copy.ctaQuote}
          </Link>
          <p className="text-sm text-[#9a9fa9] sm:ml-2">
            {fill(copy.previewCaption, { w: mm })}. <span className="lg:hidden">{copy.previewHint}.</span>
          </p>
        </div>
      </section>

      {/* SPEC: true-proportion width picker */}
      <section aria-labelledby="c-spec" className={`${card} p-5 sm:p-6 md:col-span-6 lg:col-span-4`}>
        <h2 id="c-spec" className={`vc-display text-2xl`}>
          {copy.specTitle}
        </h2>
        <p className="mt-1 text-sm text-[#a9aeb7]">{copy.specLead}</p>
        <p id="c-width-label" className="sr-only">
          {copy.specWidthLabel}
        </p>
        <ul aria-labelledby="c-width-label" className="mt-4 grid gap-1">
          {TAPE_WIDTHS_MM.map((w) => {
            const on = w === mm;
            return (
              <li key={w}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setMm(w)}
                  className={`group flex min-h-6 w-full items-center gap-3 rounded-md px-1 py-0.5 text-left ${focusRing}`}
                >
                  <span
                    className={`w-12 shrink-0 text-right text-sm tabular-nums ${on ? "font-bold text-[#f5a524]" : "text-[#a9aeb7] group-hover:text-white"}`}
                  >
                    {w} mm
                  </span>
                  <svg width="100%" height={w * 0.75} className="block min-w-0 flex-1" aria-hidden="true" focusable="false">
                    <rect width="100%" height="100%" rx={1.5} fill={on ? combo.bg : "#3a3e47"} />
                    {!on && <rect width="100%" height="100%" rx={1.5} fill="#fff" opacity={0} className="transition-opacity duration-150 group-hover:opacity-10" />}
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
        <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-white/10 pt-4 text-sm">
          {[
            [copy.specLength, copy.specLengthValue],
            [copy.specThickness, copy.specThicknessValue],
            [copy.specColors, copy.specColorsValue],
          ].map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-[#9a9fa9]">{k}</dt>
              <dd className="mt-0.5 font-semibold text-white">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* USES */}
      <section aria-labelledby="c-uses" className="grid gap-3 md:col-span-6 md:grid-cols-3 lg:col-span-12">
        <h2 id="c-uses" className="sr-only">
          {copy.usesTitle}
        </h2>
        {copy.uses.map((u) => (
          <article key={u.key} className={`${card} flex items-center overflow-hidden md:flex-col md:items-stretch`}>
            <div className="w-[46%] shrink-0 self-stretch bg-[#23262d] px-2 pt-3 md:w-auto md:px-4 md:pt-4">
              {u.key === "carton" && <CartonScene text={text} combo={combo} mm={mm} />}
              {u.key === "cup" && <CupScene text={text} combo={combo} mm={mm} />}
              {u.key === "ecom" && <ParcelScene text={text} combo={combo} mm={mm} />}
            </div>
            <div className="min-w-0 p-4 md:p-5">
              <h3 className="text-base font-bold text-white md:text-lg">{u.title}</h3>
              <p className="mt-1 text-sm text-[#a9aeb7]">{u.body}</p>
            </div>
          </article>
        ))}
      </section>

      {process}
      {cta}
    </div>
  );
}
