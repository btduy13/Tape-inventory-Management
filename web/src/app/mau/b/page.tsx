// Landing design variant B (clean editorial / premium minimal). Preview route.
import type { Metadata } from "next";
import { LandingB } from "@/features/landing-variants/b";

export const metadata: Metadata = { title: "Mẫu B" };

export default function MauBPage() {
  return <LandingB />;
}
