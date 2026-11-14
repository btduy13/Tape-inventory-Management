// Landing variant E (review routes /mau/e1, /mau/e2, /mau/e3): tape motion graphics in the brand
// colours. One page body, three hero options:
//   word   - the live hero's giant word + weaving tape, over two crossing tapes
//   live   - the same word, but the visitor's typed brand name is printed on the tape, then 3D
//   strips - the headline is printed on three tape strips laid down by rolls
// Body: product strips unroll with the scroll, a yellow "why" band, steps on a tape that a roll
// lays as you scroll. Reuses the live landing's header, art, closing CTA and contact footer.
// Server Component (async: loads active presets).
import Link from "next/link";
import { getDictionary } from "@/i18n";
import { listActivePresets } from "@/features/lead-intake/server/presets";
import { CartonTapeArt, CupSealArt, ParcelArt } from "@/features/lead-intake/landing/CartonTapeArt";
import { Contact } from "@/features/lead-intake/landing/Contact";
import { DesignCta } from "@/features/lead-intake/landing/DesignCta";
import { SiteHeader } from "@/features/lead-intake/landing/Hero";
import { LandingMotion } from "@/features/lead-intake/landing/LandingMotion";
import { PresetsShowcase } from "@/features/lead-intake/landing/PresetsShowcase";
import { TapeMarquee } from "@/features/lead-intake/landing/TapeMarquee";
import { LP_CONTAINER, LP_H2, LP_SECTION_Y } from "@/features/lead-intake/landing/ui";
import { PrintMark, RollFace } from "./art";
import { HERO_ROUTES, copyE, type HeroKind } from "./copy";
import { HeroLive } from "./HeroLive";
import { HeroStrips, HeroWordX } from "./Heroes";
import { ScrubMotion } from "./ScrubMotion";
import "./e.css";

const ROOT_ID = "trang-chu-e";
const CARD = "relative overflow-hidden rounded-[2rem]";

/** One look per tape type; strip height is proportional to the tape width (48 : 60 : 72 mm). */
const TAPES: Record<string, { tape: string; print: string; ring: string; dot: string; size: string; type: string; face: string; mark: string }> = {
  clear: {
    tape: "border-y-2 border-white bg-white/45",
    print: "text-vt-red-deep",
    ring: "border-vt-red-deep",
    dot: "bg-vt-red-deep",
    size: "h-16 md:h-24",
    type: "text-lg md:text-2xl",
    face: "fill-white",
    mark: "stroke-vt-red-deep/60",
  },
  opaque: {
    tape: "bg-vt-yellow",
    print: "text-vt-navy-deep",
    ring: "border-vt-navy-deep",
    dot: "bg-vt-red-deep",
    size: "h-20 md:h-30",
    type: "text-xl md:text-3xl",
    face: "fill-vt-yellow",
    mark: "stroke-vt-navy-deep/45",
  },
  multi: {
    tape: "bg-vt-blue",
    print: "text-vt-yellow",
    ring: "border-white",
    dot: "bg-vt-red",
    size: "h-24 md:h-36",
    type: "text-2xl md:text-4xl",
    face: "fill-vt-blue",
    mark: "stroke-vt-yellow/70",
  },
};

/** Full-bleed strip that unrolls with the scroll (--e-p on the closest [data-e-scrub]). Decorative. */
function ScrubStrip({ kind, label, reverse }: { kind: string; label: string; reverse: boolean }) {
  const s = TAPES[kind];
  return (
    <div aria-hidden="true" className={`relative ${s.size}`}>
      <div className={`absolute inset-0 flex items-center overflow-hidden ${reverse ? "ve-clip-l justify-end" : "ve-clip-r"} ${s.tape}`}>
        <div className="flex w-max shrink-0 items-center">
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} className={`lp-display flex items-center gap-3 px-6 whitespace-nowrap md:gap-4 md:px-10 ${s.type} ${s.print}`}>
              <PrintMark ring={s.ring} dot={s.dot} />
              {label}
            </span>
          ))}
        </div>
      </div>
      <div className={`pointer-events-none absolute inset-0 ${reverse ? "ve-go-l" : "ve-go-r"}`}>
        <span className={`absolute top-1/2 aspect-square h-[170%] -translate-y-1/2 ${reverse ? "left-0 -translate-x-1/2" : "right-0 translate-x-1/2"}`}>
          <RollFace face={s.face} mark={s.mark} hole="fill-vt-paper" className={`size-full ${reverse ? "ve-turn-rev" : "ve-turn"}`} />
        </span>
      </div>
    </div>
  );
}

