// Full landing page composition. Server Component (async: loads active presets).
import { listActivePresets } from "../server/presets";
import { Contact } from "./Contact";
import { DesignCta } from "./DesignCta";
import { Hero } from "./Hero";
import { HowItWorks } from "./HowItWorks";
import { PresetsShowcase } from "./PresetsShowcase";

export async function LandingPage() {
  const presets = await listActivePresets();
  return (
    <main className="flex flex-1 flex-col">
      <Hero />
      <PresetsShowcase presets={presets} />
      <DesignCta />
      <HowItWorks />
      <Contact />
    </main>
  );
}
