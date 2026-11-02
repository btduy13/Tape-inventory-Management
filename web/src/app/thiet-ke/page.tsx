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

export const metadata: Metadata = { title: getDictionary().designer.title };

// Cloudflare's always-pass test key is the fallback for local dev only.
const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";

export default async function DesignPage() {
  const t = getDictionary();
  // Widths + length range from the DB (0022); getTapeSpec() falls back to the seed list on error.
  const [spec, h] = await Promise.all([getTapeSpec(), headers()]);
  const nonce = h.get("x-nonce") ?? undefined;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || TURNSTILE_TEST_SITE_KEY;
  // Over-3-ink dialog + step 4 channels: CONTACT_* env, defaults from DEFAULT_CONTACT.
  const contact = businessContact();
  return (
    <div className="flex min-h-full flex-1 flex-col bg-vt-paper text-slate-900">
      <PublicHeader />
      <main className={`${LP_CONTAINER} flex min-w-0 flex-1 flex-col gap-5 pt-5 sm:pt-8 lg:pb-12`}>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-vt-ink sm:text-3xl">{t.designer.title}</h1>
          <p className="text-sm text-slate-600 sm:text-base">{t.designer.pageSubtitle}</p>
        </div>
        <DesignProvider spec={spec}>
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
