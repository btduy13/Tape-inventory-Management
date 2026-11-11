// Design variant D of the landing page (review route).
import type { Metadata } from "next";
import { LandingD } from "@/features/landing-variants/d/LandingD";

export const metadata: Metadata = { title: "Mẫu D" };

export default function MauDPage() {
  return <LandingD />;
}
