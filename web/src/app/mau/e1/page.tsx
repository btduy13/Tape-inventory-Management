// Design variant E of the landing page, hero option "word" (review route).
import type { Metadata } from "next";
import { LandingE } from "@/features/landing-variants/e/LandingE";

export const metadata: Metadata = { title: "Mẫu E: Chữ lớn" };

export default function MauEPage() {
  return <LandingE hero="word" />;
}
