// Lead pipeline as the UI explains it: who acts at each status and what happens next.
// Display only. Allowed transitions stay in lib/lead-status.ts + SQL (the real checks).
import type { AppRole, LeadStatus, ProductionStep } from "@/lib/types";

/** Who moves a lead out of a status. */
export type Actor = "admin" | "pricing" | "field" | "customer" | "workshop";
export type Phase = "sales" | "deal" | "make" | "closed";

export type PipelineStage = {
  status: LeadStatus;
  phase: Phase;
  /** Who does the next action at this status (null = finished). */
  actor: Actor | null;
  /** Key of the action text in `vi.portalUi` (null = finished). */
  actionKey: ActionKey | null;
};

export type ActionKey =
  | "actNew" | "actAssigned" | "actConsulting" | "actQuoted" | "actAccepted" | "actProduction" | "actShipping";

/** The main road, in order. `cancelled` is a side exit from any open status. */
export const LEAD_PIPELINE: readonly PipelineStage[] = [
  { status: "new", phase: "sales", actor: "admin", actionKey: "actNew" },
  { status: "assigned", phase: "sales", actor: "field", actionKey: "actAssigned" },
  { status: "consulting", phase: "sales", actor: "pricing", actionKey: "actConsulting" },
  { status: "quoted", phase: "deal", actor: "customer", actionKey: "actQuoted" },
  { status: "accepted", phase: "deal", actor: "admin", actionKey: "actAccepted" },
  { status: "production", phase: "make", actor: "workshop", actionKey: "actProduction" },
  { status: "shipping", phase: "make", actor: "workshop", actionKey: "actShipping" },
  { status: "done", phase: "closed", actor: null, actionKey: null },
] as const;

export const PHASE_OF: Readonly<Record<LeadStatus, Phase>> = {
  new: "sales", assigned: "sales", consulting: "sales",
  quoted: "deal", accepted: "deal",
  production: "make", shipping: "make",
  done: "closed", cancelled: "closed",
};

/** Index on the main road; cancelled = -1. */
export function pipelineIndex(status: LeadStatus): number {
  return LEAD_PIPELINE.findIndex((s) => s.status === status);
}

/** Roles that count as each actor. Admin can do everything an internal user can. */
const ACTOR_ROLES: Readonly<Record<Actor, readonly AppRole[]>> = {
  admin: ["admin"],
  pricing: ["admin", "manager"],
  field: ["staff", "ctv", "admin", "manager"],
  customer: [],
  workshop: ["workshop", "admin"],
};

export function actorIncludes(actor: Actor, role: AppRole): boolean {
  return ACTOR_ROLES[actor].includes(role);
}

export type NextAction = { actor: Actor; actionKey: ActionKey; mine: boolean };

/** What happens next for a lead and whether the viewer (by role) is the one to do it. */
export function nextActionFor(status: LeadStatus, role: AppRole): NextAction | null {
  const stage = LEAD_PIPELINE.find((s) => s.status === status);
  if (!stage?.actor || !stage.actionKey) return null;
  return { actor: stage.actor, actionKey: stage.actionKey, mine: actorIncludes(stage.actor, role) };
}

/** Production steps on the main road (huy is a side exit, admin only). 4 steps since 0024. */
export const PRODUCTION_FLOW: readonly ProductionStep[] = [
  "cho_san_xuat", "dang_san_xuat", "san_sang_giao", "da_giao",
] as const;

export function stepIndex(step: ProductionStep): number {
  return PRODUCTION_FLOW.indexOf(step);
}

export type StageState = "done" | "current" | "todo";

/** done / current / todo for every stage of a flow, given the current position (-1 = cancelled). */
export function stageStates(length: number, currentIndex: number, finished = false): StageState[] {
  return Array.from({ length }, (_, i) =>
    currentIndex < 0 ? "todo" : i < currentIndex || (finished && i === currentIndex) ? "done" : i === currentIndex ? "current" : "todo",
  );
}
