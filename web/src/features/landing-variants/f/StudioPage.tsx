"use client";
// Variant F page body. One client component because the typed brand name and the tape colour are
// shared by the hero roll, the product tour and the viewer. The strip canvases are drawn in the
// event handlers (not in effects) so each 3D texture upload sees the new pixels.
// No inline styles (CSP): swatches are SVG fill attributes, everything else is classes.
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { format, getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import { MOCKUP_DISCLAIMER, rollGeometry, type RollPreset } from "@/features/mockup3d";
import type { ContactInfo } from "@/features/lead-intake/landing/contact-info";
import type { ShowcasePreset } from "@/features/lead-intake/server/presets";
import { COMBOS, MAX_BRAND_LENGTH, PRODUCT_LOOKS, copyF, type Combo } from "./copy";
import type { StageView } from "./Stage3D";

const Stage3D = dynamic(() => import("./Stage3D"), { ssr: false });

const WRAP = "mx-auto w-full max-w-[1280px] px-5 sm:px-8 lg:px-12";
const SECTION_Y = "py-20 md:py-32";
const H2 = "vf-display text-4xl leading-[1.08] sm:text-5xl lg:text-6xl";
const RING = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--vf-ink)";
const BTN = `lp-press inline-flex h-13 items-center justify-center rounded-full px-7 text-base font-semibold whitespace-nowrap`;
const BTN_INK = `${BTN} bg-(--vf-ink) text-white ${RING}`;
const BTN_LINE = `${BTN} border border-(--vf-ink)/25 text-(--vf-ink) hover:border-(--vf-ink) ${RING}`;

const PX_PER_MM = 4;
/**
 * Strip length (mm) a canvas represents: two print repeats. One repeat is about 4.5 tape widths,
 * adjusted so a whole number of repeats goes round the roll (no cut word at the texture seam).
 */
function stripLengthMm(preset: RollPreset): number {
  const around = rollGeometry(preset).circumferenceMm;
  const repeats = Math.max(1, Math.round(around / (preset.width_mm * 4.5)));
  return (2 * around) / repeats;
}
const productPreset = (widthMm: number): RollPreset => ({ width_mm: widthMm, length_m: 100, thickness_mic: 48 });
const HERO_PRESET = { width_mm: 48, length_m: 200, thickness_mic: 48 };
const VIEW_PRESET = { width_mm: 48, length_m: 100, thickness_mic: 48 };

