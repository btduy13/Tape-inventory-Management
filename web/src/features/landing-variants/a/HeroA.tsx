// Variant A hero: compact cobalt band, giant woven word, h1 tail, lead and two CTAs.
import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { HREF, copyA as t } from "./copy";
import { HeroWordA } from "./HeroWordA";
import s from "./styles";
import { btnBase, ringOnDark, wrap } from "./ui";

export function HeroA() {
  return (
    <section className="relative isolate overflow-hidden bg-lp-cobalt text-white">
      <div className={`${wrap} pt-4 pb-10 md:pb-14`}>
        <header className="flex items-center justify-between gap-4">
          <Link href={ROUTES.home} className={`lp-display flex items-center gap-2.5 text-base ${ringOnDark}`}>
            <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
              <circle cx="16" cy="16" r="15" className="fill-lp-tape" />
              <circle cx="16" cy="16" r="7" className="fill-lp-kraft" />
              <circle cx="16" cy="16" r="4.5" className="fill-lp-cobalt" />
            </svg>
            {t.brand}
          </Link>
          <nav aria-label={t.navLabel} className="hidden md:block">
            <ul className="flex gap-1 text-[15px] font-semibold">
              {t.nav.map((n) => (
                <li key={n.href}>
                  <a href={n.href} className={`block rounded-full px-4 py-2.5 text-white/85 transition-colors hover:bg-white/10 hover:text-white ${ringOnDark}`}>
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <Link href={HREF.design} className={`${btnBase} min-h-11 bg-white px-5 text-[15px] text-lp-cobalt ${ringOnDark}`}>
            {t.ctaDesign}
          </Link>
        </header>

        <h1 className="mt-6 md:mt-4">
          <span className="sr-only">{t.heroWordSr} </span>
          <span className="-mx-2 block sm:-mx-4">
            <HeroWordA tapeText={t.heroTapeText} />
          </span>
          <span className="lp-display mt-1 block text-[clamp(2rem,5.6vw,5.25rem)] leading-[0.95] text-white md:-mt-2">
            {t.heroTitleRest}
          </span>
        </h1>

        <div className={`${s.fadeUp} mt-6 flex flex-col gap-5 md:mt-8 md:flex-row md:items-end md:justify-between`}>
          <p className="max-w-[34ch] text-lg leading-snug text-white sm:text-xl">{t.heroLead}</p>
          <div className="flex flex-wrap gap-3">
            <Link href={HREF.design} className={`${btnBase} bg-lp-tape px-7 text-lg text-lp-navy ${ringOnDark}`}>
              {t.ctaDesign}
            </Link>
            <Link href={HREF.quote} className={`${btnBase} border-2 border-white px-7 text-lg text-white hover:bg-white hover:text-lp-cobalt ${ringOnDark}`}>
              {t.ctaQuote}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
