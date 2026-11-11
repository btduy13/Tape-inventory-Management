"use client";
// Variant D hero: the visitor types a brand name and picks a tape colour; the 3D mockup on the
// right shows that tape on a carton, a cup or the roll. The strip canvas is drawn in the event
// handlers (not in an effect) so the texture upload in TapeMockup3D always sees the new pixels.
// No inline styles (CSP): swatch colours are SVG fill attributes.
import Link from "next/link";
import { useId, useState } from "react";
import { getDictionary } from "@/i18n";
import { TapeMockup3D } from "@/features/mockup3d";
import { BTN, LP_CONTAINER, RING_ON_DARK } from "@/features/lead-intake/landing/ui";
import { ROUTES } from "@/lib/routes";
import { COMBOS, MAX_BRAND_LENGTH, copyD, type Combo } from "./copy";

const PX_PER_MM = 4;
const STRIP_LENGTH_MM = 300;
const PRESET = { width_mm: 48, length_m: 100, thickness_mic: 48 };

/** Paints two print repeats (ring mark + text) onto the strip canvas. */
function drawStrip(c: HTMLCanvasElement, text: string, combo: Combo) {
  c.width = STRIP_LENGTH_MM * PX_PER_MM;
  c.height = PRESET.width_mm * PX_PER_MM;
  const ctx = c.getContext("2d");
  if (!ctx) return;
  const h = c.height;
  const half = c.width / 2;
  ctx.fillStyle = combo.bg;
  ctx.fillRect(0, 0, c.width, h);
  ctx.textBaseline = "middle";
  ctx.font = `900 ${Math.round(h * 0.4)}px "Segoe UI", Roboto, Arial, sans-serif`;
  for (let i = 0; i < 2; i++) {
    const x0 = i * half;
    const cx = x0 + h * 0.5;
    ctx.fillStyle = combo.fg;
    ctx.beginPath();
    ctx.arc(cx, h / 2, h * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = combo.accent;
    ctx.beginPath();
    ctx.arc(cx, h / 2, h * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = combo.fg;
    ctx.fillText(text, x0 + h * 0.9, h / 2 + 2, half - h * 1.1);
  }
}

const printText = (brand: string) => brand.trim().toLocaleUpperCase("vi") || copyD.fallbackText;

export function HeroLab() {
  const t = getDictionary().landing;
  const inputId = useId();
  const [brand, setBrand] = useState("");
  const [combo, setCombo] = useState<Combo>(COMBOS[0]);
  const [version, setVersion] = useState(1);
  // Client only: the server render has no canvas (TapeMockup3D renders nothing until WebGL is probed).
  const [canvas] = useState<HTMLCanvasElement | null>(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    drawStrip(c, copyD.fallbackText, COMBOS[0]);
    return c;
  });

  const repaint = (nextBrand: string, nextCombo: Combo) => {
    if (canvas) drawStrip(canvas, printText(nextBrand), nextCombo);
    setVersion((v) => v + 1);
  };

  return (
    <section className="relative isolate overflow-hidden bg-vt-blue text-white">
      <div aria-hidden="true" className="lp-glow-tr pointer-events-none absolute inset-0 -z-10" />
      <div
        className={`${LP_CONTAINER} grid items-center gap-10 pt-10 pb-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14 lg:pt-14 lg:pb-28`}
      >
        <div className="flex min-w-0 flex-col items-start">
          <h1 className="vd-in lp-display text-5xl leading-[1.02] sm:text-6xl xl:text-7xl">
            {copyD.h1a}
            <span className="mt-2 block w-fit -rotate-2 bg-vt-yellow px-4 pt-1 pb-2 text-vt-navy-deep shadow-[0_10px_30px_-12px_rgb(20_23_102/0.7)]">
              {copyD.h1b}
            </span>
          </h1>
          <p className="vd-in vd-in-1 mt-7 max-w-[46ch] text-lg leading-relaxed text-white/85 sm:text-xl">{copyD.lead}</p>

          <div className="vd-in vd-in-2 mt-8 grid w-full max-w-xl gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="flex min-w-0 flex-col gap-2">
              <label htmlFor={inputId} className="text-sm font-semibold text-white">
                {copyD.inputLabel}
              </label>
              <input
                id={inputId}
                type="text"
                value={brand}
                maxLength={MAX_BRAND_LENGTH}
                autoComplete="organization"
                placeholder={copyD.inputPlaceholder}
                onChange={(e) => {
                  setBrand(e.target.value);
                  repaint(e.target.value, combo);
                }}
                className="h-14 w-full rounded-2xl bg-white px-5 text-lg font-semibold text-vt-ink placeholder:font-normal placeholder:text-vt-ink/65 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vt-yellow"
              />
            </div>
            <fieldset className="min-w-0">
              <legend className="text-sm font-semibold text-white">{copyD.comboLabel}</legend>
              <div className="mt-2 flex gap-2">
                {COMBOS.map((c) => (
                  <label key={c.key} className="relative cursor-pointer" title={c.name}>
                    <input
                      type="radio"
                      name="d-combo"
                      value={c.key}
                      checked={c.key === combo.key}
                      onChange={() => {
                        setCombo(c);
                        repaint(brand, c);
                      }}
                      className="peer sr-only"
                    />
                    <span className="sr-only">{c.name}</span>
                    <span
                      aria-hidden="true"
                      className="lp-press block size-14 rounded-2xl border-2 border-white/25 p-1 peer-checked:border-vt-yellow peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-white"
                    >
                      <svg viewBox="0 0 36 36" className="block size-full">
                        <rect width={36} height={36} rx={8} fill={c.bg} />
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

          <div className="vd-in vd-in-3 mt-8 flex flex-wrap gap-3">
            <Link href={ROUTES.design} className={`${BTN} bg-vt-yellow text-vt-ink ${RING_ON_DARK}`}>
              {t.ctaDesign}
            </Link>
            <a href="#lien-he" className={`${BTN} border-2 border-white text-white hover:bg-white hover:text-vt-blue ${RING_ON_DARK}`}>
              {t.ctaContact}
            </a>
          </div>
        </div>

        <div className="vd-in vd-in-4 min-w-0 rounded-[2rem] bg-white p-4 text-vt-ink shadow-[0_40px_80px_-40px_rgb(20_23_102/0.9)] sm:p-5">
          <TapeMockup3D
            source={canvas}
            version={version}
            preset={PRESET}
            stripLengthMm={STRIP_LENGTH_MM}
            initialView="carton"
            aspect="4 / 3"
            mobileAspect="1 / 1"
            showTitle={false}
            tapeColor={combo.bg}
          />
        </div>
      </div>
    </section>
  );
}
