// Landing hero: headline, value points, CTAs. Server Component.
import Link from "next/link";
import { getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import { TapeRollArt } from "./TapeRollArt";

export function Hero() {
  const t = getDictionary().landing;
  return (
    <section className="bg-gradient-to-b from-amber-50 to-white">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
        <div className="flex flex-col gap-5">
          <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-900">
            {t.heroBadge}
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">{t.heroTitle}</h1>
          <p className="text-lg text-stone-600">{t.heroSubtitle}</p>
          <ul className="flex flex-col gap-2 text-stone-700">
            {t.heroPoints.map((point) => (
              <li key={point} className="flex items-center gap-2">
                <span aria-hidden className="h-2 w-2 rounded-full bg-amber-600" />
                {point}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href={ROUTES.design}
              className="rounded-lg bg-amber-700 px-6 py-3 font-semibold text-white hover:bg-amber-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
            >
              {t.ctaDesign}
            </Link>
            <a
              href="#lien-he"
              className="rounded-lg border border-stone-300 px-6 py-3 font-semibold text-stone-800 hover:bg-stone-50"
            >
              {t.ctaContact}
            </a>
          </div>
        </div>
        <TapeRollArt />
      </div>
    </section>
  );
}
