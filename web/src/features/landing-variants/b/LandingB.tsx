// Landing variant B: clean editorial / premium minimal. Server Component.
import Link from "next/link";
import { getDictionary } from "@/i18n";
import { contactInfoFromEnv } from "@/features/lead-intake/landing/contact-info";
import { CartonArt, CupArt, ParcelArt, WidthScale } from "./art";
import { copyB as c, LINKS } from "./copy";
import { HeroStage } from "./HeroStage";
import { MotionRoot } from "./MotionRoot";
import { s } from "./styles";

const wrap = "mx-auto w-full max-w-[1360px] px-4 sm:px-8 lg:px-12";
const grid = "grid grid-cols-4 gap-x-4 sm:gap-x-6 md:grid-cols-12";
const btnPrimary = `${s.btn} ${s.focus} inline-flex min-h-12 items-center justify-center rounded-full bg-(--b-ink) px-7 text-[15px] font-semibold text-(--b-paper)`;
const btnSecondary = `${s.focus} inline-flex min-h-12 items-center justify-center rounded-full border border-(--b-ink) px-7 text-[15px] font-semibold text-(--b-ink) transition-colors duration-200 hover:bg-(--b-ink) hover:text-(--b-paper)`;

const USE_ART = { carton: CartonArt, cup: CupArt, ecom: ParcelArt } as const;

