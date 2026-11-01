// Tape designer page. Thin: designer configurator (2D + 3D + steps) with the lead-intake quote form
// slotted into its last step, all inside one DesignProvider so the form submits the live design
// (useDesignExport()).
import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { getDictionary } from "@/i18n";
import { DesignProvider, DesignerPanel } from "@/features/designer";
import { getTapeSpec } from "@/features/designer/server";
import { DesignLeadForm } from "@/features/lead-intake";
import { contactInfoFromEnv } from "@/features/lead-intake/landing/contact-info";
// Same container + logo lockup as the landing header (Hero.tsx), so the logo does not shift between pages.
import { LP_CONTAINER } from "@/features/lead-intake/landing/ui";

export const metadata: Metadata = { title: getDictionary().designer.title };

// Cloudflare's always-pass test key is the fallback for local dev only.
const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";

export default async function DesignPage() {
  const t = getDictionary();
  // Widths + length range from the DB (0022); getTapeSpec() falls back to the seed list on error.
  const [spec, h] = await Promise.all([getTapeSpec(), headers()]);
  const nonce = h.get("x-nonce") ?? undefined;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || TURNSTILE_TEST_SITE_KEY;
  // Over-3-ink dialog: call / Zalo the consultant (CONTACT_PHONE); unset -> opens the quote step.
  const { phone, phoneHref } = contactInfoFromEnv(process.env);
  const lp = t.landing;
  return (
    <div className="flex min-h-full flex-1 flex-col bg-vt-paper text-slate-900">
      <header className="border-b border-vt-ink/10 bg-white">
        <div className={`${LP_CONTAINER} flex h-16 items-center justify-between gap-3 md:h-20`}>
          <Link
            href="/"
            className="flex min-w-0 items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vt-navy"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- next/image adds an inline style (blocked by CSP) */}
            <img src="/brand/vinh-thinh-logo.png" alt={lp.logoAlt} width={478} height={632} className="h-12 w-auto md:h-16" />
            <span className="truncate border-l border-vt-ink/15 pl-3 text-[11px] leading-tight font-bold tracking-wide text-vt-navy uppercase md:text-xs">
              {lp.brand}
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-vt-ink/80 hover:bg-vt-paper hover:text-vt-red-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vt-navy"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            {t.designer.backHome}
          </Link>
        </div>
      </header>
      <main className={`${LP_CONTAINER} flex min-w-0 flex-1 flex-col gap-5 pt-5 sm:pt-8 lg:pb-12`}>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-vt-ink sm:text-3xl">{t.designer.title}</h1>
          <p className="text-sm text-slate-600 sm:text-base">{t.designer.pageSubtitle}</p>
        </div>
        <DesignProvider spec={spec}>
          <DesignerPanel contact={{ phone, phoneHref }} quote={<DesignLeadForm turnstileSiteKey={siteKey} nonce={nonce} hideHeading />} />
        </DesignProvider>
      </main>
    </div>
  );
}
