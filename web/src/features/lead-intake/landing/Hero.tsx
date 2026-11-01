// Landing hero: full-bleed cobalt, the giant word "BĂNG KEO" with a printed tape strip
// weaving through the letters, tiny corner tags and two CTAs. Server Component.
import Link from "next/link";
import { getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import { HeroWord } from "./HeroWord";
import { TapeMarquee } from "./TapeMarquee";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white";

function Tag({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border border-white/40 px-3 py-1 text-xs font-medium text-white sm:text-[13px] ${className}`}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-lp-tape" />
      {children}
    </span>
  );
}

export function Hero() {
  const t = getDictionary().landing;
  return (
    <>
      <section className="relative isolate overflow-hidden bg-lp-cobalt text-white">
        <div className="mx-auto flex min-h-[100svh] max-w-[1600px] flex-col px-4 pt-5 pb-16 sm:px-8 md:pb-20">
          <header className="flex items-center justify-between gap-4">
            <Link href={ROUTES.home} className={`lp-display flex items-center gap-2.5 text-[15px] tracking-tight ${focusRing}`}>
              <svg viewBox="0 0 32 32" className="size-7" aria-hidden="true">
                <circle cx="16" cy="16" r="15" className="fill-lp-tape" />
                <circle cx="16" cy="16" r="7" className="fill-lp-kraft" />
                <circle cx="16" cy="16" r="4.5" className="fill-lp-cobalt" />
              </svg>
              {t.brand}
            </Link>
            <nav aria-label={t.navLabel} className="hidden md:block">
              <ul className="flex gap-8 text-sm font-medium text-white/80">
                {t.nav.map((n) => (
                  <li key={n.href}>
                    <a href={n.href} className={`hover:text-white ${focusRing}`}>
                      {n.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <Link
              href={ROUTES.design}
              className={`rounded-full bg-white px-4 py-2 text-sm font-bold text-lp-cobalt transition-transform hover:-translate-y-0.5 ${focusRing}`}
            >
              {t.ctaDesign}
            </Link>
          </header>

          <div className="lp-fade mt-8 flex flex-wrap items-start justify-between gap-2 md:mt-12">
            <Tag>{t.heroPoints[0]}</Tag>
            <Tag>{t.heroPoints[1]}</Tag>
          </div>

          <h1 className="flex flex-1 items-center py-8 md:py-6">
            <span className="sr-only">{t.heroTitle}</span>
            <span className="lp-bob -mx-2 block w-[calc(100%+1rem)] sm:-mx-4 sm:w-[calc(100%+2rem)]">
              <HeroWord tapeText={t.heroTapeText} />
            </span>
          </h1>

          <div className="lp-fade grid items-end gap-8 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="flex flex-col gap-4">
              <p className="max-w-md text-lg leading-snug text-white sm:text-xl">{t.heroLead}</p>
              <div className="flex flex-wrap gap-2">
                <Tag>{t.heroPoints[2]}</Tag>
                <Tag>{t.heroBadge}</Tag>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={ROUTES.design}
                className={`lp-display rounded-full bg-lp-tape px-7 py-4 text-lg text-lp-ink transition-transform hover:-translate-y-0.5 ${focusRing}`}
              >
                {t.ctaDesign}
              </Link>
              <Link
                href={`${ROUTES.design}#yeu-cau-bao-gia`}
                className={`lp-display rounded-full border-2 border-white px-7 py-4 text-lg text-white transition-colors hover:bg-white hover:text-lp-cobalt ${focusRing}`}
              >
                {t.ctaQuote}
              </Link>
            </div>
          </div>
        </div>
      </section>
      <div className="pointer-events-none relative z-10 -my-14 overflow-hidden py-14">
        <TapeMarquee items={t.marquee} className="-mx-[5%] w-[110%] -rotate-2" />
      </div>
    </>
  );
}
