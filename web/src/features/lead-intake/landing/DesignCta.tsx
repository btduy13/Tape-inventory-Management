// Call to action band linking to the designer page. Server Component.
import Link from "next/link";
import { getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";

export function DesignCta() {
  const t = getDictionary().landing;
  return (
    <section className="bg-amber-700">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white sm:text-3xl">{t.ctaTitle}</h2>
          <p className="mt-2 max-w-2xl text-amber-50">{t.ctaSubtitle}</p>
        </div>
        <Link
          href={ROUTES.design}
          className="shrink-0 rounded-lg bg-white px-6 py-3 font-semibold text-amber-800 hover:bg-amber-50"
        >
          {t.ctaDesign}
        </Link>
      </div>
    </section>
  );
}
