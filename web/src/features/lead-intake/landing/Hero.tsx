// Landing hero: headline, short spec row, CTAs and the carton illustration. Server Component.
import Link from "next/link";
import { getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import { CartonTapeArt } from "./CartonTapeArt";

export function Hero() {
  const t = getDictionary().landing;
  return (
    <section className="overflow-hidden border-b border-stone-200 bg-stone-50">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-12 pb-14 sm:px-6 md:grid-cols-[1.05fr_1fr] md:gap-12 md:py-20 lg:py-24">
        <div className="flex flex-col gap-6">
          <h1 className="text-4xl leading-[1.08] font-extrabold tracking-tight text-balance text-stone-900 sm:text-5xl lg:text-6xl">
            {t.heroTitle}
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-stone-700">{t.heroSubtitle}</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-stone-800">
            {t.heroPoints.map((point) => (
              <li key={point} className="border-l-4 border-amber-500 pl-2">
                {point}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href={ROUTES.design}
              className="rounded-lg bg-amber-700 px-6 py-3 font-semibold text-white hover:bg-amber-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
            >
              {t.ctaDesign}
            </Link>
            <a
              href="#lien-he"
              className="rounded-lg border border-stone-300 bg-white px-6 py-3 font-semibold text-stone-800 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-700"
            >
              {t.ctaContact}
            </a>
          </div>
          <p className="text-sm text-stone-600">{t.heroBadge}</p>
        </div>
        <div className="md:-mr-10 md:rotate-[-3deg] lg:-mr-16">
          <CartonTapeArt caption={t.heroArtCaption} tapeText={t.heroTapeText} />
        </div>
      </div>
    </section>
  );
}
