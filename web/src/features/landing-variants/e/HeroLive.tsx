"use client";
// Variant E hero "word + 3D": the visitor types a brand name and the tape weaving through the giant
// word prints it at once; the section right under the hero shows the same tape in the 3D mockup.
// The strip canvas is drawn in the event handlers (not in an effect) so the texture upload in
// TapeMockup3D always sees the new pixels. No inline styles (CSP): swatches are SVG fill attributes.
import Link from "next/link";
import { useId, useState } from "react";
import { getDictionary } from "@/i18n";
import { TapeMockup3D } from "@/features/mockup3d";
import { HeroWord } from "@/features/lead-intake/landing/HeroWord";
import { BTN, LP_CONTAINER, LP_H2, LP_SECTION_Y, RING_ON_DARK } from "@/features/lead-intake/landing/ui";
import { ROUTES } from "@/lib/routes";
import { COMBOS, MAX_BRAND_LENGTH, copyE, type Combo } from "./copy";

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

const printText = (brand: string) => brand.trim().toLocaleUpperCase("vi") || copyE.fallbackText;

/** `children` is rendered between the hero and the 3D section (the seam marquee). */
export function HeroLive({ children }: { children: React.ReactNode }) {
  const t = getDictionary().landing;
  const inputId = useId();
  const [brand, setBrand] = useState("");
  const [combo, setCombo] = useState<Combo>(COMBOS[0]);
  const [version, setVersion] = useState(1);
  // Client only: the server render has no canvas (TapeMockup3D renders nothing until WebGL is probed).
  const [canvas] = useState<HTMLCanvasElement | null>(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    drawStrip(c, copyE.fallbackText, COMBOS[0]);
    return c;
  });

  const repaint = (nextBrand: string, nextCombo: Combo) => {
    if (canvas) drawStrip(canvas, printText(nextBrand), nextCombo);
    setVersion((v) => v + 1);
  };

  return (
    <>
      <section className="relative isolate overflow-hidden bg-vt-blue text-white">
        <div aria-hidden="true" className="lp-glow-tr pointer-events-none absolute inset-0 -z-10" />
        <div className={`${LP_CONTAINER} flex flex-col justify-center gap-6 pt-8 pb-16 md:gap-5 md:pb-16 lg:pt-10 lg:pb-20`}>
          <h1 className="flex items-center py-2">
            <span className="sr-only">{t.heroTitle}</span>
            <span className="lp-bob -mx-2 block w-[calc(100%+1rem)] sm:-mx-4 sm:w-[calc(100%+2rem)]">
              <HeroWord tapeText={printText(brand)} />
            </span>
          </h1>

          <div className="lp-fade grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="flex w-full max-w-xl flex-col gap-2">
              <label htmlFor={inputId} className="text-lg font-semibold text-white sm:text-xl">
                {copyE.inputLabel}
              </label>
              <input
                id={inputId}
                type="text"
                value={brand}
                maxLength={MAX_BRAND_LENGTH}
                autoComplete="organization"
                placeholder={copyE.inputPlaceholder}
                onChange={(e) => {
                  setBrand(e.target.value);
                  repaint(e.target.value, combo);
                }}
                className="h-16 w-full rounded-full bg-white px-7 text-xl font-bold text-vt-ink placeholder:font-normal placeholder:text-vt-ink/65 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-vt-yellow"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={ROUTES.design} className={`${BTN} bg-vt-yellow text-vt-ink ${RING_ON_DARK}`}>
                {t.ctaDesign}
              </Link>
              <a href="#lien-he" className={`${BTN} border-2 border-white text-white hover:bg-white hover:text-vt-blue ${RING_ON_DARK}`}>
                {t.ctaContact}
              </a>
            </div>
          </div>
        </div>
      </section>

      {children}

      <section aria-labelledby="xem-thu-title" className={`bg-white ${LP_SECTION_Y} pt-28 md:pt-36`}>
        <div className={`${LP_CONTAINER} grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16`}>
          <div className="flex flex-col items-start">
            <h2 id="xem-thu-title" className={`${LP_H2} text-vt-ink`}>
              {copyE.tryTitle}
            </h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-vt-ink/80">{copyE.tryBody}</p>
            <fieldset className="mt-8 min-w-0">
              <legend className="text-sm font-semibold text-vt-ink">{copyE.comboLabel}</legend>
              <div className="mt-3 flex gap-3">
                {COMBOS.map((c) => (
                  <label key={c.key} className="relative cursor-pointer" title={c.name}>
                    <input
                      type="radio"
                      name="e-combo"
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
                      className="lp-press block size-16 rounded-full border-2 border-vt-ink/15 p-1 peer-checked:border-vt-blue peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-vt-navy"
                    >
                      <svg viewBox="0 0 36 36" className="block size-full">
                        <circle cx={18} cy={18} r={18} fill={c.bg} />
                        <text x={18} y={25} textAnchor="middle" fontSize={19} fontWeight={900} fill={c.fg}>
                          A
                        </text>
                        <circle cx={18} cy={18} r={17.25} fill="none" stroke="#16173a" strokeOpacity={0.15} strokeWidth={1.5} />
                      </svg>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
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
            className="min-w-0 text-vt-ink"
          />
        </div>
      </section>
    </>
  );
}
