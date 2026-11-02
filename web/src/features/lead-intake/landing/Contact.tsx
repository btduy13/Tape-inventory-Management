// Contact section (anchor #lien-he) and page footer. Server Component.
// Second half of the blue closing area: one compact panel (logo card + brand line | contact items
// in a wrapping row). Channels only (phone, Zalo, email, address, hours from CONTACT_* env; phone +
// email fall back to DEFAULT_CONTACT): the CTA pair already sits right above, so no buttons here.
// No phone / email -> the online quote form is the channel. Bottom line: copyright + terms link.
import { getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import Link from "next/link";
import { businessContact, hasContactInfo } from "./contact-info";
import { LP_CONTAINER, RING_ON_DARK } from "./ui";

type Row = { label: string; value: string; href?: string | null; external?: boolean };

export function Contact() {
  const t = getDictionary().landing;
  const info = businessContact();
  const rows: Row[] = [];
  if (info.phone) rows.push({ label: t.contactPhone, value: info.phone, href: info.phoneHref });
  if (info.zaloHref) rows.push({ label: t.contactZalo, value: t.contactZaloValue, href: info.zaloHref, external: true });
  if (info.email) rows.push({ label: t.contactEmail, value: info.email, href: `mailto:${info.email}` });
  if (info.address) rows.push({ label: t.contactAddress, value: info.address });
  if (info.hours) rows.push({ label: t.contactHours, value: info.hours });
  const hasDirect = Boolean(info.phone || info.email);
  if (!hasContactInfo(info) || !hasDirect) {
    rows.push({ label: t.contactForm, value: t.contactFormValue, href: `${ROUTES.design}#yeu-cau-bao-gia` });
  }

  return (
    <footer id="lien-he" className="scroll-mt-20 bg-vt-blue pb-10 text-white md:pb-14">
      <div className={LP_CONTAINER}>
        <div className="grid gap-8 rounded-[2rem] bg-vt-blue-ink/45 p-6 ring-1 ring-white/10 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:items-center lg:gap-12 lg:p-10">
          <div className="flex items-center gap-5">
            <span className="flex shrink-0 rounded-2xl bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- next/image adds an inline style (blocked by CSP) */}
              <img src="/brand/vinh-thinh-logo.png" alt={t.logoAlt} width={478} height={632} loading="lazy" className="h-16 w-auto sm:h-20" />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <p className="lp-display text-2xl">{t.brandName}</p>
              <p className="max-w-xs text-sm leading-relaxed text-white/75">{t.footerNote}</p>
            </div>
          </div>
          <div className="grid gap-6 border-t border-white/15 pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-12">
            <div>
              <h2 className="lp-display text-3xl sm:text-4xl">{t.contactTitle}</h2>
              <p className="mt-2 max-w-xl leading-relaxed text-white/80">{hasDirect ? t.contactSubtitle : t.contactSubtitleNoInfo}</p>
            </div>
            {/* contact items flow in one row and wrap; a single item never leaves an empty column */}
            <dl className="flex flex-wrap gap-x-10 gap-y-5">
              {rows.map((r) => (
                <div key={r.label} className="min-w-0 max-w-full border-l-2 border-vt-yellow pl-4">
                  <dt className="text-sm text-white/70">{r.label}</dt>
                  <dd className="mt-0.5 text-lg font-semibold break-words">
                    {r.href ? (
                      <a
                        href={r.href}
                        {...(r.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        className={`underline decoration-white/40 underline-offset-4 hover:text-vt-yellow hover:decoration-vt-yellow ${RING_ON_DARK}`}
                      >
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
        </div>
        <p className="mt-6 flex flex-wrap justify-between gap-x-6 gap-y-2 px-2 text-sm text-white/70">
          <span>{t.footerCopy}</span>
          <Link href={ROUTES.terms} className={`underline decoration-white/40 underline-offset-4 hover:text-vt-yellow ${RING_ON_DARK}`}>
            {t.termsLink}
          </Link>
        </p>
      </div>
    </footer>
  );
}
