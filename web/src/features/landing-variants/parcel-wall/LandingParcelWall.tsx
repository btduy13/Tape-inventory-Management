// Landing variant "parcel wall" (review route /mau/parcel-wall): the light studio shell of variant F
// with new content. Hero: the word BĂNG KEO as 3D letters with printed tapes weaving through it and
// sealed things (cartons, foam boxes, mailers, bags, cups) of several sample shops around it. Then a
// plain vs printed compare slider, the tape types on three different things, a pick-a-use 3D stage,
// and one looping motion graphic per process step. No tape-roll scenes, no tape-width numbers.
// Server Component: loads the active presets and the contact channels, the rest is ParcelPage.
import { Be_Vietnam_Pro } from "next/font/google";
import { businessContact } from "@/features/lead-intake/landing/contact-info";
import { LandingMotion } from "@/features/lead-intake/landing/LandingMotion";
import { listActivePresets } from "@/features/lead-intake/server/presets";
import { ParcelPage } from "./ParcelPage";
import "../f/f.css";
import "./parcel-wall.css";

// Self-hosted by Next at build time (served from /_next, so the font-src 'self' CSP holds).
const beVietnam = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-vf",
});

const ROOT_ID = "trang-chu-parcel-wall";

export async function LandingParcelWall() {
  const presets = await listActivePresets();
  return (
    <>
      <main id={ROOT_ID} className={`${beVietnam.variable} vf-root lp-root flex flex-1 flex-col`}>
        <ParcelPage presets={presets} contact={businessContact()} />
      </main>
      <LandingMotion rootId={ROOT_ID} />
    </>
  );
}
