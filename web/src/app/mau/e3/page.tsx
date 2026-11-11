// Design variant E of the landing page, hero option "strips" (review route).
import type { Metadata } from "next";
import { LandingE } from "@/features/landing-variants/e/LandingE";

export const metadata: Metadata = { title: "Mẫu E: Ba dải băng keo" };

export default function MauEPage() {
  return <LandingE hero="strips" />;
}
