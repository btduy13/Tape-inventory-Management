// Landing variant D (review route /mau/d): the live 3D mockup moves into the hero (type a brand
// name, see it on a carton), products become a bento, the steps run along one horizontal tape.
// Reuses the live landing's brand tokens, header, art, motion driver and contact footer.
// Server Component (async: loads active presets); HeroLab is the only new client island.
import Link from "next/link";
import { format, getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import { listActivePresets } from "@/features/lead-intake/server/presets";
import { CartonTapeArt, CupSealArt, ParcelArt } from "@/features/lead-intake/landing/CartonTapeArt";
import { Contact } from "@/features/lead-intake/landing/Contact";
import { SiteHeader } from "@/features/lead-intake/landing/Hero";
import { LandingMotion } from "@/features/lead-intake/landing/LandingMotion";
import { TapeMarquee } from "@/features/lead-intake/landing/TapeMarquee";
import { BTN, LP_CONTAINER, LP_H2, LP_SECTION_Y, RING_ON_DARK } from "@/features/lead-intake/landing/ui";
import { copyD } from "./copy";
import { HeroLab } from "./HeroLab";
import "./d.css";

const ROOT_ID = "trang-chu-d";
const CARD = "relative overflow-hidden rounded-[2rem]";

type Tone = { cell: string; tape: string; print: string; ring: string; dot: string; num: string; body: string };

/** One look per tape type: the cell is the surface the tape is stuck on. */
const TONES: Record<string, Tone> = {
  clear: {
    cell: "bg-lp-kraft text-vt-ink",
    tape: "border-y-2 border-white/80 bg-white/35",
    print: "text-vt-red-dark",
    ring: "border-vt-red-dark",
    dot: "bg-vt-red-dark",
    num: "text-vt-ink",
    body: "text-vt-ink/90",
  },
  opaque: {
    cell: "bg-white text-vt-ink ring-1 ring-vt-ink/10",
    tape: "bg-vt-yellow",
    print: "text-vt-navy-deep",
    ring: "border-vt-navy-deep",
    dot: "bg-vt-red-deep",
    num: "text-vt-red-deep",
    body: "text-vt-ink/80",
  },
  multi: {
    cell: "bg-vt-navy-deep text-white",
    tape: "bg-vt-blue",
    print: "text-vt-yellow",
    ring: "border-white",
    dot: "bg-vt-red",
    num: "text-vt-yellow",
    body: "text-white/80",
  },
};

/** Static printed strip stuck across the top of a product cell (decorative). */
function Strip({ tone, label }: { tone: Tone; label: string }) {
  return (
    <div
      aria-hidden="true"
      className={`absolute top-10 -right-8 -left-8 flex h-16 -rotate-3 items-center overflow-hidden shadow-[0_14px_30px_-18px_rgb(22_23_58/0.7)] sm:h-20 ${tone.tape}`}
    >
      {Array.from({ length: 8 }, (_, i) => (
        <span key={i} className={`lp-display flex shrink-0 items-center gap-3 px-5 text-xl whitespace-nowrap sm:text-2xl ${tone.print}`}>
          <span className={`flex size-[1.1em] shrink-0 items-center justify-center rounded-full border-[0.14em] ${tone.ring}`}>
            <span className={`size-[0.38em] rounded-full ${tone.dot}`} />
          </span>
          {label}
        </span>
      ))}
    </div>
  );
}

export async function LandingD() {
  const t = getDictionary().landing;
  const presets = await listActivePresets();
  const spans = ["lg:col-span-7", "lg:col-span-5", "lg:col-span-5"];
  const art = {
    carton: <CartonTapeArt caption={t.heroArtCaption} tapeText={t.heroTapeText} />,
    cup: <CupSealArt tapeText={t.heroTapeText} />,
    ecom: <ParcelArt tapeText={t.heroTapeText} />,
  } as const;
  const [mainScene, ...sideScenes] = t.useScenes;

  return (
    <>
      <main id={ROOT_ID} className="lp-root flex flex-1 flex-col overflow-x-clip">
        <SiteHeader />
        <HeroLab />
        <div aria-hidden="true" className="pointer-events-none relative z-10 h-0">
          <TapeMarquee items={copyD.marquee} className="lp-tilt absolute top-0 -left-[5%] w-[110%] -translate-y-1/2" />
        </div>

        {/* Products: bento, one cell per tape type + the common sizes */}
        <section id="san-pham" aria-labelledby="san-pham-title" className="scroll-mt-20 bg-vt-paper pt-28 pb-20 md:pt-36 md:pb-28">
          <div className={LP_CONTAINER}>
            <h2 id="san-pham-title" className={`${LP_H2} text-vt-ink`}>
              {t.productsTitle}
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-vt-ink/80">{t.productsSubtitle}</p>

            <ul className="mt-12 grid gap-4 md:mt-16 md:grid-cols-2 lg:grid-cols-12 lg:gap-5">
              {t.productTypes.map((p, i) => {
                const tone = TONES[p.key];
                return (
                  <li
                    key={p.key}
                    data-lp-reveal="up"
                    className={`${CARD} flex flex-col justify-end p-7 pt-40 sm:p-9 sm:pt-48 ${tone.cell} ${spans[i]}`}
                  >
                    <Strip tone={tone} label={t.heroTapeText} />
                    <p className={`lp-display text-6xl ${tone.num}`}>
                      {p.width}
                      <span className="ml-1 text-2xl">{t.productWidthUnit}</span>
                    </p>
                    <p className={`text-sm font-semibold ${tone.body}`}>{t.productWidthExample}</p>
                    <h3 className="mt-5 text-2xl font-bold">{p.title}</h3>
                    <p className={`mt-2 max-w-[48ch] leading-relaxed ${tone.body}`}>{p.body}</p>
                  </li>
                );
              })}
              <li data-lp-reveal="up" className={`${CARD} flex flex-col justify-between gap-8 bg-white p-7 text-vt-ink ring-1 ring-vt-ink/10 sm:p-9 md:col-span-1 lg:col-span-7`}>
                <div>
                  <h3 className="lp-display text-3xl sm:text-4xl">{t.presetsTitle}</h3>
                  <p className="mt-3 max-w-md leading-relaxed text-vt-ink/80">{t.presetsSubtitle}</p>
                </div>
                {presets.length === 0 ? (
                  <p className="text-vt-ink/70">{t.presetsEmpty}</p>
                ) : (
                  <ul className="flex flex-wrap gap-2.5">
                    {presets.map((p) => (
                      <li key={p.id} className="rounded-full bg-vt-paper px-5 py-2.5 font-bold ring-1 ring-vt-ink/10">
                        {format(t.presetSpec, {
                          width: Number(p.width_mm),
                          length: Number(p.length_m),
                          thickness: Number(p.thickness_mic),
                        })}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-sm font-semibold text-vt-blue">{copyD.specs}</p>
              </li>
            </ul>
          </div>
        </section>

        {/* Use cases: one large scene + two stacked */}
        <section id="ung-dung" aria-labelledby="ung-dung-title" className={`scroll-mt-24 bg-white ${LP_SECTION_Y}`}>
          <div className={LP_CONTAINER}>
            <h2 id="ung-dung-title" className={`${LP_H2} max-w-4xl text-vt-ink`}>
              {t.useTitle}
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-vt-ink/80">{t.useSubtitle}</p>

            <ul className="mt-12 grid gap-4 text-white md:mt-16 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:grid-rows-2 lg:gap-5">
              <li data-lp-reveal="up" className={`${CARD} flex flex-col bg-vt-blue-soft lg:row-span-2`}>
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
                  className={`${CARD} grid items-center gap-2 bg-vt-blue-soft sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] lp-delay-${i + 1}`}
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

        {/* Why: headline + who it suits on the left, three reasons as large rows on the right */}
        <section aria-labelledby="vi-sao-title" className={`bg-vt-paper ${LP_SECTION_Y}`}>
          <div className={`${LP_CONTAINER} grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-20`}>
            <div className="lg:sticky lg:top-12 lg:self-start">
              <h2 id="vi-sao-title" className="lp-display text-4xl leading-[1.02] text-vt-ink sm:text-5xl">
                {t.whyTitle}
              </h2>
              <h3 className="mt-10 text-sm font-semibold text-vt-ink/70">{t.useCasesTitle}</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {t.useCases.map((u) => (
                  <li key={u} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-vt-ink ring-1 ring-vt-ink/10">
                    {u}
                  </li>
                ))}
              </ul>
            </div>
            <ul className="lp-stagger flex flex-col">
              {t.whyReasons.map((r) => (
                <li key={r.title} data-lp-reveal="up" className="border-t-2 border-vt-ink pt-6 pb-10 last:pb-0">
                  <h3 className="lp-display text-2xl text-vt-ink sm:text-4xl">{r.title}</h3>
                  <p className="mt-3 max-w-xl text-lg leading-relaxed text-vt-ink/80">{r.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Process: four steps sitting on one printed tape */}
        <section id="quy-trinh" aria-labelledby="quy-trinh-title" className={`scroll-mt-20 bg-white ${LP_SECTION_Y}`}>
          <div className={LP_CONTAINER}>
            <h2 id="quy-trinh-title" className={`${LP_H2} text-vt-ink`}>
              {t.howTitle}
            </h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-vt-ink/80">{t.howSubtitle}</p>

            <div className="relative mt-12 md:mt-16">
              <div
                aria-hidden="true"
                data-lp-reveal="scale-x"
                className="absolute top-3.5 right-0 left-0 hidden h-7 items-center overflow-hidden bg-vt-yellow lg:flex"
              >
                <span className="lp-display pl-20 text-xs tracking-wide whitespace-nowrap text-vt-navy-deep">
                  {Array.from({ length: 14 }, () => `${t.heroTapeText}  ●  `).join("")}
                </span>
              </div>
              <ol className="relative grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
                {t.howSteps.map((step, i) => (
                  <li key={step.title} data-lp-reveal="up" className={i ? `lp-delay-${Math.min(i, 3)}` : ""}>
                    <span
                      aria-hidden="true"
                      className="lp-display flex size-14 items-center justify-center rounded-full bg-vt-blue text-xl text-white ring-4 ring-white"
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

        {/* Closing call to action; shares one blue field with the contact footer */}
        <section aria-labelledby="cta-title" className="relative isolate overflow-hidden bg-vt-blue text-white">
          <div aria-hidden="true" className="lp-glow-br pointer-events-none absolute inset-0 -z-10" />
          <div className={`${LP_CONTAINER} grid items-center gap-10 pt-20 pb-14 md:pt-28 md:pb-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16`}>
            <div data-lp-reveal="up" className="flex flex-col items-start">
              <h2 id="cta-title" className={LP_H2}>
                {t.ctaTitle}
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/85 sm:text-xl">{t.ctaSubtitle}</p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link href={ROUTES.design} className={`${BTN} bg-vt-yellow text-vt-ink ${RING_ON_DARK}`}>
                  {t.ctaDesign}
                </Link>
                <Link
                  href={`${ROUTES.design}#yeu-cau-bao-gia`}
                  className={`${BTN} border-2 border-white text-white hover:bg-white hover:text-vt-blue ${RING_ON_DARK}`}
                >
                  {t.ctaQuote}
                </Link>
              </div>
            </div>
            <div data-lp-reveal="up" className="lp-delay-1 mx-auto w-full max-w-sm sm:max-w-md lg:max-w-none">
              <div className="aspect-[372/318]">
                <CartonTapeArt caption={t.heroArtCaption} tapeText={t.heroTapeText} />
              </div>
            </div>
          </div>
        </section>
        <Contact />
      </main>
      <LandingMotion rootId={ROOT_ID} />
    </>
  );
}