/** Paints two print repeats (ring mark + text) onto the strip canvas of the given roll. */
function drawStrip(c: HTMLCanvasElement, text: string, look: Combo, preset: RollPreset) {
  c.width = Math.round(stripLengthMm(preset) * PX_PER_MM);
  c.height = preset.width_mm * PX_PER_MM;
  const ctx = c.getContext("2d");
  if (!ctx) return;
  const h = c.height;
  const half = c.width / 2;
  ctx.fillStyle = look.bg;
  ctx.fillRect(0, 0, c.width, h);
  ctx.textBaseline = "middle";
  ctx.font = `800 ${Math.round(h * 0.4)}px "Segoe UI", Roboto, Arial, sans-serif`;
  for (let i = 0; i < 2; i++) {
    const x0 = i * half;
    const cx = x0 + h * 0.5;
    ctx.fillStyle = look.fg;
    ctx.beginPath();
    ctx.arc(cx, h / 2, h * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = look.accent;
    ctx.beginPath();
    ctx.arc(cx, h / 2, h * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = look.fg;
    ctx.fillText(text, x0 + h * 0.9, h / 2 + 2, half - h * 1.1);
  }
}

const printText = (brand: string) => brand.trim().toLocaleUpperCase("vi") || copyF.fallbackText;

type Canvases = { hero: HTMLCanvasElement; view: HTMLCanvasElement; products: HTMLCanvasElement[] };

function Swatches({ name, combo, onPick }: { name: string; combo: Combo; onPick: (c: Combo) => void }) {
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">{copyF.comboLabel}</legend>
      <div className="flex gap-2.5">
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

export function StudioPage({ presets, contact }: { presets: ShowcasePreset[]; contact: ContactInfo }) {
  const dict = getDictionary();
  const t = dict.landing;
  const inputId = useId();
  const [brand, setBrand] = useState("");
  const [combo, setCombo] = useState<Combo>(COMBOS[0]);
  const [version, setVersion] = useState(1);
  const [view, setView] = useState<StageView>("carton");
  const [active, setActive] = useState(0);
  const tour = useRef<HTMLOListElement>(null);

  // Client only: the server render has no canvases (the stages are ssr:false anyway).
  const [cv] = useState<Canvases | null>(() => {
    if (typeof document === "undefined") return null;
    const make = (look: Combo, preset: RollPreset) => {
      const c = document.createElement("canvas");
      drawStrip(c, copyF.fallbackText, look, preset);
      return c;
    };
    return {
      hero: make(COMBOS[0], HERO_PRESET),
      view: make(COMBOS[0], VIEW_PRESET),
      products: t.productTypes.map((p) => make(PRODUCT_LOOKS[p.key], productPreset(p.width))),
    };
  });

  const repaint = (nextBrand: string, nextCombo: Combo) => {
    if (cv) {
      const text = printText(nextBrand);
      drawStrip(cv.hero, text, nextCombo, HERO_PRESET);
      drawStrip(cv.view, text, nextCombo, VIEW_PRESET);
      t.productTypes.forEach((p, i) => drawStrip(cv.products[i], text, PRODUCT_LOOKS[p.key], productPreset(p.width)));
    }
    setVersion((v) => v + 1);
  };
  const pickCombo = (c: Combo) => {
    setCombo(c);
    repaint(brand, c);
  };

  // Product tour: the block crossing the middle of the viewport picks the roll shown beside it.
  useEffect(() => {
    const list = tour.current;
    if (!list) return;
    const items = Array.from(list.children);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(items.indexOf(e.target));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const product = t.productTypes[active];
  const productLook = PRODUCT_LOOKS[product.key];
  const tabs: { view: StageView; label: string }[] = [
    { view: "carton", label: dict.mockup3d.carton },
    { view: "cup", label: dict.mockup3d.cup },
    { view: "roll", label: dict.mockup3d.roll },
  ];
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
          <Link href={ROUTES.design} className={`lp-press inline-flex h-10 items-center rounded-full bg-(--vf-ink) px-5 text-sm font-semibold text-white ${RING}`}>
            {t.ctaDesign}
          </Link>
        </div>
      </header>

      {/* Hero: the message, then the product itself turning under studio light */}
      <section className="vf-studio relative overflow-hidden">
        <div className={`${WRAP} flex flex-col items-center pt-12 text-center md:pt-16`}>
          <h1 className="vf-in vf-display max-w-5xl text-[2.5rem] leading-[1.1] sm:text-6xl lg:text-7xl">
            {copyF.h1a} <span className="text-(--vf-faint)">{copyF.h1b}</span>
          </h1>
          <p className="vf-in vf-in-1 mt-6 max-w-xl text-lg leading-relaxed text-(--vf-muted) sm:text-xl">{copyF.lead}</p>

          <div className="vf-in vf-in-2 mt-8 flex w-full max-w-2xl flex-col items-stretch gap-3 sm:flex-row sm:items-end">
            <div className="flex min-w-0 flex-1 flex-col gap-2 text-left">
              <label htmlFor={inputId} className="pl-5 text-sm font-semibold">
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
                className="h-13 w-full rounded-full border border-(--vf-ink)/20 bg-white px-6 text-base font-semibold shadow-[0_1px_2px_rgb(20_22_27/0.06)] placeholder:font-normal placeholder:text-(--vf-muted) focus-visible:border-(--vf-ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--vf-ink)"
              />
            </div>
            <Link href={ROUTES.design} className={BTN_INK}>
              {t.ctaDesign}
            </Link>
            <a href="#lien-he" className={BTN_LINE}>
              {t.ctaContact}
            </a>
          </div>
        </div>

        <div className="vf-stage-in relative mx-auto mt-4 h-[44svh] min-h-[300px] w-full max-w-[1100px] md:mt-2 md:h-[52svh]">
          <Stage3D
            view="wheel"
            preset={HERO_PRESET}
            source={cv?.hero ?? null}
            version={version}
            stripLengthMm={stripLengthMm(HERO_PRESET)}
            tapeColor={combo.edge}
            ariaLabel={copyF.heroStageLabel}
            scrollTilt
          />
        </div>
        <div className={`${WRAP} flex justify-center pb-12 md:pb-16`}>
          <Swatches name="f-hero-combo" combo={combo} onPick={pickCombo} />
        </div>
      </section>

      {/* Products: the roll beside the text changes with the block you are reading */}
      <section id="san-pham" aria-labelledby="san-pham-title" className="scroll-mt-16 bg-white pt-20 md:pt-32">
        <div className={WRAP}>
          <h2 id="san-pham-title" className={H2}>
            {t.productsTitle}
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-(--vf-muted)">{t.productsSubtitle}</p>
        </div>
        <div className={`${WRAP} grid lg:grid-cols-2 lg:gap-16`}>
          <div className="vf-floor sticky top-16 z-10 order-first -mx-5 h-[38svh] sm:-mx-8 lg:top-24 lg:order-last lg:mx-0 lg:my-16 lg:h-[70svh] lg:rounded-[2.5rem]">
            <Stage3D
              view="roll"
              preset={productPreset(product.width)}
              source={cv?.products[active] ?? null}
              version={version}
              stripLengthMm={stripLengthMm(productPreset(product.width))}
              tapeColor={productLook.edge}
              ariaLabel={product.title}
            />
          </div>
          <ol ref={tour} className="flex flex-col">
            {t.productTypes.map((p, i) => (
              <li key={p.key} data-active={i === active} className="vf-tour-block flex min-h-[52svh] flex-col justify-center py-10 lg:min-h-[78svh]">
                <p className="vf-display text-7xl sm:text-8xl">
                  {p.width}
                  <span className="ml-2 text-3xl text-(--vf-faint)">{t.productWidthUnit}</span>
                </p>
                <p className="mt-1 text-sm font-medium text-(--vf-muted)">{t.productWidthExample}</p>
                <h3 className="mt-8 text-2xl font-bold tracking-tight sm:text-3xl">{p.title}</h3>
                <p className="mt-3 max-w-md text-lg leading-relaxed text-(--vf-muted)">{p.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Viewer: the visitor's own tape on a carton, a cup or the roll */}
      <section id="ung-dung" aria-labelledby="ung-dung-title" className={`scroll-mt-16 ${SECTION_Y}`}>
        <div className={WRAP}>
          <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
            <div>
              <h2 id="ung-dung-title" className={H2}>
                {copyF.viewerTitle}
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-(--vf-muted)">{copyF.viewerBody}</p>
            </div>
            <div className="flex flex-wrap items-center gap-5">
              <div role="tablist" aria-label={copyF.viewerTabs} className="flex rounded-full bg-white p-1 ring-1 ring-(--vf-line)">
                {tabs.map((tab) => (
                  <button
                    key={tab.view}
                    type="button"
                    role="tab"
                    aria-selected={view === tab.view}
                    onClick={() => setView(tab.view)}
                    className={`min-h-11 rounded-full px-4 text-sm font-semibold whitespace-nowrap ${RING} ${
                      view === tab.view ? "bg-(--vf-ink) text-white" : "text-(--vf-muted) hover:text-(--vf-ink)"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <Swatches name="f-view-combo" combo={combo} onPick={pickCombo} />
            </div>
          </div>

          <div data-lp-reveal="up" className="vf-floor relative mt-10 aspect-square overflow-hidden rounded-[2.5rem] ring-1 ring-(--vf-line) sm:aspect-[16/9] md:mt-14">
            <Stage3D
              view={view}
              preset={VIEW_PRESET}
              source={cv?.view ?? null}
              version={version}
              stripLengthMm={stripLengthMm(VIEW_PRESET)}
              tapeColor={combo.edge}
              ariaLabel={dict.mockup3d.sceneLabel}
              interactive
            />
          </div>
          <p className="mt-3 text-center text-xs text-(--vf-muted)">{MOCKUP_DISCLAIMER}</p>

          <ul className="lp-stagger mt-14 grid gap-10 md:mt-20 md:grid-cols-3 md:gap-8">
            {t.useScenes.map((s) => (
              <li key={s.key} data-lp-reveal="up" className="border-t border-(--vf-ink) pt-5">
                <h3 className="text-xl font-bold tracking-tight">{s.title}</h3>
                <p className="mt-2 max-w-sm leading-relaxed text-(--vf-muted)">{s.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Why + sizes */}
      <section aria-labelledby="vi-sao-title" className={`bg-white ${SECTION_Y}`}>
        <div className={`${WRAP} grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-20`}>
          <div className="lg:sticky lg:top-28 lg:self-start">
            <h2 id="vi-sao-title" className={H2}>
              {t.whyTitle}
            </h2>
            <h3 className="mt-10 text-sm font-semibold text-(--vf-muted)">{t.useCasesTitle}</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {t.useCases.map((u) => (
                <li key={u} className="rounded-full bg-(--vf-bg) px-4 py-2 text-sm font-medium">
                  {u}
                </li>
              ))}
            </ul>
          </div>
          <ul className="lp-stagger flex flex-col">
            {t.whyReasons.map((r) => (
              <li key={r.title} data-lp-reveal="up" className="border-t border-(--vf-line) py-8 first:border-t-0 first:pt-0 last:pb-0">
                <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">{r.title}</h3>
                <p className="mt-3 max-w-xl text-lg leading-relaxed text-(--vf-muted)">{r.body}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className={`${WRAP} mt-20 md:mt-32`}>
          <dl className="grid gap-4 sm:grid-cols-3">
            {copyF.specs.map((s) => (
              <div key={s.label} data-lp-reveal="up" className="rounded-[2rem] bg-(--vf-bg) p-8">
                <dt className="text-sm font-medium text-(--vf-muted)">{s.label}</dt>
                <dd className="vf-display mt-6 text-6xl">
                  {s.value}
                  <span className="ml-2 text-2xl text-(--vf-faint)">{s.unit}</span>
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-10 flex flex-wrap items-baseline gap-x-8 gap-y-4">
            <h3 className="text-xl font-bold tracking-tight">{t.presetsTitle}</h3>
            {presets.length === 0 ? (
              <p className="text-(--vf-muted)">{t.presetsEmpty}</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {presets.map((p) => (
                  <li key={p.id} className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-(--vf-line)">
                    {format(t.presetSpec, { width: Number(p.width_mm), length: Number(p.length_m), thickness: Number(p.thickness_mic) })}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Process: a real sequence, so it is numbered */}
      <section id="quy-trinh" aria-labelledby="quy-trinh-title" className={`scroll-mt-16 ${SECTION_Y}`}>
        <div className={WRAP}>
          <h2 id="quy-trinh-title" className={H2}>
            {t.howTitle}
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-(--vf-muted)">{t.howSubtitle}</p>
          <ol className="lp-stagger mt-12 grid gap-10 sm:grid-cols-2 md:mt-16 lg:grid-cols-4 lg:gap-8">
            {t.howSteps.map((step, i) => (
              <li key={step.title} data-lp-reveal="up" className="border-t border-(--vf-ink) pt-5">
                <span aria-hidden="true" className="vf-display text-5xl text-(--vf-faint)">
                  {i + 1}
                </span>
                <h3 className="mt-6 text-2xl font-bold tracking-tight">
                  <span className="sr-only">{i + 1}. </span>
                  {step.title}
                </h3>
                <p className="mt-2 max-w-xs leading-relaxed text-(--vf-muted)">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Closing: the one dark block on the page, with the contact channels inside it */}
      <footer id="lien-he" className="scroll-mt-16 pb-10">
        <div className={WRAP}>
          <div data-lp-reveal="up" className="rounded-[2.5rem] bg-(--vf-ink) px-7 py-14 text-white sm:px-12 md:py-20 lg:px-16">
            <h2 className={`${H2} max-w-3xl`}>{t.ctaTitle}</h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/70">{t.ctaSubtitle}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href={ROUTES.design} className={`${BTN} bg-white text-(--vf-ink) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white`}>
                {t.ctaDesign}
              </Link>
              <Link
                href={`${ROUTES.design}#yeu-cau-bao-gia`}
                className={`${BTN} border border-white/35 text-white hover:border-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white`}
              >
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
                        className="underline decoration-white/30 underline-offset-4 hover:decoration-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
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
