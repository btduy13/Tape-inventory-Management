// Full landing page composition. Server Component (async: loads active presets).
// LandingMotion is the only client island (scroll reveals, progress line, SMIL pause).
import { listActivePresets } from "../server/presets";
import { Contact } from "./Contact";
import { DesignCta } from "./DesignCta";
import { Hero } from "./Hero";
import { HowItWorks } from "./HowItWorks";
import { LandingMotion } from "./LandingMotion";
import { PresetsShowcase } from "./PresetsShowcase";
import { ProductShowcase } from "./ProductShowcase";
import { UseCases } from "./UseCases";

const ROOT_ID = "trang-chu";

export async function LandingPage() {
  const presets = await listActivePresets();
  return (
    <>
      <main id={ROOT_ID} className="flex flex-1 flex-col overflow-x-clip">
        <Hero />
        <ProductShowcase />
        <PresetsShowcase presets={presets} />
        <UseCases />
        <HowItWorks />
        <DesignCta />
        <Contact />
      </main>
      <LandingMotion rootId={ROOT_ID} />
    </>
  );
}
