"use client";
// Variant "parcel wall" page body (light studio shell from variant F):
//   hero     - the word BĂNG KEO in 3D, two printed tapes weaving through it, sealed things around
//   compare  - drag a slider: plain tape vs printed tape on the same carton
//   types    - the three tape types, each on a different thing (no width numbers)
//   uses     - pick a use and see it in 3D: carton, drink cup, mailer
//   process  - one looping motion graphic per step
// One client component: the typed brand name and tape colour are shared by every scene. The tape
// canvases are drawn in the event handlers so each 3D texture upload sees the new pixels.
// No inline styles (CSP): swatches are SVG fill attributes, the slider writes a CSS variable.
import dynamic from "next/dynamic";
import Link from "next/link";
import { useId, useRef, useState, useSyncExternalStore } from "react";
import { format, getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import { MOCKUP_DISCLAIMER, hasWebGL } from "@/features/mockup3d";
import type { ContactInfo } from "@/features/lead-intake/landing/contact-info";
import type { ShowcasePreset } from "@/features/lead-intake/server/presets";
import { COMBOS, MAX_BRAND_LENGTH, copyF, type Combo } from "../f/copy";
import { copyG, PLAIN_TAPE, TYPE_LOOKS, USE_KINDS } from "./copy";
import { PROCESS_ART } from "./ProcessMotion";
import { SAMPLE_BRANDS, TAPE_PX, drawTape, type TapeLook } from "./tape-art";

const WordStage = dynamic(() => import("./WordStage"), { ssr: false });
const ParcelStage = dynamic(() => import("./ParcelStage"), { ssr: false });
const Stage3D = dynamic(() => import("../f/Stage3D"), { ssr: false });

const WRAP = "mx-auto w-full max-w-[1280px] px-5 sm:px-8 lg:px-12";
const SECTION_Y = "py-20 md:py-32";
const H2 = "vf-display text-4xl leading-[1.08] sm:text-5xl lg:text-6xl";
const RING = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--vf-ink)";
const BTN = "lp-press inline-flex items-center justify-center rounded-full text-base font-semibold whitespace-nowrap";
const BTN_INK = `${BTN} bg-(--vf-ink) text-white ${RING}`;
const BTN_LINE = `${BTN} border border-(--vf-ink)/25 bg-white/70 text-(--vf-ink) hover:border-(--vf-ink) ${RING}`;
const BTN_ON_INK = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white";

/** The cup seal is a narrow strip (the carton tape would cover half the lid). */
const CUP_PRESET = { width_mm: 22, length_m: 100, thickness_mic: 48 };
/** Before the canvases exist (server render): one empty slot per hero tape print. */
const NO_PRINTS: readonly null[] = [null, ...SAMPLE_BRANDS.map(() => null)];

const lookOf = (c: Combo): TapeLook => ({ bg: c.bg, fg: c.fg, accent: c.accent, mark: "ring" });

let webglSupport: boolean | undefined;
const cachedHasWebGL = () => (webglSupport ??= hasWebGL());
const subscribeNever = () => () => {};

type Canvases = { prints: HTMLCanvasElement[]; plain: HTMLCanvasElement; types: HTMLCanvasElement[] };

