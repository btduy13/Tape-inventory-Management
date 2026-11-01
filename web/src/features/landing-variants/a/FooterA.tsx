// Closing CTA + contact. Contact details come from the same env-driven source as the
// main landing (CONTACT_PHONE / _EMAIL / _ADDRESS / _HOURS); nothing is shown when unset.
import Link from "next/link";
import { getDictionary } from "@/i18n";
import { contactInfoFromEnv, hasContactInfo } from "@/features/lead-intake/landing/contact-info";
import { HREF, copyA as t } from "./copy";
import { btnBase, ringOnDark, wrap } from "./ui";

export function FooterA() {
  const l = getDictionary().landing;
  const info = contactInfoFromEnv(process.env);
  const rows: { label: string; value: string; href?: string | null }[] = [];
  if (info.phone) rows.push({ label: l.contactPhone, value: info.phone, href: info.phoneHref });
  if (info.email) rows.push({ label: l.contactEmail, value: info.email, href: `mailto:${info.email}` });
  if (info.address) rows.push({ label: l.contactAddress, value: info.address });
  if (info.hours) rows.push({ label: l.contactHours, value: info.hours });

  return (
    <footer id="lien-he" className="scroll-mt-4 bg-lp-navy text-white">
      <div className={`${wrap} grid gap-10 py-12 md:grid-cols-2 md:py-16`}>
        <div>
          <h2 className="lp-display text-4xl md:text-5xl">{t.footerTitle}</h2>
          <p className="mt-3 max-w-[44ch] text-lg text-white/85">{t.footerLead}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={HREF.design} className={`${btnBase} bg-lp-tape text-lp-navy ${ringOnDark}`}>
              {t.ctaDesign}
            </Link>
            <Link href={HREF.quote} className={`${btnBase} border-2 border-white text-white hover:bg-white hover:text-lp-navy ${ringOnDark}`}>
              {t.ctaQuote}
            </Link>
          </div>
        </div>
        <div>
          <h3 className="lp-display text-2xl">{l.contactTitle}</h3>
          {hasContactInfo(info) ? (
            <dl className="mt-4 grid gap-x-6 sm:grid-cols-2">
              {rows.map((r) => (
                <div key={r.label} className="border-t border-white/25 py-3">
                  <dt className="text-sm text-white/70">{r.label}</dt>
                  <dd className="mt-0.5 text-lg font-semibold break-words">
                    {r.href ? (
                      <a href={r.href} className={`underline-offset-4 hover:text-lp-tape hover:underline ${ringOnDark}`}>
                        {r.value}
                      </a>
                    ) : (
                      r.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-3 max-w-[44ch] text-white/85">
              <Link href={HREF.quote} className={`font-semibold underline underline-offset-4 hover:text-lp-tape ${ringOnDark}`}>
                {t.contactFallback}
              </Link>
            </p>
          )}
        </div>
      </div>
      <div className={`${wrap} border-t border-white/15 py-5 text-sm text-white/70`}>
        <span>{l.footerNote}</span>
      </div>
    </footer>
  );
}
