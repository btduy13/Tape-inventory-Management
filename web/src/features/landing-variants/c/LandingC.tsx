// Landing variant C ("interactive conversion / dark bento"). Server Component shell;
// the interactive cards live in TapeLab (client).
import Link from "next/link";
import { getDictionary } from "@/i18n";
import { contactInfoFromEnv } from "@/features/lead-intake/landing/contact-info";
import "./c.css";
import { copy } from "./copy";
import { TapeLab } from "./TapeLab";
import { card, focusRing } from "./ui";

function Process() {
  return (
    <section aria-labelledby="c-process" className={`${card} p-5 sm:p-6 md:col-span-6 lg:col-span-8`}>
      <h2 id="c-process" className={`vc-display text-2xl`}>
        {copy.processTitle}
      </h2>
      <ol className="relative mt-5 grid gap-5 md:grid-cols-4 md:gap-4">
        {/* tape line through the markers */}
        <span
          aria-hidden="true"
          className={`absolute top-5 bottom-5 left-[19px] w-1.5 rounded-full bg-[#f5a524]/70 md:top-[17px] md:right-[12%] md:bottom-auto md:left-5 md:h-1.5 md:w-auto`}
        />
        {copy.steps.map((step, i) => (
          <li key={step.title} className="relative flex gap-4 md:block">
            <span className="relative z-10 grid size-10 shrink-0 place-items-center rounded-full border-2 border-[#f5a524] bg-[#1d2026] text-base font-bold text-[#f5a524] tabular-nums">
              {i + 1}
            </span>
            <div className="min-w-0 md:mt-3">
              <h3 className="font-bold text-white">{step.title}</h3>
              <p className="mt-1 text-sm text-[#a9aeb7]">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Cta() {
  return (
    <section
      aria-labelledby="c-cta"
      className="flex min-w-0 flex-col justify-between gap-5 rounded-2xl bg-[#f5a524] p-5 text-[#17181c] sm:p-6 md:col-span-6 lg:col-span-4"
    >
      <div>
        <h2 id="c-cta" className={`vc-display text-2xl sm:text-3xl`}>
          {copy.ctaTitle}
        </h2>
        <p className="mt-2 text-[#2b2410]">{copy.ctaBody}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/thiet-ke"
          className="inline-flex h-12 items-center rounded-xl bg-[#17181c] px-6 font-bold text-[#f5a524] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17181c]"
        >
          {copy.ctaDesign}
        </Link>
        <Link
          href="/thiet-ke#yeu-cau-bao-gia"
          className="inline-flex h-12 items-center rounded-xl border-2 border-[#17181c] px-5 font-bold outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17181c]"
        >
          {copy.ctaQuote}
        </Link>
      </div>
    </section>
  );
}

export function LandingC() {
  const t = getDictionary().landing;
  const info = contactInfoFromEnv(process.env);
  const rows: { label: string; value: string; href?: string | null }[] = [];
  if (info.phone) rows.push({ label: t.contactPhone, value: info.phone, href: info.phoneHref });
  if (info.email) rows.push({ label: t.contactEmail, value: info.email, href: `mailto:${info.email}` });
  if (info.address) rows.push({ label: t.contactAddress, value: info.address });
  if (info.hours) rows.push({ label: t.contactHours, value: info.hours });

  return (
    <div className={`vc-page flex min-h-full flex-1 flex-col overflow-x-clip`}>
      <header className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 px-3 py-3 sm:px-5">
        <Link href="/mau/c" className={`flex items-center gap-2 rounded-md font-bold text-white ${focusRing}`}>
          <svg viewBox="0 0 24 24" className="size-7" aria-hidden="true" focusable="false">
            <circle cx={12} cy={12} r={11} fill="#f5a524" />
            <circle cx={12} cy={12} r={5} fill="#15171c" />
          </svg>
          {copy.brand}
        </Link>
        <Link
          href="/thiet-ke#yeu-cau-bao-gia"
          className={`hidden h-10 items-center rounded-lg border border-white/20 px-4 text-sm font-semibold text-white hover:border-white/50 sm:inline-flex ${focusRing}`}
        >
          {copy.ctaQuote}
        </Link>
      </header>

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-3 pb-3 sm:px-5 sm:pb-5">
        <TapeLab process={<Process />} cta={<Cta />} />
      </main>

      <footer id="lien-he" className="mx-auto w-full max-w-[1440px] px-3 pb-6 sm:px-5">
        <div className="flex flex-col gap-4 border-t border-white/10 pt-5 text-sm text-[#a9aeb7] md:flex-row md:items-start md:justify-between">
          <p>{t.footerNote}</p>
          {rows.length > 0 && (
            <div>
            <h2 className="sr-only">{copy.contactTitle}</h2>
            <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-flow-col lg:grid-cols-none">
              {rows.map((r) => (
                <div key={r.label} className="flex gap-2">
                  <dt>{r.label}:</dt>
                  <dd className="font-semibold text-white">
                    {r.href ? (
                      <a href={r.href} className={`rounded-sm underline-offset-4 hover:underline ${focusRing}`}>
                        {r.value}
                      </a>
                    ) : (
                      r.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
