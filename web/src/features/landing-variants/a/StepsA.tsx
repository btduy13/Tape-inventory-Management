// Four-step process. Numbers sit on a tape line that runs through the row.
import Link from "next/link";
import { HREF, copyA as t } from "./copy";
import { btnBase, ringOnLight, wrap } from "./ui";

export function StepsA() {
  return (
    <section id="quy-trinh" aria-labelledby="quy-trinh-title" className="scroll-mt-4 bg-white text-lp-navy">
      <div className={`${wrap} py-12 md:py-16`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="quy-trinh-title" className="lp-display text-4xl md:text-5xl">
            {t.stepsTitle}
          </h2>
          <Link href={HREF.design} className={`${btnBase} bg-lp-cobalt text-white ${ringOnLight}`}>
            {t.ctaDesign}
          </Link>
        </div>
        <div className="relative mt-8">
        <div aria-hidden="true" className="absolute top-5 right-0 left-0 hidden h-3 -translate-y-1/2 bg-lp-tape lg:block" />
        <ol className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {t.steps.map((step, i) => (
            <li key={step.title} className="relative flex gap-4 lg:block">
              <span className="lp-display relative flex size-10 shrink-0 items-center justify-center rounded-full bg-lp-navy text-lg text-white ring-4 ring-white">
                {i + 1}
              </span>
              <div className="lg:mt-4">
                <h3 className="lp-display text-xl">{step.title}</h3>
                <p className="mt-1 max-w-[32ch] text-[15px] leading-snug text-lp-navy/80">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        </div>
      </div>
    </section>
  );
}
