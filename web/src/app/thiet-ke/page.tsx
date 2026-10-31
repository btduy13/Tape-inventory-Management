// Tape designer page. Thin: designer (2D) + mockup3d (3D); lead-intake adds its form inside the provider.
import type { Metadata } from "next";
import { getDictionary } from "@/i18n";
import { DesignMockupBridge, DesignProvider, DesignerPanel } from "@/features/designer";
import { getActivePresets } from "@/features/designer/server";

export const metadata: Metadata = { title: getDictionary().designer.title };

export default async function DesignPage() {
  const presets = await getActivePresets();
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-10">
      <DesignProvider presets={presets}>
        <div className="grid gap-10 lg:grid-cols-2">
          <DesignerPanel />
          <DesignMockupBridge />
        </div>
        {/* lead-intake: <QuoteRequestForm /> goes here (uses useDesignExport()). */}
      </DesignProvider>
    </main>
  );
}
