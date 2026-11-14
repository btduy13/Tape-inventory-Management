// Design variant "parcel wall" of the landing page: light studio, the word BĂNG KEO in 3D (review route).
import type { Metadata } from "next";
import { LandingParcelWall } from "@/features/landing-variants/parcel-wall/LandingParcelWall";

export const metadata: Metadata = { title: "Mẫu Chữ 3D" };

export default function MauParcelWallPage() {
  return <LandingParcelWall />;
}
