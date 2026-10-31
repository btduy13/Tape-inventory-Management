// Landing page. Thin: real content comes from features/lead-intake (landing sections).
import Link from "next/link";
import { getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";

export default function HomePage() {
  const t = getDictionary();
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight">{t.landing.heroTitle}</h1>
      <p className="max-w-xl text-lg text-neutral-600">{t.landing.heroSubtitle}</p>
      <Link
        href={ROUTES.design}
        className="rounded-lg bg-amber-700 px-6 py-3 font-semibold text-white hover:bg-amber-800"
      >
        {t.landing.ctaDesign}
      </Link>
    </main>
  );
}
