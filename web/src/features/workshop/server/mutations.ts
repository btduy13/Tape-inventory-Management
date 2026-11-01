// Writes go ONLY through the SECURITY DEFINER RPCs of migration 0021 (role, assignment, due date
// and step rules are enforced in SQL). Never write production_jobs or legacy tables directly.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import type { AdvanceInput, AssignInput, ConvertInput } from "../lib/schemas";

type Db = SupabaseClient<Database>;
type PgError = { code?: string; message?: string } | null;

export type ConvertResult =
  | { ok: true; orderId: string }
  | { ok: false; reason: "forbidden" | "notFound" | "notReady" | "badDueDate" | "badAssignee" | "generic" };

export type MutationResult = { ok: true } | { ok: false; reason: "forbidden" | "notFound" | "invalid" | "generic" };

function invalidReason(error: NonNullable<PgError>): "badDueDate" | "badAssignee" | "notReady" {
  const msg = error.message ?? "";
  if (/due date/i.test(msg)) return "badDueDate";
  if (/workshop user/i.test(msg)) return "badAssignee";
  return "notReady";
}

export async function convertLeadToProduction(db: Db, input: ConvertInput): Promise<ConvertResult> {
  const { data, error } = await db.rpc("convert_lead_to_production", {
    p_lead_id: input.leadId,
    p_due_date: input.dueDate,
    p_note: input.note,
    p_workshop_user_id: input.workshopUserId,
  });
  if (error) {
    if (error.code === "42501") return { ok: false, reason: "forbidden" };
    if (error.code === "P0002") return { ok: false, reason: "notFound" };
    if (error.code === "22023") return { ok: false, reason: invalidReason(error) };
    return { ok: false, reason: "generic" };
  }
  return typeof data === "string" && data ? { ok: true, orderId: data } : { ok: false, reason: "generic" };
}

function mapError(error: PgError): MutationResult {
  if (!error) return { ok: true };
  if (error.code === "42501") return { ok: false, reason: "forbidden" };
  if (error.code === "P0002") return { ok: false, reason: "notFound" };
  if (error.code === "22023") return { ok: false, reason: "invalid" };
  return { ok: false, reason: "generic" };
}

export async function advanceStep(db: Db, input: AdvanceInput): Promise<MutationResult> {
  const { error } = await db.rpc("advance_production_step", {
    p_job_id: input.jobId,
    p_to: input.to,
    p_note: input.note,
  });
  return mapError(error);
}

export async function assignWorkshop(db: Db, input: AssignInput): Promise<MutationResult> {
  const { error } = await db.rpc("assign_production_job", { p_lead_id: input.leadId, p_user_id: input.userId });
  return mapError(error);
}
