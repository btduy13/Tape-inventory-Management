// Four-step ordering process. Server Component.
import { getDictionary } from "@/i18n";

export function HowItWorks() {
  const t = getDictionary().landing;
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
      <h2 className="text-3xl font-bold tracking-tight text-stone-900">{t.howTitle}</h2>
      <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {t.howSteps.map((step, i) => (
          <li key={step.title} className="flex flex-col gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-800">
              {i + 1}
            </span>
            <h3 className="font-semibold text-stone-900">{step.title}</h3>
            <p className="text-sm text-stone-600">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
