// Landing design variant C (local review route): interactive dark bento.
import type { Metadata } from "next";
import { LandingC } from "@/features/landing-variants/c/LandingC";

export const metadata: Metadata = { title: "Mẫu C" };

export default function VariantCPage() {
  return <LandingC />;
}
