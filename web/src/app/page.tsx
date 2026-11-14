// Landing page: the "BĂNG KEO in 3D" design (features/landing-variants/parcel-wall).
// The previous landing sections still live in features/lead-intake/landing.
import type { Metadata } from "next";
import { LandingParcelWall } from "@/features/landing-variants/parcel-wall/LandingParcelWall";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function HomePage() {
  return <LandingParcelWall />;
}
