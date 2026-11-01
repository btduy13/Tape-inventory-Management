// Four-step ordering process. A printed tape line draws itself down the steps as you scroll
// (LandingMotion writes --lp-p on [data-lp-progress]). Server Component.
import Link from "next/link";
import { getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";

export function HowItWorks() {
  const t = getDictionary().landing;
  return (
    <section id="quy-trinh" aria-labelledby="quy-trinh-title" className="scroll-mt-4 bg-white pt-24 pb-24 md:pt-32 md:pb-32">
      <div className="mx-auto grid max-w-[1600px] gap-14 px-4 sm:px-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:gap-20">
        <div className="md:sticky md:top-12 md:self-start">
          <h2 id="quy-trinh-title" className="lp-display text-5xl leading-[0.95] text-balance text-lp-ink sm:text-6xl lg:text-8xl">
            {t.howTitle}
          </h2>
          <p className="mt-5 max-w-sm text-lg leading-relaxed text-lp-ink/80">{t.howSubtitle}</p>
          <Link
            href={ROUTES.design}
            className="lp-display mt-8 inline-block rounded-full bg-lp-cobalt px-7 py-4 text-lg text-white transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lp-cobalt"
          >
            {t.ctaDesign}
          </Link>
        </div>

        <div data-lp-progress className="relative">
          <div aria-hidden="true" className="absolute top-0 bottom-0 left-0 w-12 overflow-hidden bg-lp-mist">
            <div className="lp-progress-y flex h-full w-full justify-center overflow-hidden bg-lp-tape">
              <p className="py-4 text-[15px] font-extrabold tracking-wide whitespace-nowrap text-lp-ink [writing-mode:vertical-rl]">
                {Array.from({ length: 12 }, () => `${t.heroTapeText}  ●  `).join("")}
              </p>
            </div>
          </div>
          <ol className="flex flex-col gap-16 pl-20 md:gap-24 md:pl-24">
            {t.howSteps.map((step, i) => (
              <li key={step.title} data-lp-reveal="step" className="relative py-2">
                <span
                  aria-hidden="true"
                  className="lp-step-dot lp-display absolute top-2 -left-20 flex size-12 items-center justify-center rounded-full bg-lp-cobalt text-lg text-white ring-4 ring-white md:-left-24"
                >
                  {i + 1}
                </span>
                <div className="lp-step-body">
                  <h3 className="lp-display text-4xl text-lp-ink sm:text-5xl lg:text-6xl">
                    <span className="sr-only">{i + 1}. </span>
                    {step.title}
                  </h3>
                  <p className="mt-3 max-w-md text-lg leading-relaxed text-lp-ink/80">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
