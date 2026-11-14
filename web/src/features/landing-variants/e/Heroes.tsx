// Variant E heroes that need no client state (Server Components):
//  - HeroWordX: the live hero's giant word with the weaving tape, now over two crossing tapes;
//  - HeroStrips: the headline itself is printed on three tape strips laid down by rolls.
import Link from "next/link";
import { getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import { HeroWord } from "@/features/lead-intake/landing/HeroWord";
import { BTN, LP_CONTAINER, RING_ON_DARK } from "@/features/lead-intake/landing/ui";
import { RollFace } from "./art";
import { copyE } from "./copy";

/** Lead line + the two hero CTAs (same row in every hero). */
export function HeroActions({ lead }: { lead: string }) {
  const t = getDictionary().landing;
  return (
    <div className="lp-fade grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
      <p className="max-w-xl text-lg leading-snug font-medium text-white sm:text-xl">{lead}</p>
      <div className="flex flex-wrap gap-3">
        <Link href={ROUTES.design} className={`${BTN} bg-vt-yellow text-vt-ink ${RING_ON_DARK}`}>
          {t.ctaDesign}
        </Link>
        <a href="#lien-he" className={`${BTN} border-2 border-white text-white hover:bg-white hover:text-vt-blue ${RING_ON_DARK}`}>
          {t.ctaContact}
        </a>
      </div>
    </div>
  );
}

/** Background tape crossing the hero: tone-on-tone print so the white word stays the loudest thing. */
function Band({ strip, print, reverse, className }: { strip: string; print: string; reverse?: boolean; className: string }) {
  const text = getDictionary().landing.heroTapeText;
  return (
    <div aria-hidden="true" className={`ve-lay absolute -left-[15%] w-[130%] overflow-hidden ${strip} ${className}`}>
      <div className={`flex w-max lp-marquee-slow ${reverse ? "lp-marquee-rev" : "lp-marquee"}`}>
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0">
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className={`lp-display px-6 py-3 text-xl whitespace-nowrap sm:py-4 sm:text-3xl ${print}`}>
                {text}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function HeroWordX() {
  const t = getDictionary().landing;
  return (
    <section className="relative isolate overflow-hidden bg-vt-blue text-white">
      <div aria-hidden="true" className="lp-glow-tr pointer-events-none absolute inset-0 -z-10" />
      <Band strip="bg-vt-red-deep" print="text-vt-red-dark" className="ve-d1 top-[12%] -z-10 -rotate-[7deg]" />
      <Band strip="bg-vt-navy-deep" print="text-vt-blue" reverse className="ve-d2 top-[52%] -z-10 rotate-[5deg]" />
      <div
        className={`${LP_CONTAINER} flex min-h-[min(calc(100svh-4rem),46rem)] flex-col justify-center gap-6 pt-8 pb-16 md:min-h-0 md:gap-4 md:pt-8 md:pb-14 lg:min-h-[min(calc(100svh-5rem),46rem)] lg:pt-10 lg:pb-20`}
      >
        <h1 className="flex items-center py-2">
          <span className="sr-only">{t.heroTitle}</span>
          <span className="lp-bob -mx-2 block w-[calc(100%+1rem)] sm:-mx-4 sm:w-[calc(100%+2rem)]">
            <HeroWord tapeText={t.heroTapeText} />
          </span>
        </h1>
        <HeroActions lead={t.heroLead} />
      </div>
    </section>
  );
}

const STRIPS = [
  { gutter: "ve-g0", rot: "-rotate-2", delay: "", tape: "bg-vt-yellow text-vt-navy-deep", face: "fill-vt-yellow", mark: "stroke-vt-navy-deep/45" },
  { gutter: "ve-g1", rot: "rotate-1", delay: "ve-d1", tape: "bg-white text-vt-red-deep", face: "fill-white", mark: "stroke-vt-red-deep/60" },
  { gutter: "ve-g2", rot: "-rotate-1", delay: "ve-d2", tape: "bg-vt-red-deep text-white", face: "fill-vt-red-deep", mark: "stroke-white/60" },
] as const;

export function HeroStrips() {
  const t = getDictionary().landing;
  return (
    <section className="relative isolate overflow-hidden bg-vt-blue text-white">
      <div aria-hidden="true" className="lp-glow-tr pointer-events-none absolute inset-0 -z-10" />
      <h1 className="flex flex-col items-start gap-2 pt-10 md:gap-3 md:pt-14">
        {copyE.heroLines.map((line, i) => {
          const s = STRIPS[i];
          return (
            <span key={line} className={`relative block w-fit origin-left ${s.rot}`}>
              <span
                className={`ve-lay ve-hero-type lp-display block pr-[1.1em] uppercase shadow-[0_18px_40px_-20px_rgb(20_23_102/0.9)] ${s.delay} ${s.gutter} ${s.tape}`}
              >
                {line}{" "}
              </span>
              <span aria-hidden="true" className={`ve-travel pointer-events-none absolute inset-0 ${s.delay}`}>
                <span className="absolute top-1/2 right-0 aspect-square h-[135%] translate-x-1/2 -translate-y-1/2">
                  <span className={`ve-rollspin block size-full ${s.delay}`}>
                    <RollFace face={s.face} mark={s.mark} className="ve-idle size-full" />
                  </span>
                </span>
              </span>
            </span>
          );
        })}
      </h1>
      <div className={`${LP_CONTAINER} pt-10 pb-20 md:pt-12 md:pb-24`}>
        <HeroActions lead={t.heroLead} />
      </div>
    </section>
  );
}
