// Direct quote channels shown above the online form (designer step 4): email, Zalo, phone call.
// Server-safe: plain links, no hooks. Channels with no valid link are left out.
import { getDictionary } from "@/i18n";

export type QuoteChannelsContact = {
  phone: string | null;
  phoneHref: string | null;
  zaloHref: string | null;
  email: string | null;
};

const TILE =
  "flex min-h-12 min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 transition-colors duration-150 hover:border-vt-navy hover:bg-vt-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vt-navy motion-reduce:transition-none";

export function QuoteChannels({ contact }: { contact: QuoteChannelsContact }) {
  const t = getDictionary().leadIntake;
  const subject = encodeURIComponent(t.channelEmailSubject);
  const items = [
    contact.email && { label: t.channelEmail, value: contact.email, href: `mailto:${contact.email}?subject=${subject}` },
    contact.zaloHref && contact.phone && { label: t.channelZalo, value: contact.phone, href: contact.zaloHref, external: true },
    contact.phoneHref && contact.phone && { label: t.channelCall, value: contact.phone, href: contact.phoneHref },
  ].filter((i): i is { label: string; value: string; href: string; external?: boolean } => Boolean(i));
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="quote-channels-title" className="flex flex-col gap-3">
      <h3 id="quote-channels-title" className="text-sm font-semibold text-slate-900">{t.channelsTitle}</h3>
      <ul className="grid gap-2">
        {items.map((i) => (
          <li key={i.label} className="min-w-0">
            <a href={i.href} {...(i.external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={TILE}>
              <span className="shrink-0 text-sm font-semibold text-vt-navy">{i.label}</span>
              <span className="min-w-0 truncate text-sm text-slate-600">{i.value}</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="flex items-center gap-3 text-xs text-slate-500 before:h-px before:flex-1 before:bg-slate-200 after:h-px after:flex-1 after:bg-slate-200">
        {t.channelsOr}
      </p>
    </section>
  );
}
