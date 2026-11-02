// Landing hero: white site header with the full Vĩnh Thịnh logo (bolt + banner + characters, background removed), then a full-bleed royal-blue band
// with the giant white word "BĂNG KEO" and a yellow printed tape strip weaving through the letters,
// a lead line and two CTAs (yellow primary, white outline secondary). Server Component.
// The printed marquee overlays the blue/paper boundary (zero-height wrapper), so no seam shows.
import Link from "next/link";
import { getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import { HeroWord } from "./HeroWord";
import { TapeMarquee } from "./TapeMarquee";
import { BTN, LP_CONTAINER, RING_ON_DARK as ringOnBlue, RING_ON_LIGHT as ringOnLight } from "./ui";

export function SiteHeader() {
  const t = getDictionary().landing;
  return (
    <header className="relative z-20 border-b border-vt-ink/10 bg-white">
      <div className={`${LP_CONTAINER} flex h-[4.5rem] items-center justify-between gap-4 md:h-24 lg:h-28`}>
        <Link href={ROUTES.home} className={`flex items-center gap-3 rounded-sm md:gap-4 ${ringOnLight}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- next/image adds an inline style (blocked by CSP) */}
          <img
            src="/brand/vinh-thinh-logo.png"
            alt={t.logoAlt}
            width={478}
            height={632}
            fetchPriority="high"
            className="h-12 w-auto md:h-16 lg:h-20"
          />
          <span className="flex flex-col leading-tight">
            <span className="lp-display text-lg text-vt-red-deep uppercase md:text-xl">{t.brandName}</span>
            <span className="text-xs font-semibold text-vt-ink/70 md:text-sm">{t.brand}</span>
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
      <section className="relative isolate overflow-hidden bg-vt-blue text-white">
        {/* soft light from the top-right so the flat blue field has some depth */}
        <div aria-hidden="true" className="lp-glow-tr pointer-events-none absolute inset-0 -z-10" />
        <div className={`${LP_CONTAINER} flex min-h-[min(calc(100svh-4rem),46rem)] flex-col justify-center gap-6 pt-8 pb-16 md:min-h-0 md:gap-4 md:pt-8 md:pb-14 lg:min-h-[min(calc(100svh-5rem),46rem)] lg:pt-10 lg:pb-20`}>
          <h1 className="flex items-center py-2">
            <span className="sr-only">{t.heroTitle}</span>
            <span className="lp-bob -mx-2 block w-[calc(100%+1rem)] sm:-mx-4 sm:w-[calc(100%+2rem)]">
              <HeroWord tapeText={t.heroTapeText} />
            </span>
          </h1>

          <div className="lp-fade grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
            <p className="max-w-xl text-lg leading-snug font-medium text-white sm:text-xl">{t.heroLead}</p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={ROUTES.design}
                className={`${BTN} bg-vt-yellow text-vt-ink ${ringOnBlue}`}
              >
                {t.ctaDesign}
              </Link>
              <a
                href="#lien-he"
                className={`${BTN} border-2 border-white text-white hover:bg-white hover:text-vt-blue ${ringOnBlue}`}
              >
                {t.ctaContact}
              </a>
            </div>
          </div>
        </div>
      </section>
      <div aria-hidden="true" className="pointer-events-none relative z-10 h-0">
        <TapeMarquee items={t.marquee} className="lp-tilt absolute top-0 -left-[5%] w-[110%] -translate-y-1/2" />
      </div>
    </>
  );
}
