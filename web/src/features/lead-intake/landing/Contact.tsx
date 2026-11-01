// Contact section (anchor #lien-he) and page footer. Server Component.
// Channels only (phone, Zalo, email, address, hours from CONTACT_* env): the CTA pair already
// sits in the red band right above, so no buttons here. No env -> the online quote form is the channel.
import { getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import { contactInfoFromEnv, hasContactInfo } from "./contact-info";
import { LP_CONTAINER, RING_ON_DARK } from "./ui";

type Row = { label: string; value: string; href?: string | null; external?: boolean };

export function Contact() {
  const t = getDictionary().landing;
  const info = contactInfoFromEnv(process.env);
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
    <footer id="lien-he" className="bg-vt-blue text-white">
      <div className={`${LP_CONTAINER} grid gap-10 py-20 md:grid-cols-2 md:items-end md:py-28`}>
        <div>
          <h2 className="lp-display text-4xl sm:text-5xl">{t.contactTitle}</h2>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-white/80">{hasDirect ? t.contactSubtitle : t.contactSubtitleNoInfo}</p>
        </div>
        <dl className={`grid content-start gap-5 ${rows.length > 1 ? "sm:grid-cols-2" : "max-w-md"}`}>
          {rows.map((r) => (
            <div key={r.label} className="border-t border-white/30 pt-4">
              <dt className="text-sm text-white/70">{r.label}</dt>
              <dd className="mt-1 text-lg font-semibold break-words">
                {r.href ? (
                  <a
                    href={r.href}
                    {...(r.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className={`underline underline-offset-4 decoration-white/40 hover:text-vt-yellow hover:decoration-vt-yellow ${RING_ON_DARK}`}
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
      <div className="border-t border-white/15">
        <div className={`${LP_CONTAINER} flex flex-col gap-5 py-8 sm:flex-row sm:items-center sm:gap-6`}>
          <span className="flex shrink-0 self-start rounded-2xl bg-white p-4 sm:self-auto">
            {/* eslint-disable-next-line @next/next/no-img-element -- next/image adds an inline style (blocked by CSP) */}
            <img src="/brand/vinh-thinh-logo.png" alt={t.logoAlt} width={478} height={632} loading="lazy" className="h-20 w-auto" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="lp-display text-xl">{t.brandName}</p>
            <p className="text-sm text-white/75">{t.footerNote}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
