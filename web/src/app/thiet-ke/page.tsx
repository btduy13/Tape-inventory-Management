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

export const metadata: Metadata = { title: getDictionary().designer.title };

// Cloudflare's always-pass test key is the fallback for local dev only.
const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";

export default async function DesignPage() {
  const t = getDictionary();
  // Widths + length range from the DB (0022); getTapeSpec() falls back to the seed list on error.
  const [spec, h] = await Promise.all([getTapeSpec(), headers()]);
  const nonce = h.get("x-nonce") ?? undefined;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || TURNSTILE_TEST_SITE_KEY;
  return (
    <div className="flex min-h-full flex-1 flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link
            href="/"
            className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            {t.designer.backHome}
          </Link>
          <span className="h-5 w-px bg-slate-200" aria-hidden="true" />
          <span className="truncate text-sm font-semibold text-slate-900">{t.common.appName}</span>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-7xl min-w-0 flex-1 flex-col gap-5 px-4 pt-5 sm:px-6 sm:pt-8 lg:pb-12">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{t.designer.title}</h1>
          <p className="text-sm text-slate-600 sm:text-base">{t.designer.pageSubtitle}</p>
        </div>
        <DesignProvider spec={spec}>
          <DesignerPanel quote={<DesignLeadForm turnstileSiteKey={siteKey} nonce={nonce} hideHeading />} />
        </DesignProvider>
      </main>
    </div>
  );
}
