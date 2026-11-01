// "Why custom tape" band on a kraft background, plus who it suits. Server Component.
import { getDictionary } from "@/i18n";

export function UseCases() {
  const t = getDictionary().landing;
  return (
    <section aria-labelledby="vi-sao-title" className="relative overflow-hidden bg-[#c99c66]">
      {/* full-bleed tape strip across the carton band: the page's one loud moment */}
      <div
        aria-hidden
        className="flex h-11 -rotate-1 items-center gap-8 overflow-hidden bg-amber-400 whitespace-nowrap shadow-sm"
      >
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className="flex items-center gap-2 text-sm font-extrabold tracking-wide text-stone-900">
            <span className="h-4 w-4 shrink-0 rounded-full bg-stone-900" />
            {t.heroTapeText}
          </span>
        ))}
      </div>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-12 pb-16 sm:px-6 md:grid-cols-[1fr_1.4fr] md:pt-16 md:pb-20">
        <div>
          <h2 id="vi-sao-title" className="text-3xl font-extrabold tracking-tight text-stone-950 sm:text-4xl">
            {t.whyTitle}
          </h2>
          <p className="mt-3 leading-relaxed text-stone-900">{t.whySubtitle}</p>
          <h3 className="mt-8 font-bold text-stone-950">{t.useCasesTitle}</h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {t.useCases.map((u) => (
              <li key={u} className="rounded-full bg-stone-50/90 px-3 py-1.5 text-sm font-medium text-stone-900">
                {u}
              </li>
            ))}
          </ul>
        </div>
        <ul className="grid gap-px overflow-hidden rounded-lg bg-[#8a6239]/40">
          {t.whyReasons.map((r) => (
            <li key={r.title} className="bg-[#d2a873] p-5 sm:p-6">
              <h3 className="text-lg font-bold text-stone-950">{r.title}</h3>
              <p className="mt-1 leading-relaxed text-stone-900">{r.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
