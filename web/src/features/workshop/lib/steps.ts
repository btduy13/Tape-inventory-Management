// Production step workflow. MUST mirror public.production_step_next() and the rules in
// advance_production_step() (migration 0024): workshop = own job, next step only, never back,
// never huy and never da_giao (delivery is confirmed by scanning the delivery note QR);
// admin = any step including `huy` (moving back asks for confirmation in the UI).
import type { AppRole, ProductionStep } from "@/lib/types";

/** Normal flow (without `huy`), in order. 4 steps since 0024. */
export const FLOW_STEPS: readonly ProductionStep[] = [
  "cho_san_xuat", "dang_san_xuat", "san_sang_giao", "da_giao",
] as const;

/** Board columns: every live step, cancelled last. */
export const BOARD_STEPS: readonly ProductionStep[] = [...FLOW_STEPS, "huy"] as const;

/** Old steps (history rows only): they all meant "being made". */
const LEGACY_RANK: Partial<Record<ProductionStep, number>> = { dang_in: 1, dang_cat_cuon: 1, dong_goi: 1 };

/** Position on the flow; huy = -1. */
export function stepRank(step: ProductionStep): number {
  return LEGACY_RANK[step] ?? FLOW_STEPS.indexOf(step);
}

export function nextStep(step: ProductionStep): ProductionStep | null {
  const i = stepRank(step);
  return i >= 0 && i < FLOW_STEPS.length - 1 ? FLOW_STEPS[i + 1]! : null;
}

export function isClosedStep(step: ProductionStep): boolean {
  return step === "da_giao" || step === "huy";
}

/** Admin moving a job back on the flow (huy is a side exit, not "back"). */
export function isBackward(from: ProductionStep, to: ProductionStep): boolean {
  const a = stepRank(from);
  const b = stepRank(to);
  return a >= 0 && b >= 0 && b < a;
}

/** The workshop's last own step: from here the delivery note QR finishes the job. */
export function needsDeliveryNote(step: ProductionStep): boolean {
  return step === "san_sang_giao";
}

/** Steps the UI offers. The SQL function is the real check. */
export function stepOptionsFor(role: AppRole, step: ProductionStep): ProductionStep[] {
  if (role === "admin") return BOARD_STEPS.filter((s) => s !== step);
  if (role !== "workshop") return [];
  const next = nextStep(step);
  return next && next !== "da_giao" ? [next] : [];
}
