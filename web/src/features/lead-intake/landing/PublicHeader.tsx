// Header for the public sub-pages (/thiet-ke, /dieu-khoan): logo lockup (same as the landing Hero, so
// the logo does not shift between pages) and a "back home" link. Server Component.
import Link from "next/link";
import { getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import { LP_CONTAINER } from "./ui";

export function PublicHeader() {
  const t = getDictionary();
  const lp = t.landing;
  return (
    <header className="border-b border-vt-ink/10 bg-white">
      <div className={`${LP_CONTAINER} flex h-16 items-center justify-between gap-3 md:h-20`}>
        <Link
          href={ROUTES.home}
          className="flex min-w-0 items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vt-navy"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- next/image adds an inline style (blocked by CSP) */}
          <img src="/brand/vinh-thinh-logo.png" alt={lp.logoAlt} width={478} height={632} className="h-12 w-auto md:h-16" />
          <span className="truncate border-l border-vt-ink/15 pl-3 text-[11px] leading-tight font-bold tracking-wide text-vt-navy uppercase md:text-xs">
            {lp.brand}
          </span>
        </Link>
        <Link
          href={ROUTES.home}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-vt-ink/80 hover:bg-vt-paper hover:text-vt-red-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vt-navy"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {t.designer.backHome}
        </Link>
      </div>
    </header>
  );
}
