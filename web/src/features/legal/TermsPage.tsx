// Terms of use page body (/dieu-khoan). Server Component: copy from terms-content.ts, contact from
// businessContact() so the email / phone match the landing footer.
import { businessContact } from "@/features/lead-intake/landing/contact-info";
import { PublicHeader } from "@/features/lead-intake/landing/PublicHeader";
import { LP_CONTAINER } from "@/features/lead-intake/landing/ui";
import { TERMS_CONTACT_INTRO, TERMS_CONTACT_TITLE, TERMS_INTRO, TERMS_SECTIONS, TERMS_TITLE, TERMS_UPDATED } from "./terms-content";

const LINK = "font-medium text-vt-navy underline underline-offset-2 hover:text-vt-red-deep";

export function TermsPage() {
  const c = businessContact();
  return (
    <div className="flex min-h-full flex-1 flex-col bg-vt-paper text-slate-900">
      <PublicHeader />
      <main className={`${LP_CONTAINER} flex-1 py-8 sm:py-12`}>
        <article className="mx-auto flex max-w-3xl flex-col gap-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-10">
          <header className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-vt-ink sm:text-3xl">{TERMS_TITLE}</h1>
            <p className="text-sm text-slate-500">Cập nhật lần cuối: {TERMS_UPDATED}</p>
            <p className="leading-7 text-slate-700">{TERMS_INTRO}</p>
          </header>
          {TERMS_SECTIONS.map((s) => (
            <section key={s.title} className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold text-vt-ink">{s.title}</h2>
              {s.paragraphs.map((p) => (
                <p key={p} className="leading-7 text-slate-700">{p}</p>
              ))}
            </section>
          ))}
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-vt-ink">{TERMS_CONTACT_TITLE}</h2>
            <p className="leading-7 text-slate-700">{TERMS_CONTACT_INTRO}</p>
            <ul className="flex flex-col gap-1 leading-7 text-slate-700">
              {c.email && (
                <li>Email: <a href={`mailto:${c.email}`} className={LINK}>{c.email}</a></li>
              )}
              {c.phone && c.phoneHref && (
                <li>Điện thoại: <a href={c.phoneHref} className={LINK}>{c.phone}</a></li>
              )}
              {c.zaloHref && (
                <li>Zalo: <a href={c.zaloHref} target="_blank" rel="noopener noreferrer" className={LINK}>{c.phone}</a></li>
              )}
            </ul>
          </section>
        </article>
      </main>
    </div>
  );
}
