"use client";
// Lazy-loads the interactive 3D mockup; the static SVG roll shows until it is ready.
import dynamic from "next/dynamic";
import { RollFallback } from "./art";

const HeroMockup = dynamic(() => import("./HeroMockup"), {
  ssr: false,
  loading: () => <RollFallback />,
});

export function HeroStage() {
  return <HeroMockup />;
}
