// Landing variant F (review route /mau/f): "light studio". A neutral studio backdrop, the real 3D
// tape roll / carton / cup as the imagery, one typeface (Be Vietnam Pro), ink buttons. No brand
// colour fields: only the logo and the product carry colour.
// Server Component: loads the active presets and the contact channels, the rest is StudioPage.
import { Be_Vietnam_Pro } from "next/font/google";
import { businessContact } from "@/features/lead-intake/landing/contact-info";
import { LandingMotion } from "@/features/lead-intake/landing/LandingMotion";
import { listActivePresets } from "@/features/lead-intake/server/presets";
import { StudioPage } from "./StudioPage";
import "./f.css";

// Self-hosted by Next at build time (served from /_next, so the font-src 'self' CSP holds).
const beVietnam = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-vf",
});

const ROOT_ID = "trang-chu-f";

export async function LandingF() {
  const presets = await listActivePresets();
  return (
    <>
      <main id={ROOT_ID} className={`${beVietnam.variable} vf-root lp-root flex flex-1 flex-col`}>
        <StudioPage presets={presets} contact={businessContact()} />
      </main>
      <LandingMotion rootId={ROOT_ID} />
    </>
  );
}
