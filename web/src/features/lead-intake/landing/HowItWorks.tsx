// Four-step ordering process. A printed tape line draws itself down the steps as you scroll
// (LandingMotion writes --lp-p on [data-lp-progress]). Server Component.
import Link from "next/link";
import { getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import { BTN, LP_CONTAINER, LP_H2, LP_SECTION_Y, RING_ON_LIGHT } from "./ui";

export function HowItWorks() {
  const t = getDictionary().landing;
  return (
    <section id="quy-trinh" aria-labelledby="quy-trinh-title" className={`scroll-mt-20 bg-white ${LP_SECTION_Y}`}>
      <div className={`${LP_CONTAINER} grid gap-12 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] xl:gap-20`}>
        <div className="xl:sticky xl:top-12 xl:self-start">
          <h2 id="quy-trinh-title" className={`${LP_H2} text-vt-ink`}>
            {t.howTitle}
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-vt-ink/80">{t.howSubtitle}</p>
          <Link href={ROUTES.design} className={`${BTN} mt-8 bg-vt-red-deep text-white ${RING_ON_LIGHT}`}>
            {t.ctaDesign}
          </Link>
        </div>

        <div data-lp-progress className="relative">
          <div aria-hidden="true" className="absolute top-0 bottom-0 left-0 w-12 overflow-hidden bg-vt-paper">
            <div className="lp-progress-y flex h-full w-full justify-center overflow-hidden bg-vt-yellow">
              <p className="py-4 text-[15px] font-extrabold tracking-wide whitespace-nowrap text-vt-navy-deep [writing-mode:vertical-rl]">
                {Array.from({ length: 12 }, () => `${t.heroTapeText}  ●  `).join("")}
              </p>
            </div>
          </div>
          <ol className="flex flex-col gap-14 pl-20 md:gap-20 md:pl-24">
            {t.howSteps.map((step, i) => (
              <li key={step.title} data-lp-reveal="step" className="relative py-2">
                <span
                  aria-hidden="true"
                  className="lp-step-dot lp-display absolute top-2 -left-20 flex size-12 items-center justify-center rounded-full bg-vt-blue text-lg text-white ring-4 ring-white md:-left-24"
                >
                  {i + 1}
                </span>
                <div className="lp-step-body">
                  <h3 className="lp-display text-4xl text-vt-ink sm:text-5xl">
                    <span className="sr-only">{i + 1}. </span>
                    {step.title}
                  </h3>
                  <p className="mt-3 max-w-md text-lg leading-relaxed text-vt-ink/80">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
