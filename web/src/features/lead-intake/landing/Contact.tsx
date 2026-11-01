// Contact section (anchor #lien-he) and page footer. Server Component.
import Link from "next/link";
import { getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import { contactInfoFromEnv, hasContactInfo } from "./contact-info";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white";

export function Contact() {
  const t = getDictionary().landing;
  const info = contactInfoFromEnv(process.env);
  const rows: { label: string; value: string; href?: string | null }[] = [];
  if (info.phone) rows.push({ label: t.contactPhone, value: info.phone, href: info.phoneHref });
  if (info.email) rows.push({ label: t.contactEmail, value: info.email, href: `mailto:${info.email}` });
  if (info.address) rows.push({ label: t.contactAddress, value: info.address });
  if (info.hours) rows.push({ label: t.contactHours, value: info.hours });

  return (
    <footer id="lien-he" className="scroll-mt-4 bg-lp-navy text-white">
      <div className="mx-auto grid max-w-[1600px] gap-10 px-4 py-20 sm:px-8 md:grid-cols-2">
        <div>
          <h2 className="lp-display text-4xl sm:text-5xl">{t.contactTitle}</h2>
          <p className="mt-3 max-w-sm text-white/80">{t.contactSubtitle}</p>
          <Link
            href={ROUTES.design}
            className={`lp-display mt-8 inline-block rounded-full bg-lp-tape px-7 py-3.5 text-lp-ink transition-transform hover:-translate-y-0.5 ${focusRing}`}
          >
            {t.ctaDesign}
          </Link>
        </div>
        {hasContactInfo(info) && (
          <dl className="grid content-start gap-5 sm:grid-cols-2">
            {rows.map((r) => (
              <div key={r.label} className="border-t border-white/25 pt-3">
                <dt className="text-sm text-white/65">{r.label}</dt>
                <dd className="mt-1 text-lg font-semibold">
                  {r.href ? (
                    <a href={r.href} className={`underline-offset-4 hover:text-lp-tape hover:underline ${focusRing}`}>
                      {r.value}
                    </a>
                  ) : (
                    r.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      <p className="mx-auto max-w-[1600px] border-t border-white/15 px-4 py-6 text-sm text-white/65 sm:px-8">{t.footerNote}</p>
    </footer>
  );
}
