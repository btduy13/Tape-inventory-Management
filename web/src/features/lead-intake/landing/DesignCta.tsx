// Closing call to action: first half of the blue closing area (DesignCta + Contact share one
// royal-blue field, no seam between them). Two balanced columns inside the shared container:
// headline, copy and both CTAs on the left, a taped carton + tape roll illustration on the right.
// The printed marquee overlays the white/blue boundary (zero-height wrapper), so no seam shows.
// Server Component.
import Link from "next/link";
import { getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import { CartonTapeArt } from "./CartonTapeArt";
import { TapeMarquee } from "./TapeMarquee";
import { BTN, LP_CONTAINER, LP_H2, RING_ON_DARK } from "./ui";

/** Front view of a printed tape roll (decorative), drawn behind the carton. */
function RollArt() {
  return (
    <svg viewBox="0 0 200 200" aria-hidden="true" focusable="false" className="h-full w-full">
      <circle cx="100" cy="100" r="96" className="fill-vt-yellow" />
      <circle cx="100" cy="100" r="88" fill="none" strokeWidth="8" strokeDasharray="16 28" className="stroke-vt-navy-deep/45" />
      <circle cx="100" cy="100" r="74" fill="none" strokeWidth="1.5" className="stroke-vt-navy-deep/15" />
      <circle cx="100" cy="100" r="64" fill="none" strokeWidth="1.5" className="stroke-vt-navy-deep/15" />
      <circle cx="100" cy="100" r="46" className="fill-lp-kraft" />
      <circle cx="100" cy="100" r="33" className="fill-vt-blue-ink" />
    </svg>
  );
}

export function DesignCta() {
  const t = getDictionary().landing;
  return (
    <>
      <div aria-hidden="true" className="pointer-events-none relative z-10 h-0">
        <TapeMarquee items={t.marquee} tone="tape" reverse className="lp-tilt-rev absolute top-0 -left-[5%] w-[110%] -translate-y-1/2" />
      </div>
      <section aria-labelledby="cta-title" className="relative isolate overflow-hidden bg-vt-blue text-white">
        <div aria-hidden="true" className="lp-glow-br pointer-events-none absolute inset-0 -z-10" />
        <div className={`${LP_CONTAINER} grid items-center gap-10 pt-24 pb-14 md:pt-32 md:pb-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16`}>
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

          <div data-lp-reveal="up" className="lp-delay-1 relative mx-auto w-full max-w-sm sm:max-w-md lg:max-w-none">
            <div className="absolute top-0 right-[4%] w-[34%]">
              <div className="lp-roll aspect-square">
                <RollArt />
              </div>
            </div>
            <div className="relative aspect-[372/318] pt-[8%]">
              <CartonTapeArt caption={t.heroArtCaption} tapeText={t.heroTapeText} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
