// Production step workflow. MUST mirror public.production_step_next() and the rules in
// advance_production_step() (migration 0021): workshop = own job, next step only;
// admin = any step including `huy`.
import type { AppRole, ProductionStep } from "@/lib/types";

/** Normal flow (without `huy`), in order. */
export const FLOW_STEPS: readonly ProductionStep[] = [
  "cho_san_xuat", "dang_in", "dang_cat_cuon", "dong_goi", "san_sang_giao", "da_giao",
] as const;

/** Board columns: every step, cancelled last. */
export const BOARD_STEPS: readonly ProductionStep[] = [...FLOW_STEPS, "huy"] as const;

export function nextStep(step: ProductionStep): ProductionStep | null {
  const i = FLOW_STEPS.indexOf(step);
  return i >= 0 && i < FLOW_STEPS.length - 1 ? FLOW_STEPS[i + 1]! : null;
}

export function isClosedStep(step: ProductionStep): boolean {
  return step === "da_giao" || step === "huy";
}

/** Steps the UI offers. The SQL function is the real check. */
export function stepOptionsFor(role: AppRole, step: ProductionStep): ProductionStep[] {
  if (role === "admin") return BOARD_STEPS.filter((s) => s !== step);
  if (role !== "workshop") return [];
  const next = nextStep(step);
  return next ? [next] : [];
}

export function canMoveTo(role: AppRole, from: ProductionStep, to: ProductionStep): boolean {
  return stepOptionsFor(role, from).includes(to);
}
