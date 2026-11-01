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
    <footer id="lien-he" className="scroll-mt-20 bg-vt-navy-deep text-white">
      <div className={`${LP_CONTAINER} grid gap-10 py-16 md:grid-cols-2 md:py-20`}>
        <div>
          <h2 className="lp-display text-4xl sm:text-5xl">{t.contactTitle}</h2>
          <p className="mt-3 max-w-sm text-white/80">{hasDirect ? t.contactSubtitle : t.contactSubtitleNoInfo}</p>
        </div>
        <dl className={`grid content-start gap-5 ${rows.length > 1 ? "sm:grid-cols-2" : "max-w-md"}`}>
          {rows.map((r) => (
            <div key={r.label} className="border-t border-white/25 pt-3">
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
        <div className={`${LP_CONTAINER} flex items-center gap-4 py-6`}>
          <span className="flex shrink-0 items-center justify-center rounded-lg bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- next/image adds an inline style (blocked by CSP) */}
            <img src="/brand/vinh-thinh-logo.png" alt="" width={478} height={632} loading="lazy" className="h-14 w-auto" />
          </span>
          <p className="text-sm text-white/70">{t.footerCopy}</p>
        </div>
      </div>
    </footer>
  );
}
