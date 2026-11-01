// Design variant A of the landing page (review route).
import type { Metadata } from "next";
import { LandingA } from "@/features/landing-variants/a";

export const metadata: Metadata = { title: "Mẫu A" };

export default function MauAPage() {
  return <LandingA />;
}