function Swatches({ name, combo, onPick }: { name: string; combo: Combo; onPick: (c: Combo) => void }) {
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">{copyF.comboLabel}</legend>
      <div className="flex gap-2">
        {COMBOS.map((c) => (
          <label key={c.key} className="relative cursor-pointer" title={c.name}>
            <input type="radio" name={name} value={c.key} checked={c.key === combo.key} onChange={() => onPick(c)} className="peer sr-only" />
            <span className="sr-only">{c.name}</span>
            <span
              aria-hidden="true"
              className="lp-press block size-11 rounded-full border-2 border-transparent p-[3px] peer-checked:border-(--vf-ink) peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-(--vf-ink)"
            >
              <svg viewBox="0 0 36 36" className="block size-full">
                <circle cx={18} cy={18} r={17} fill={c.bg} stroke="#14161b" strokeOpacity={0.18} strokeWidth={1.5} />
                <circle cx={18} cy={18} r={6} fill={c.fg} />
              </svg>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ParcelPage({ presets, contact }: { presets: ShowcasePreset[]; contact: ContactInfo }) {
  const dict = getDictionary();
  const t = dict.landing;
  const inputId = useId();
  const compare = useRef<HTMLDivElement>(null);
  const [brand, setBrand] = useState("");
  const [combo, setCombo] = useState<Combo>(COMBOS[0]);
  const [version, setVersion] = useState(1);
  const [use, setUse] = useState("cup");
  // true on the server and the first client pass, then the real capability
  const webgl = useSyncExternalStore(subscribeNever, cachedHasWebGL, () => true);

  // Client only: the server render has no canvases (the stages are ssr:false anyway).
  const [cv] = useState<Canvases | null>(() => {
    if (typeof document === "undefined") return null;
    const make = (text: string | null, look: TapeLook) => {
      const c = document.createElement("canvas");
      drawTape(c, text, look);
      return c;
    };
    return {
      // slot 0 is the visitor's own tape, the others are the sample shops
      prints: [make(copyF.fallbackText, lookOf(COMBOS[0])), ...SAMPLE_BRANDS.map((b) => make(b.text, b))],
      plain: make(null, PLAIN_TAPE),
      types: t.productTypes.map((p) => make(TYPE_LOOKS[p.key].sample, TYPE_LOOKS[p.key])),
    };
  });

  const repaint = (nextBrand: string, nextCombo: Combo) => {
    if (cv) {
      const typed = nextBrand.trim().toLocaleUpperCase("vi");
      drawTape(cv.prints[0], typed || copyF.fallbackText, lookOf(nextCombo));
      t.productTypes.forEach((p, i) => drawTape(cv.types[i], typed || TYPE_LOOKS[p.key].sample, TYPE_LOOKS[p.key]));
    }
    setVersion((v) => v + 1);
  };
  const pickCombo = (c: Combo) => {
    setCombo(c);
    repaint(brand, c);
  };

  const useKind = USE_KINDS[use] ?? "carton";
  const useScene = t.useScenes.find((s) => s.key === use) ?? t.useScenes[0];
  const rows: { label: string; value: string; href?: string | null; external?: boolean }[] = [];
  if (contact.phone) rows.push({ label: t.contactPhone, value: contact.phone, href: contact.phoneHref });
  if (contact.zaloHref) rows.push({ label: t.contactZalo, value: t.contactZaloValue, href: contact.zaloHref, external: true });
  if (contact.email) rows.push({ label: t.contactEmail, value: contact.email, href: `mailto:${contact.email}` });
  if (contact.address) rows.push({ label: t.contactAddress, value: contact.address });
  if (contact.hours) rows.push({ label: t.contactHours, value: contact.hours });

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-(--vf-line) bg-white/80 backdrop-blur-md">
        <div className={`${WRAP} flex h-16 items-center justify-between gap-4`}>
          <Link href={ROUTES.home} className={`flex items-center gap-3 rounded-sm ${RING}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- next/image adds an inline style (blocked by CSP) */}
            <img src="/brand/vinh-thinh-logo.png" alt={t.logoAlt} width={478} height={632} fetchPriority="high" className="h-11 w-auto" />
            <span className="flex flex-col leading-tight">
              <span className="text-base font-extrabold tracking-tight">{t.brandName}</span>
              <span className="text-xs text-(--vf-muted)">{t.brand}</span>
            </span>
          </Link>
          <nav aria-label={t.navLabel} className="hidden md:block">
            <ul className="flex gap-8 text-sm font-medium text-(--vf-muted)">
              {t.nav.map((n) => (
                <li key={n.href}>
                  <a href={n.href} className={`transition-colors hover:text-(--vf-ink) ${RING}`}>
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <Link href={ROUTES.design} className={`${BTN_INK} h-10 px-5 text-sm`}>
            {t.ctaDesign}
          </Link>
        </div>
      </header>

      {/* Hero: the word itself, in 3D, with printed tapes weaving through it and sealed things around */}
      <section className="vf-studio relative overflow-hidden">
        <h1 className="sr-only">{t.heroTitle}</h1>
        <div className="vp-stage relative h-[54svh] min-h-[21rem] md:h-[calc(100svh-17.5rem)] md:min-h-[25rem]">
          {webgl ? (
            <WordStage sources={cv?.prints ?? NO_PRINTS} version={version} ariaLabel={copyG.heroStageLabel} />
          ) : (
            <p aria-hidden="true" className="vf-display flex h-full items-center justify-center text-[17vw] leading-none">
              {copyG.heroWord}
            </p>
          )}
        </div>
        <div className={`${WRAP} relative z-10 -mt-4 flex flex-col items-center pb-12 text-center md:-mt-8 md:pb-14`}>
          <p className="vf-in max-w-xl text-lg leading-relaxed text-(--vf-muted)">{copyF.lead}</p>
          <div className="vf-in vf-in-1 mt-5 flex w-full max-w-4xl flex-col gap-3 rounded-[2rem] bg-white/80 p-3 text-left shadow-[0_24px_60px_-28px_rgb(20_22_27/0.45)] ring-1 ring-(--vf-line) backdrop-blur-md focus-within:ring-2 focus-within:ring-(--vf-ink) md:flex-row md:items-center md:gap-4 md:rounded-full md:py-2.5 md:pr-2.5 md:pl-7">
            <div className="flex min-w-0 flex-1 flex-col px-3 pt-1 md:px-0 md:pt-0">
              <label htmlFor={inputId} className="text-xs font-semibold text-(--vf-muted)">
                {copyF.inputLabel}
              </label>
              <input
                id={inputId}
                type="text"
                value={brand}
                maxLength={MAX_BRAND_LENGTH}
                autoComplete="organization"
                placeholder={copyF.inputPlaceholder}
                onChange={(e) => {
                  setBrand(e.target.value);
                  repaint(e.target.value, combo);
                }}
                className="h-8 w-full bg-transparent text-lg font-bold outline-none placeholder:font-normal placeholder:text-(--vf-muted)"
              />
            </div>
            <div className="px-3 md:px-0">
              <Swatches name="pw-hero-combo" combo={combo} onPick={pickCombo} />
            </div>
            <div className="grid grid-cols-2 gap-2 md:flex">
              <Link href={ROUTES.design} className={`${BTN_INK} h-12 px-5 md:px-7`}>
                {t.ctaDesign}
              </Link>
              <a href="#lien-he" className={`${BTN_LINE} h-12 px-5 md:px-6`}>
                {t.ctaContact}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Compare: the same carton with plain tape and with the visitor's printed tape */}
      <section id="san-pham" aria-labelledby="so-sanh-title" className={`scroll-mt-16 bg-white ${SECTION_Y}`}>
        <div className={WRAP}>
          <h2 id="so-sanh-title" className={`${H2} max-w-3xl`}>
            {copyG.compareTitle}
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-(--vf-muted)">{copyG.compareBody}</p>

          <div ref={compare} data-lp-reveal="up" className="vg-compare vf-floor relative mt-10 aspect-[4/5] overflow-hidden rounded-[2.5rem] ring-1 ring-(--vf-line) sm:aspect-[16/9] md:mt-14">
            <div className="absolute inset-0">
              <ParcelStage source={cv?.plain ?? null} version={1} withLabel={false} ariaLabel={copyG.comparePlain} />
            </div>
            <div className="vg-clip vf-floor absolute inset-0">
              <ParcelStage source={cv?.prints[0] ?? null} version={version} ariaLabel={copyG.comparePrinted} />
            </div>
            <p className="absolute top-5 left-6 rounded-full bg-white/85 px-4 py-2 text-sm font-semibold">{copyG.comparePlain}</p>
            <p className="absolute top-5 right-6 rounded-full bg-(--vf-ink) px-4 py-2 text-sm font-semibold text-white">{copyG.comparePrinted}</p>
            <input
              type="range"
              min={0}
              max={100}
              defaultValue={50}
              aria-label={copyG.compareSlider}
              onChange={(e) => compare.current?.style.setProperty("--x", e.target.value)}
              className="vg-range absolute inset-0 z-10 h-full w-full cursor-ew-resize"
            />
            <div aria-hidden="true" className="vg-handle pointer-events-none absolute inset-y-0 z-20 w-0">
              <span className="absolute inset-y-0 -left-px w-0.5 bg-(--vf-ink)" />
              <span className="vg-knob absolute top-1/2 left-0 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-(--vf-ink) text-white shadow-[0_8px_24px_-8px_rgb(20_22_27/0.6)]">
                <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 7l-5 5 5 5M15 7l5 5-5 5" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Types: each tape type on a different thing; the print is a sample shop until a name is typed */}
      <section aria-labelledby="loai-title" className={SECTION_Y}>
        <div className={WRAP}>
          <h2 id="loai-title" className={H2}>
            {t.productsTitle}
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-(--vf-muted)">{t.productsSubtitle}</p>
          <ul className="lp-stagger mt-10 grid gap-5 md:mt-14 md:grid-cols-3">
            {t.productTypes.map((p, i) => (
              <li key={p.key} data-lp-reveal="up" className="overflow-hidden rounded-[2rem] bg-white ring-1 ring-(--vf-line)">
                <div className="vf-floor relative aspect-[4/3]">
                  <ParcelStage kind={TYPE_LOOKS[p.key].kind} source={cv?.types[i] ?? null} version={version} withLabel={false} ariaLabel={p.title} />
                </div>
                <div className="p-7 sm:p-8">
                  <h3 className="text-2xl font-bold tracking-tight">{p.title}</h3>
                  <p className="mt-2 leading-relaxed text-(--vf-muted)">{p.body}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap items-baseline gap-x-8 gap-y-4">
            <h3 className="text-xl font-bold tracking-tight">{t.presetsTitle}</h3>
            {presets.length === 0 ? (
              <p className="text-(--vf-muted)">{t.presetsEmpty}</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {presets.map((p) => (
                  <li key={p.id} className="rounded-full bg-white px-4 py-2 text-sm font-semibold ring-1 ring-(--vf-line)">
                    {format(t.presetSpec, { width: Number(p.width_mm), length: Number(p.length_m), thickness: Number(p.thickness_mic) })}
                  </li>
                ))}
              </ul>
            )}
            <p className="basis-full text-sm text-(--vf-muted)">{copyG.specs}</p>
          </div>
        </div>
      </section>

      {/* Uses: pick one and see the visitor's tape on it */}
      <section id="ung-dung" aria-labelledby="ung-dung-title" className={`scroll-mt-16 bg-white ${SECTION_Y}`}>
        <div className={`${WRAP} grid items-center gap-12 lg:grid-cols-2 lg:gap-20`}>
          <div>
            <h2 id="ung-dung-title" className={H2}>
              {t.useTitle}
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-(--vf-muted)">{t.useSubtitle}</p>
            <ul aria-label={copyG.usesPick} className="mt-10 flex flex-col border-b border-(--vf-line)">
              {t.useScenes.map((s) => {
                const on = s.key === use;
                return (
                  <li key={s.key}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => setUse(s.key)}
                      className={`group flex w-full items-start gap-4 border-t border-(--vf-line) py-6 text-left ${RING}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-2 size-3.5 shrink-0 rounded-full border-2 ${on ? "border-(--vf-ink) bg-(--vf-ink)" : "border-(--vf-faint) group-hover:border-(--vf-ink)"}`}
                      />
                      <span>
                        <span className={`block text-xl font-bold tracking-tight ${on ? "" : "text-(--vf-muted) group-hover:text-(--vf-ink)"}`}>{s.title}</span>
                        <span className="mt-1 block max-w-md leading-relaxed text-(--vf-muted)">{s.body}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <h3 className="mt-8 text-sm font-semibold text-(--vf-muted)">{t.useCasesTitle}</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {t.useCases.map((u) => (
                <li key={u} className="rounded-full bg-(--vf-bg) px-4 py-2 text-sm font-medium">
                  {u}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="vf-floor relative aspect-[4/5] overflow-hidden rounded-[2.5rem] ring-1 ring-(--vf-line)">
              {useKind === "cup" ? (
                <Stage3D
                  view="cup"
                  preset={CUP_PRESET}
                  source={cv?.prints[0] ?? null}
                  version={version}
                  stripLengthMm={(TAPE_PX.w / TAPE_PX.h) * CUP_PRESET.width_mm}
                  tapeColor={combo.edge}
                  ariaLabel={useScene.title}
                  interactive
                />
              ) : (
                <ParcelStage kind={useKind} source={cv?.prints[0] ?? null} version={version} ariaLabel={useScene.title} />
              )}
            </div>
            <p className="mt-3 text-center text-xs text-(--vf-muted)">
              {useKind === "cup" ? `${copyG.cupHint} ` : ""}
              {MOCKUP_DISCLAIMER}.
            </p>
          </div>
        </div>
      </section>

      {/* Why */}
      <section aria-labelledby="vi-sao-title" className={SECTION_Y}>
        <div className={`${WRAP} grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-20`}>
          <h2 id="vi-sao-title" className={`${H2} lg:sticky lg:top-28 lg:self-start`}>
            {t.whyTitle}
          </h2>
          <ul className="lp-stagger flex flex-col">
            {t.whyReasons.map((r) => (
              <li key={r.title} data-lp-reveal="up" className="border-t border-(--vf-line) py-8 first:border-t-0 first:pt-0 last:pb-0">
                <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">{r.title}</h3>
                <p className="mt-3 max-w-xl text-lg leading-relaxed text-(--vf-muted)">{r.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Process: a real sequence, so it is numbered; each step has its own looping motion graphic */}
      <section id="quy-trinh" aria-labelledby="quy-trinh-title" className={`scroll-mt-16 bg-white ${SECTION_Y}`}>
        <div className={WRAP}>
          <h2 id="quy-trinh-title" className={H2}>
            {t.howTitle}
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-(--vf-muted)">{t.howSubtitle}</p>
          <ol className="lp-stagger mt-12 grid gap-10 sm:grid-cols-2 md:mt-16 lg:grid-cols-4 lg:gap-6">
            {t.howSteps.map((step, i) => {
              const Art = PROCESS_ART[i];
              return (
                <li key={step.title} data-lp-reveal="up" className="flex flex-col">
                  <div className="vf-floor aspect-[3/2] overflow-hidden rounded-[1.75rem] ring-1 ring-(--vf-line)">{Art && <Art />}</div>
                  <span aria-hidden="true" className="vf-display mt-6 text-4xl text-(--vf-faint)">
                    {i + 1}
                  </span>
                  <h3 className="mt-2 text-2xl font-bold tracking-tight">
                    <span className="sr-only">{i + 1}. </span>
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-xs leading-relaxed text-(--vf-muted)">{step.body}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Closing: the one dark block on the page, with the contact channels inside it */}
      <footer id="lien-he" className="scroll-mt-16 pt-20 pb-10 md:pt-32">
        <div className={WRAP}>
          <div data-lp-reveal="up" className="rounded-[2.5rem] bg-(--vf-ink) px-7 py-14 text-white sm:px-12 md:py-20 lg:px-16">
            <h2 className={`${H2} max-w-3xl`}>{t.ctaTitle}</h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/70">{t.ctaSubtitle}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href={ROUTES.design} className={`${BTN} h-13 bg-white px-7 text-(--vf-ink) ${BTN_ON_INK}`}>
                {t.ctaDesign}
              </Link>
              <Link href={`${ROUTES.design}#yeu-cau-bao-gia`} className={`${BTN} h-13 border border-white/35 px-7 text-white hover:border-white ${BTN_ON_INK}`}>
                {t.ctaQuote}
              </Link>
            </div>
            <dl className="mt-14 flex flex-wrap gap-x-14 gap-y-6 border-t border-white/15 pt-8">
              {rows.map((r) => (
                <div key={r.label} className="min-w-0">
                  <dt className="text-sm text-white/60">{r.label}</dt>
                  <dd className="mt-1 text-lg font-semibold break-words">
                    {r.href ? (
                      <a
                        href={r.href}
                        {...(r.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        className={`underline decoration-white/30 underline-offset-4 hover:decoration-white ${BTN_ON_INK}`}
                      >
                        {r.value}
                      </a>
                    ) : (
                      r.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="mt-6 flex flex-wrap justify-between gap-x-6 gap-y-2 px-2 text-sm text-(--vf-muted)">
            <span>{t.footerCopy}</span>
            <Link href={ROUTES.terms} className={`underline underline-offset-4 hover:text-(--vf-ink) ${RING}`}>
              {t.termsLink}
            </Link>
          </p>
        </div>
      </footer>
    </>
  );
}
