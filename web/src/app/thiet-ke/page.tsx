// Tape designer page. Thin: designer (2D) + mockup3d (3D) + lead-intake quote form, all inside
// one DesignProvider so the form submits the live design (useDesignExport()).
import type { Metadata } from "next";
import { headers } from "next/headers";
import { getDictionary } from "@/i18n";
import { DesignMockupBridge, DesignProvider, DesignerPanel } from "@/features/designer";
import { getActivePresets } from "@/features/designer/server";
import { DesignLeadForm } from "@/features/lead-intake";

export const metadata: Metadata = { title: getDictionary().designer.title };

// Cloudflare's always-pass test key is the fallback for local dev only.
const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";

export default async function DesignPage() {
  const [presets, h] = await Promise.all([getActivePresets(), headers()]);
  const nonce = h.get("x-nonce") ?? undefined;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || TURNSTILE_TEST_SITE_KEY;
  return (
    <main className="mx-auto flex w-full max-w-6xl min-w-0 flex-1 flex-col gap-10 px-4 pt-10 pb-24 lg:pb-10">
      <DesignProvider presets={presets}>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <DesignerPanel />
          <div id="xem-3d" className="min-w-0 scroll-mt-4">
            <DesignMockupBridge />
          </div>
        </div>
        <section id="yeu-cau-bao-gia" className="scroll-mt-4 mx-auto w-full max-w-2xl rounded-lg border border-neutral-200 p-6">
          <DesignLeadForm turnstileSiteKey={siteKey} nonce={nonce} />
        </section>
      </DesignProvider>
    </main>
  );
}
