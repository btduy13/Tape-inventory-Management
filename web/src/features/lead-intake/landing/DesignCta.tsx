// Closing call to action: brand-red band with a giant headline and both CTAs. Server Component.
// The printed marquee overlays the white/red boundary (zero-height wrapper), so no seam shows.
import Link from "next/link";
import { getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import { TapeMarquee } from "./TapeMarquee";
import { BTN, LP_CONTAINER, RING_ON_DARK } from "./ui";

export function DesignCta() {
  const t = getDictionary().landing;
  return (
    <>
      <div aria-hidden="true" className="pointer-events-none relative z-10 h-0">
        <TapeMarquee items={t.marquee} tone="tape" reverse className="absolute top-0 -left-[5%] w-[110%] -translate-y-1/2 rotate-2" />
      </div>
      <section aria-labelledby="cta-title" className="relative isolate overflow-hidden bg-vt-red-deep text-white">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_70%_at_100%_100%,var(--vt-red)_0%,transparent_70%)]" />
        <div className={`${LP_CONTAINER} pt-28 pb-20 md:pt-36 md:pb-28`}>
          <div data-lp-reveal="up" className="flex max-w-4xl flex-col items-start">
            <h2 id="cta-title" className="lp-display text-5xl leading-[0.95] sm:text-7xl lg:text-8xl">
              {t.ctaTitle}
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/90 sm:text-xl">{t.ctaSubtitle}</p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href={ROUTES.design} className={`${BTN} bg-vt-yellow text-vt-ink ${RING_ON_DARK}`}>
                {t.ctaDesign}
              </Link>
              <Link
                href={`${ROUTES.design}#yeu-cau-bao-gia`}
                className={`${BTN} border-2 border-white text-white hover:bg-white hover:text-vt-red-deep ${RING_ON_DARK}`}
              >
                {t.ctaQuote}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
