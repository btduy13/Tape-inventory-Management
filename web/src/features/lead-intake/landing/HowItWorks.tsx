// Four-step ordering process, drawn as marks along a tape line. Server Component.
import { getDictionary } from "@/i18n";

export function HowItWorks() {
  const t = getDictionary().landing;
  return (
    <section aria-labelledby="quy-trinh-title" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-20">
      <h2 id="quy-trinh-title" className="text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
        {t.howTitle}
      </h2>
      <p className="mt-3 text-stone-700">{t.howSubtitle}</p>
      <ol className="relative mt-10 grid gap-8 border-l-4 border-amber-400 pl-6 md:grid-cols-4 md:gap-6 md:border-t-4 md:border-l-0 md:pt-8 md:pl-0">
        {t.howSteps.map((step, i) => (
          <li key={step.title} className="relative flex flex-col gap-2">
            <span
              aria-hidden
              className="absolute top-0 -left-10 flex h-7 w-7 items-center justify-center rounded-full bg-stone-900 text-sm font-bold text-amber-300 md:-top-12 md:left-0"
            >
              {i + 1}
            </span>
            <h3 className="font-bold text-stone-900">
              <span className="sr-only">{i + 1}. </span>
              {step.title}
            </h3>
            <p className="text-sm leading-relaxed text-stone-700">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
