// Four-step ordering process. A printed tape line draws itself down the steps as you scroll
// (LandingMotion writes --lp-p on [data-lp-progress]). Server Component.
// Timeline geometry: every step is a two-column grid (fixed marker column + text column), the
// tape runs in the marker column centred on the step circles, so circles never overlap the text
// and headings wrap inside the viewport at any width (no negative offsets).
// The tape print is ONE vertical line: a <span> (not <p>, whose text-wrap: pretty would re-enable
// wrapping and split the print into two columns) with nowrap forced explicitly.
import Link from "next/link";
import { getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import { BTN, LP_CONTAINER, LP_H2, LP_SECTION_Y, RING_ON_LIGHT } from "./ui";

/** Marker column width; the tape and the circles are centred in it. */
const MARKER_COL = "grid-cols-[2.5rem_minmax(0,1fr)] sm:grid-cols-[3.5rem_minmax(0,1fr)]";

export function HowItWorks() {
  const t = getDictionary().landing;
  return (
    <section id="quy-trinh" aria-labelledby="quy-trinh-title" className={`scroll-mt-20 bg-white ${LP_SECTION_Y}`}>
      <div className={`${LP_CONTAINER} grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-16 xl:gap-24`}>
        <div className="lg:sticky lg:top-12 lg:self-start">
          <h2 id="quy-trinh-title" className={`${LP_H2} text-vt-ink`}>
            {t.howTitle}
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-vt-ink/80">{t.howSubtitle}</p>
          <Link href={ROUTES.design} className={`${BTN} mt-8 bg-vt-red-deep text-white ${RING_ON_LIGHT}`}>
            {t.ctaDesign}
          </Link>
        </div>

        <div data-lp-progress className="relative">
          {/* tape track: centred on the circles (marker column centre), from the first circle down */}
          <div
            aria-hidden="true"
            className="absolute top-5 bottom-0 left-[calc(1.25rem-0.6875rem)] w-[1.375rem] overflow-hidden rounded-[2px] bg-vt-paper sm:top-7 sm:left-[calc(1.75rem-0.875rem)] sm:w-7"
          >
            <div className="lp-progress-y flex h-full w-full justify-center overflow-hidden bg-vt-yellow">
              <span className="lp-display block pt-6 text-[11px] leading-none tracking-wide whitespace-nowrap text-vt-navy-deep [text-wrap-mode:nowrap] [writing-mode:vertical-rl] sm:text-[13px]">
                {Array.from({ length: 16 }, () => `${t.heroTapeText}  ●  `).join("")}
              </span>
            </div>
          </div>
          <ol className="relative flex flex-col gap-10 sm:gap-14 md:gap-16">
            {t.howSteps.map((step, i) => (
              <li key={step.title} data-lp-reveal="step" className={`grid ${MARKER_COL} gap-x-4 sm:gap-x-6`}>
                <span
                  aria-hidden="true"
                  className="lp-step-dot lp-display flex size-10 items-center justify-center rounded-full bg-vt-blue text-base text-white ring-4 ring-white sm:size-14 sm:text-xl"
                >
                  {i + 1}
                </span>
                <div className="lp-step-body min-w-0 pt-0.5 sm:pt-2">
                  <h3 className="lp-display text-[1.75rem] leading-tight break-words text-vt-ink sm:text-4xl lg:text-[2.75rem]">
                    <span className="sr-only">{i + 1}. </span>
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-md text-base leading-relaxed text-vt-ink/80 sm:mt-3 sm:text-lg">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