/** Review-only switcher between the three hero options. Not part of the design. */
function ReviewBar({ hero }: { hero: HeroKind }) {
  return (
    <nav
      aria-label={copyE.reviewLabel}
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-vt-navy-deep p-1.5 text-sm font-semibold text-white shadow-[0_12px_30px_-10px_rgb(22_23_58/0.8)]"
    >
      <span className="hidden px-3 text-white/70 sm:inline">{copyE.reviewLabel}</span>
      {HERO_ROUTES.map((r) => (
        <Link
          key={r.kind}
          href={r.href}
          aria-current={r.kind === hero ? "page" : undefined}
          className={`rounded-full px-3 py-2 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vt-yellow ${
            r.kind === hero ? "bg-vt-yellow text-vt-ink" : "hover:bg-white/15"
          }`}
        >
          {r.label}
        </Link>
      ))}
    </nav>
  );
}

export async function LandingE({ hero }: { hero: HeroKind }) {
  const t = getDictionary().landing;
  const presets = await listActivePresets();
  const art = {
    carton: <CartonTapeArt caption={t.heroArtCaption} tapeText={t.heroTapeText} />,
    cup: <CupSealArt tapeText={t.heroTapeText} />,
    ecom: <ParcelArt tapeText={t.heroTapeText} />,
  } as const;
  const [mainScene, ...sideScenes] = t.useScenes;
  const seam = (
    <div aria-hidden="true" className="pointer-events-none relative z-10 h-0">
      <TapeMarquee items={copyE.marquee} className="lp-tilt absolute top-0 -left-[5%] w-[110%] -translate-y-1/2" />
    </div>
  );

  return (
    <>
      <main id={ROOT_ID} className="lp-root flex flex-1 flex-col overflow-x-clip">
        <SiteHeader />
        {hero === "word" && <HeroWordX />}
        {hero === "strips" && <HeroStrips />}
        {hero === "live" ? <HeroLive>{seam}</HeroLive> : seam}

        {/* Products: each tape type unrolls across the page with the scroll */}
        <section id="san-pham" aria-labelledby="san-pham-title" className="scroll-mt-20 overflow-hidden bg-vt-paper pt-28 pb-12 md:pt-36 md:pb-14">
          <div className={LP_CONTAINER}>
            <h2 id="san-pham-title" className={`${LP_H2} text-vt-ink`}>
              {t.productsTitle}
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-vt-ink/80">{t.productsSubtitle}</p>
          </div>

          <ul className="mt-12 flex flex-col gap-12 md:mt-16 md:gap-16">
            {t.productTypes.map((p, i) => (
              <li key={p.key} data-e-scrub className="flex flex-col gap-6">
                <ScrubStrip kind={p.key} label={t.heroTapeText} reverse={i % 2 === 1} />
                <div className={`${LP_CONTAINER} grid gap-x-10 gap-y-1 md:grid-cols-[9rem_minmax(0,1fr)] md:items-start lg:grid-cols-[10rem_minmax(0,1fr)]`}>
                  <p className="lp-display flex flex-col text-5xl text-vt-red-deep md:text-6xl">
                    <span className="mb-1 font-sans text-xs font-bold tracking-wide text-vt-blue">{t.productWidthExample}</span>
                    <span>
                      {p.width}
                      <span className="ml-1 text-2xl">{t.productWidthUnit}</span>
                    </span>
                  </p>
                  <div className="flex max-w-[60ch] flex-col gap-1 md:pt-5">
                    <h3 className="text-xl font-bold text-vt-ink">{p.title}</h3>
                    <p className="leading-relaxed text-vt-ink/80">{p.body}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <p className={`${LP_CONTAINER} mt-12 text-sm font-semibold text-vt-blue`}>{copyE.specs}</p>
        </section>
        <PresetsShowcase presets={presets} />

        {/* Use cases: one large scene + two stacked, on the brand blue */}
        <section id="ung-dung" aria-labelledby="ung-dung-title" className={`scroll-mt-24 bg-vt-blue text-white ${LP_SECTION_Y}`}>
          <div className={LP_CONTAINER}>
            <h2 id="ung-dung-title" className={`${LP_H2} max-w-4xl`}>
              {t.useTitle}
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/80">{t.useSubtitle}</p>

            <ul className="mt-12 grid gap-4 md:mt-16 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:grid-rows-2 lg:gap-5">
              <li data-lp-reveal="up" className={`${CARD} flex flex-col bg-vt-blue-soft ring-1 ring-white/10 lg:row-span-2`}>
                <div className="mx-auto w-full max-w-2xl flex-1 p-5 sm:p-8">
                  <div className="aspect-[372/318]">{art[mainScene.key as keyof typeof art]}</div>
                </div>
                <div className="p-7 pt-0 sm:p-9 sm:pt-0">
                  <h3 className="lp-display text-3xl sm:text-4xl">{mainScene.title}</h3>
                  <p className="mt-2 max-w-md leading-relaxed text-white/80">{mainScene.body}</p>
                </div>
              </li>
              {sideScenes.map((s, i) => (
                <li
                  key={s.key}
                  data-lp-reveal="up"
                  className={`${CARD} grid items-center gap-2 bg-vt-blue-soft ring-1 ring-white/10 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] lp-delay-${i + 1}`}
                >
                  <div className="p-4 sm:p-5">
                    <div className="aspect-[372/318]">{art[s.key as keyof typeof art]}</div>
                  </div>
                  <div className="p-7 pt-0 sm:p-8 sm:pl-2">
                    <h3 className="lp-display text-2xl sm:text-3xl">{s.title}</h3>
                    <p className="mt-2 leading-relaxed text-white/80">{s.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Why: a full tape-yellow band */}
        <section aria-labelledby="vi-sao-title" className={`bg-vt-yellow text-vt-ink ${LP_SECTION_Y}`}>
          <div className={`${LP_CONTAINER} grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-20`}>
            <div className="lg:sticky lg:top-12 lg:self-start">
              <h2 id="vi-sao-title" className={LP_H2}>
                {t.whyTitle}
              </h2>
              <h3 className="mt-10 text-sm font-bold">{t.useCasesTitle}</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {t.useCases.map((u) => (
                  <li key={u} className="rounded-full bg-vt-navy-deep px-4 py-2 text-sm font-semibold text-white">
                    {u}
                  </li>
                ))}
              </ul>
            </div>
            <ul className="lp-stagger flex flex-col">
              {t.whyReasons.map((r) => (
                <li key={r.title} data-lp-reveal="up" className="border-t-4 border-vt-navy-deep pt-6 pb-10 last:pb-0">
                  <h3 className="lp-display text-3xl sm:text-4xl">{r.title}</h3>
                  <p className="mt-3 max-w-xl text-lg leading-relaxed">{r.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Process: a roll lays the tape across the four steps as you scroll */}
        <section id="quy-trinh" aria-labelledby="quy-trinh-title" className={`scroll-mt-20 overflow-hidden bg-white ${LP_SECTION_Y}`}>
          <div className={LP_CONTAINER}>
            <h2 id="quy-trinh-title" className={`${LP_H2} text-vt-ink`}>
              {t.howTitle}
            </h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-vt-ink/80">{t.howSubtitle}</p>

            <div data-e-scrub className="relative mt-14 md:mt-20">
              <div aria-hidden="true" className="absolute top-2 right-0 left-0 hidden h-10 lg:block">
                <div className="ve-clip-r absolute inset-0 flex items-center overflow-hidden bg-vt-yellow">
                  <span className="lp-display pl-20 text-sm tracking-wide whitespace-nowrap text-vt-navy-deep">
                    {Array.from({ length: 14 }, () => `${t.heroTapeText}  ●  `).join("")}
                  </span>
                </div>
                <div className="ve-go-end pointer-events-none absolute inset-0">
                  <span className="absolute top-1/2 right-0 size-24 translate-x-1/2 -translate-y-1/2">
                    <RollFace hole="fill-white" className="ve-turn size-full" />
                  </span>
                </div>
              </div>
              <ol className="relative grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
                {t.howSteps.map((step, i) => (
                  <li key={step.title} className={`ve-step ve-t${i + 1}`}>
                    <span
                      aria-hidden="true"
                      className={`ve-dot ve-t${i + 1} lp-display flex size-14 items-center justify-center rounded-full bg-vt-blue text-xl text-white ring-4 ring-white`}
                    >
                      {i + 1}
                    </span>
                    <h3 className="lp-display mt-6 text-3xl text-vt-ink sm:text-4xl">
                      <span className="sr-only">{i + 1}. </span>
                      {step.title}
                    </h3>
                    <p className="mt-3 max-w-xs text-lg leading-relaxed text-vt-ink/80">{step.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <DesignCta />
        <Contact />
      </main>
      <LandingMotion rootId={ROOT_ID} />
      <ScrubMotion rootId={ROOT_ID} />
      <ReviewBar hero={hero} />
    </>
  );
}
