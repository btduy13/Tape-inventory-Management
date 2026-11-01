// Landing variant A ("Bold Industrial, tightened"). Server Component, no client JS.
import { FooterA } from "./FooterA";
import { HeroA } from "./HeroA";
import { SpecsA } from "./SpecsA";
import { StepsA } from "./StepsA";
import { UsesA } from "./UsesA";

export function LandingA() {
  return (
    <main className="flex flex-1 flex-col overflow-x-clip">
      <HeroA />
      <SpecsA />
      <UsesA />
      <StepsA />
      <FooterA />
    </main>
  );
}
