// Landing hero: white site header with the full Vĩnh Thịnh logo (bolt + banner + characters, background removed), then a full-bleed brand-red band
// with the giant word "BĂNG KEO" and a yellow printed tape strip weaving through the letters
// (the logo's own yellow-on-red banner), spec tags and two CTAs. Server Component.
import Link from "next/link";
import { getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import { HeroWord } from "./HeroWord";
import { TapeMarquee } from "./TapeMarquee";
import { BTN, LP_CONTAINER, RING_ON_DARK as ringOnRed, RING_ON_LIGHT as ringOnLight } from "./ui";

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/45 px-3 py-1 text-xs font-semibold text-white sm:text-[13px]">
      <span aria-hidden="true" className="size-1.5 rounded-full bg-vt-yellow" />
      {children}
    </span>
  );
}

export function SiteHeader() {
  const t = getDictionary().landing;
  return (
    <header className="relative z-20 border-b border-vt-ink/10 bg-white">
      <div className={`${LP_CONTAINER} flex h-16 items-center justify-between gap-4 md:h-20`}>
        <Link href={ROUTES.home} className={`flex items-center gap-3 rounded-sm ${ringOnLight}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- next/image adds an inline style (blocked by CSP) */}
          <img
            src="/brand/vinh-thinh-logo.png"
            alt={t.logoAlt}
            width={478}
            height={632}
            fetchPriority="high"
            className="h-12 w-auto md:h-16"
          />
          <span className="border-l border-vt-ink/15 pl-3 text-[11px] leading-tight font-bold tracking-wide text-vt-navy uppercase md:text-xs">
            {t.brand}
          </span>
        </Link>
        <nav aria-label={t.navLabel} className="hidden lg:block">
          <ul className="flex gap-8 text-sm font-semibold text-vt-ink/75">
            {t.nav.map((n) => (
              <li key={n.href}>
                <a href={n.href} className={`transition-colors hover:text-vt-red-deep ${ringOnLight}`}>
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <Link
          href={ROUTES.design}
          className={`lp-press rounded-full bg-vt-red-deep px-4 py-2.5 text-sm font-bold text-white md:px-5 ${ringOnLight}`}
        >
          {t.ctaDesign}
        </Link>
      </div>
    </header>
  );
}

export function Hero() {
  const t = getDictionary().landing;
  return (
    <>
      <SiteHeader />
      <section className="relative isolate overflow-hidden bg-vt-red-deep text-white">
        {/* soft brand-red light from the top-right, like the logo's lightning bolt */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_85%_0%,var(--vt-red)_0%,transparent_70%)]" />
        <div className={`${LP_CONTAINER} flex min-h-[min(calc(100svh-4rem),46rem)] flex-col justify-center gap-6 pt-8 pb-16 md:min-h-0 md:gap-4 md:pt-8 md:pb-14 lg:min-h-[min(calc(100svh-5rem),46rem)] lg:pt-10 lg:pb-20`}>
          <div className="lp-fade flex flex-wrap items-start justify-between gap-2">
            <Tag>{t.heroPoints[0]}</Tag>
            <Tag>{t.heroPoints[1]}</Tag>
          </div>

          <h1 className="flex items-center py-2">
            <span className="sr-only">{t.heroTitle}</span>
            <span className="lp-bob -mx-2 block w-[calc(100%+1rem)] sm:-mx-4 sm:w-[calc(100%+2rem)]">
              <HeroWord tapeText={t.heroTapeText} />
            </span>
          </h1>

          <div className="lp-fade grid items-end gap-8 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="flex flex-col gap-4">
              <p className="max-w-md text-lg leading-snug font-medium text-white sm:text-xl">{t.heroLead}</p>
              <div className="flex flex-wrap gap-2">
                <Tag>{t.heroPoints[2]}</Tag>
                <Tag>{t.heroBadge}</Tag>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={ROUTES.design}
                className={`${BTN} bg-vt-yellow text-vt-ink ${ringOnRed}`}
              >
                {t.ctaDesign}
              </Link>
              <Link
                href={`${ROUTES.design}#yeu-cau-bao-gia`}
                className={`${BTN} border-2 border-white text-white hover:bg-white hover:text-vt-red-deep ${ringOnRed}`}
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