function Seal() {
  const items = Array.from({ length: 14 }, (_, i) => i);
  return (
    <div className={wrap} aria-hidden="true">
      <div className={s.seal} data-seal="">
        <div className={s.sealPrint}>
          {items.map((i) => (
            <span key={i} className="inline-flex items-center gap-2.5">
              <svg viewBox="0 0 16 16" className="size-3.5">
                <circle cx="8" cy="8" r="7" className="fill-(--b-paper)" />
                <circle cx="8" cy="8" r="3" className="fill-(--b-accent)" />
              </svg>
              {c.tapePrint}
            </span>
          ))}
        </div>
        <div className={s.sealGloss} />
        <div className={s.sealCover} />
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className={`${wrap} flex items-center justify-between gap-4 py-5`}>
      <Link href="/" className={`${s.focus} ${s.display} flex items-center gap-2.5 text-[17px] tracking-tight`}>
        <svg viewBox="0 0 28 28" className="size-7" aria-hidden="true">
          <circle cx="14" cy="14" r="13" className="fill-(--b-accent)" />
          <circle cx="14" cy="14" r="6.5" className="fill-(--b-kraft)" />
          <circle cx="14" cy="14" r="4" className="fill-(--b-paper)" />
        </svg>
        {c.brand}
      </Link>
      <nav aria-label={c.navLabel} className="hidden md:block">
        <ul className="flex gap-9 text-[15px] text-(--b-muted)">
          {c.nav.map((n) => (
            <li key={n.href}>
              <a href={n.href} className={`${s.focus} transition-colors hover:text-(--b-ink)`}>
                {n.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <Link href={LINKS.design} className={`${btnPrimary} min-h-11 px-5 text-sm`}>
        {c.ctaDesign}
      </Link>
    </header>
  );
}

function Hero() {
  return (
    <section className={`${wrap} pt-6 pb-14 md:pt-10 md:pb-20`}>
      <div className={`${grid} items-center gap-y-10`}>
        <div className="col-span-4 md:col-span-6 lg:col-span-5">
          <h1 className={`${s.display} ${s.heroIn} text-[2.75rem] sm:text-6xl lg:text-[5.25rem]`}>{c.heroTitle}</h1>
          <p className={`${s.heroIn2} mt-6 max-w-[36ch] text-lg leading-relaxed text-(--b-muted)`}>{c.heroLead}</p>
          <div className={`${s.heroIn3} mt-8 flex flex-wrap gap-3`}>
            <Link href={LINKS.design} className={btnPrimary}>
              {c.ctaDesign}
            </Link>
            <Link href={LINKS.quote} className={btnSecondary}>
              {c.ctaQuote}
            </Link>
          </div>
          <dl className={`${s.heroIn3} mt-12 grid grid-cols-3 border-t border-(--b-ink)`}>
            {c.heroFacts.map((f) => (
              <div key={f.term} className="pt-4 pr-3">
                <dt className="text-[13px] text-(--b-muted)">{f.term}</dt>
                <dd className={`${s.num} mt-1 text-xl font-semibold sm:text-2xl`}>{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className={`${s.heroStage} col-span-4 md:col-span-6 lg:col-span-7`}>
          <HeroStage />
        </div>
      </div>
    </section>
  );
}

function Specs() {
  return (
    <section id="quy-cach" aria-labelledby="b-specs" className={`${wrap} scroll-mt-6 py-20 md:py-28`}>
      <div className={`${grid} items-end gap-y-4`} data-reveal="">
        <h2 id="b-specs" className={`${s.display} col-span-4 text-4xl sm:text-5xl md:col-span-5`}>
          {c.specsTitle}
        </h2>
        <p className="col-span-4 max-w-[52ch] text-lg text-pretty leading-relaxed text-(--b-muted) md:col-span-6 md:col-start-7">{c.specsLead}</p>
      </div>
      <div className="mt-10 md:mt-14" data-reveal="2">
        <WidthScale />
      </div>
      <dl className={`${grid} mt-16 gap-y-10 md:mt-20`}>
        {c.specs.map((sp, i) => (
          <div key={sp.term} className="col-span-4 border-t border-(--b-ink) pt-5" data-reveal={String(i + 1)}>
            <dt className="text-[15px] text-(--b-muted)">{sp.term}</dt>
            <dd>
              <span className={`${s.num} block text-5xl font-semibold lg:text-6xl`}>
                {sp.value}
                {sp.unit && <span className="ml-2 text-2xl font-medium text-(--b-kraft-ink) lg:text-3xl">{sp.unit}</span>}
              </span>
              <span className="mt-3 block max-w-[34ch] leading-relaxed text-(--b-muted)">{sp.note}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Uses() {
  return (
    <section id="ung-dung" aria-labelledby="b-uses" className="scroll-mt-6 bg-(--b-paper-deep) py-20 md:py-28">
      <div className={wrap}>
        <h2 id="b-uses" className={`${s.display} text-4xl sm:text-5xl`} data-reveal="">
          {c.usesTitle}
        </h2>
        <ul className={`${grid} mt-10 gap-y-14`}>
          {c.uses.map((u, i) => {
            const Art = USE_ART[u.key];
            return (
              <li key={u.key} className="col-span-4" data-reveal={String(i + 1)}>
                <Art className="w-full" />
                <h3 className={`${s.display} mt-6 text-2xl`}>{u.title}</h3>
                <p className="mt-2 max-w-[36ch] leading-relaxed text-(--b-muted)">{u.body}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function Steps() {
  return (
    <section id="quy-trinh" aria-labelledby="b-steps" className={`${wrap} scroll-mt-6 py-20 md:py-28`}>
      <h2 id="b-steps" className={`${s.display} text-4xl sm:text-5xl`} data-reveal="">
        {c.stepsTitle}
      </h2>
      <ol className="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {c.steps.map((st, i) => (
          <li
            key={st.title}
            className="grid grid-cols-[3rem_1fr] gap-x-3 border-t border-(--b-ink) pt-5 sm:block"
            data-reveal={String(i + 1)}
          >
            <span aria-hidden="true" className={`${s.num} block text-5xl leading-none font-light text-(--b-accent) sm:text-6xl`}>
              {i + 1}
            </span>
            <div>
              <h3 className={`${s.display} text-2xl sm:mt-4`}>{st.title}</h3>
              <p className="mt-2 max-w-[32ch] leading-relaxed text-(--b-muted)">{st.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Closing() {
  const t = getDictionary().landing;
  const info = contactInfoFromEnv(process.env);
  const rows: { label: string; value: string; href?: string | null }[] = [];
  if (info.phone) rows.push({ label: t.contactPhone, value: info.phone, href: info.phoneHref });
  if (info.email) rows.push({ label: t.contactEmail, value: info.email, href: `mailto:${info.email}` });
  if (info.address) rows.push({ label: t.contactAddress, value: info.address });
  if (info.hours) rows.push({ label: t.contactHours, value: info.hours });

  return (
    <footer id="lien-he" className="scroll-mt-6 bg-(--b-ink) text-(--b-paper)">
      <div className={`${wrap} py-20 md:py-24`}>
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between" data-reveal="">
          <div>
            <h2 className={`${s.display} text-4xl sm:text-6xl`}>{c.closingTitle}</h2>
            <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-(--b-paper)/75">{c.closingLead}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Link
              href={LINKS.design}
              className={`${s.focusLight} inline-flex min-h-12 items-center rounded-full bg-(--b-paper) px-7 text-[15px] font-semibold text-(--b-ink) transition-colors duration-200 hover:bg-(--b-kraft)`}
            >
              {c.ctaDesign}
            </Link>
            <Link
              href={LINKS.quote}
              className={`${s.focusLight} inline-flex min-h-12 items-center rounded-full border border-(--b-paper)/60 px-7 text-[15px] font-semibold transition-colors duration-200 hover:border-(--b-paper) hover:bg-(--b-paper)/10`}
            >
              {c.ctaQuote}
            </Link>
          </div>
        </div>
        {rows.length > 0 && (
          <div className="mt-16 border-t border-(--b-paper)/25 pt-8" data-reveal="2">
            <h2 className={`${s.display} text-2xl`}>{t.contactTitle}</h2>
            <p className="mt-2 text-(--b-paper)/75">{t.contactSubtitle}</p>
            <dl className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {rows.map((r) => (
                <div key={r.label}>
                  <dt className="text-sm text-(--b-paper)/65">{r.label}</dt>
                  <dd className="mt-1 text-lg font-semibold break-words">
                    {r.href ? (
                      <a href={r.href} className={`${s.focusLight} underline-offset-4 hover:underline`}>
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
      <p className={`${wrap} border-t border-(--b-paper)/15 py-6 text-sm text-(--b-paper)/65`}>{t.footerNote}</p>
    </footer>
  );
}

export function LandingB() {
  return (
    <MotionRoot className={`${s.page} flex min-h-full flex-1 flex-col`}>
      <Header />
      <main className="flex-1">
        <Hero />
        <Seal />
        <Specs />
        <Uses />
        <Steps />
      </main>
      <Closing />
    </MotionRoot>
  );
}
