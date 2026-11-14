// Tape designer page. Thin: designer configurator (2D + 3D + steps) with the lead-intake quote form
// slotted into its last step, all inside one DesignProvider so the form submits the live design
// (useDesignExport()). Step 4 opens with the direct channels (email, Zalo, call) above the form.
import type { Metadata } from "next";
import { headers } from "next/headers";
import { getDictionary } from "@/i18n";
import { DesignProvider, DesignerPanel } from "@/features/designer";
import { getTapeSpec } from "@/features/designer/server";
import { DesignLeadForm, QuoteChannels } from "@/features/lead-intake";
import { businessContact } from "@/features/lead-intake/landing/contact-info";
import { PublicHeader } from "@/features/lead-intake/landing/PublicHeader";
import { LP_CONTAINER } from "@/features/lead-intake/landing/ui";
import { designerFontClasses, designerFontFamilies } from "./fonts";

export const metadata: Metadata = {
  title: getDictionary().designer.title,
  alternates: { canonical: "/thiet-ke" },
};

// Cloudflare's always-pass test key is the fallback for local dev only.
const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";

export default async function DesignPage() {
  const t = getDictionary();
  // Widths + length range from the DB (0022); getTapeSpec() falls back to the seed list on error.
  const [spec, h] = await Promise.all([getTapeSpec(), headers()]);
  const nonce = h.get("x-nonce") ?? undefined;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || TURNSTILE_TEST_SITE_KEY;
  // Over-3-ink dialog, step 4 channels and the "message a designer" Zalo link: CONTACT_* env,
  // defaults from DEFAULT_CONTACT.
  const contact = businessContact();
  return (
    <div className={`flex min-h-full flex-1 flex-col bg-vt-paper text-slate-900 ${designerFontClasses}`}>
      <PublicHeader />
      <main className={`${LP_CONTAINER} flex min-w-0 flex-1 flex-col gap-5 pt-5 sm:pt-8 lg:pb-12`}>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-vt-ink sm:text-3xl">{t.designer.title}</h1>
            <p className="text-sm text-slate-600 sm:text-base">{t.designer.pageSubtitle}</p>
          </div>
          {contact.zaloHref && (
            <a
              href={contact.zaloHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border-2 border-vt-navy bg-white px-4 text-sm font-semibold text-vt-navy transition-colors duration-150 hover:bg-vt-navy hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vt-navy motion-reduce:transition-none"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
              </svg>
              {t.designer.messageDesigner}
            </a>
          )}
        </div>
        <DesignProvider spec={spec} fonts={designerFontFamilies}>
          <DesignerPanel
            contact={{ phone: contact.phone, phoneHref: contact.phoneHref }}
            quote={
              <div className="flex flex-col gap-5">
                <QuoteChannels contact={contact} />
                <DesignLeadForm turnstileSiteKey={siteKey} nonce={nonce} hideHeading />
              </div>
            }
          />
        </DesignProvider>
      </main>
    </div>
  );
}
