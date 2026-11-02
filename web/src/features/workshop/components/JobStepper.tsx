// Production stepper for workshop pages. The kit strip (<ol overflow-x-auto>) holds absolutely
// positioned `sr-only` spans; without a positioned scroller they escape its clip and widen the
// page on phones (QC UI-1). `relative` on every scroller below keeps them inside.
// TODO(portal-ui): drop this wrapper once the kit's Strip <ol> is `relative` itself.
import { ProductionStepper } from "@/features/portal-ui";
import type { ProductionStep } from "@/lib/types";

export const CONTAIN_SCROLLERS = "[&_.overflow-x-auto]:relative";

export function JobStepper({ step }: { step: ProductionStep }) {
  return (
    <div className={CONTAIN_SCROLLERS}>
      <ProductionStepper step={step} />
    </div>
  );
}
