// Design variant F of the landing page: light studio, real 3D (review route).
import type { Metadata } from "next";
import { LandingF } from "@/features/landing-variants/f/LandingF";

export const metadata: Metadata = { title: "Mẫu F" };

export default function MauFPage() {
  return <LandingF />;
}
