// Status change + notes as the logged-in user. RLS + DB guard triggers are the real
// enforcement; the role pre-check only gives a clean error message.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Profile } from "@/lib/types";
import { transitionAllowed } from "@/lib/lead-status";
import { classifyDbError, type DbErrorKind } from "../lib/action-state";
import type { AddNoteInput, ChangeStatusInput } from "../lib/schemas";

type Db = SupabaseClient<Database>;
type Actor = Pick<Profile, "id" | "role">;

export type MutationResult = { ok: true } | { ok: false; reason: DbErrorKind | "transition" };

export async function changeLeadStatus(db: Db, actor: Actor, input: ChangeStatusInput): Promise<MutationResult> {
  const { data: current, error: readError } = await db
    .from("leads")
    .select("id, status")
    .eq("id", input.leadId)
    .maybeSingle();
  if (readError) return { ok: false, reason: classifyDbError(readError) };
  if (!current) return { ok: false, reason: "notFound" };
  if (current.status === input.to || !transitionAllowed(actor.role, current.status, input.to)) {
    return { ok: false, reason: "transition" };
  }
  const { error } = await db.rpc("change_lead_status", {
    p_lead_id: input.leadId,
    p_to: input.to,
    p_note: input.note,
  });
  return error ? { ok: false, reason: classifyDbError(error) } : { ok: true };
}

export async function addLeadNote(db: Db, actor: Actor, input: AddNoteInput): Promise<MutationResult> {
  const { error } = await db
    .from("lead_notes")
    .insert({ lead_id: input.leadId, body: input.body, author_id: actor.id });
  return error ? { ok: false, reason: classifyDbError(error) } : { ok: true };
}
