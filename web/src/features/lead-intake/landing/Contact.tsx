// Contact section (anchor #lien-he). Server Component.
import Link from "next/link";
import { getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import { contactInfoFromEnv, hasContactInfo } from "./contact-info";

export function Contact() {
  const t = getDictionary().landing;
  const info = contactInfoFromEnv(process.env);
  const rows: { label: string; value: string; href?: string | null }[] = [];
  if (info.phone) rows.push({ label: t.contactPhone, value: info.phone, href: info.phoneHref });
  if (info.email) rows.push({ label: t.contactEmail, value: info.email, href: `mailto:${info.email}` });
  if (info.address) rows.push({ label: t.contactAddress, value: info.address });
  if (info.hours) rows.push({ label: t.contactHours, value: info.hours });

  return (
    <section id="lien-he" className="border-t border-stone-200 bg-stone-50">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-stone-900">{t.contactTitle}</h2>
          <p className="mt-2 text-stone-600">{t.contactSubtitle}</p>
          <Link
            href={ROUTES.design}
            className="mt-6 inline-block rounded-lg bg-amber-700 px-6 py-3 font-semibold text-white hover:bg-amber-800"
          >
            {t.ctaDesign}
          </Link>
        </div>
        {hasContactInfo(info) && (
          <dl className="grid gap-4">
            {rows.map((r) => (
              <div key={r.label}>
                <dt className="text-sm text-stone-500">{r.label}</dt>
                <dd className="font-medium text-stone-900">
                  {r.href ? (
                    <a href={r.href} className="hover:text-amber-800 hover:underline">
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
    </section>
  );
}
