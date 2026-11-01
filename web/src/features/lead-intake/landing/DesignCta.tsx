// Closing call to action: cobalt band with a giant headline and both CTAs. Server Component.
import Link from "next/link";
import { getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import { TapeMarquee } from "./TapeMarquee";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white";

export function DesignCta() {
  const t = getDictionary().landing;
  return (
    <>
      <div className="pointer-events-none relative z-10 -mb-14 overflow-hidden pt-4 pb-14">
        <TapeMarquee items={t.marquee} tone="tape" reverse className="-mx-[5%] w-[110%] rotate-2" />
      </div>
      <section aria-labelledby="cta-title" className="relative overflow-hidden bg-lp-cobalt text-white">
        <div className="mx-auto max-w-[1600px] px-4 pt-28 pb-24 sm:px-8 md:pt-36 md:pb-32">
          <h2 id="cta-title" data-lp-reveal="up" className="lp-display max-w-5xl text-5xl leading-[0.92] text-balance sm:text-7xl lg:text-9xl">
            {t.ctaTitle}
          </h2>
          <div className="mt-10 grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <p className="max-w-md text-lg leading-relaxed text-white/85">{t.ctaSubtitle}</p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={ROUTES.design}
                className={`lp-display rounded-full bg-lp-tape px-8 py-4 text-lg text-lp-ink transition-transform hover:-translate-y-0.5 ${focusRing}`}
              >
                {t.ctaDesign}
              </Link>
              <Link
                href={`${ROUTES.design}#yeu-cau-bao-gia`}
                className={`lp-display rounded-full border-2 border-white px-8 py-4 text-lg transition-colors hover:bg-white hover:text-lp-cobalt ${focusRing}`}
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
