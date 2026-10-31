"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertRole, ForbiddenError } from "@/lib/auth/require-role";
import { ROLE_GROUPS } from "@/lib/auth/roles";
import { ROUTES } from "@/lib/routes";
import { getDictionary } from "@/i18n";
import { addNoteSchema, changeStatusSchema, formToObject } from "../lib/schemas";
import { fail, ok, type OrdersActionState } from "../lib/action-state";
import { addLeadNote, changeLeadStatus, type MutationResult } from "./mutations";

const t = getDictionary();

function messageFor(result: Exclude<MutationResult, { ok: true }>): string {
  switch (result.reason) {
    case "forbidden":
      return t.common.errorForbidden;
    case "notFound":
      return t.orders.notFound;
    case "transition":
      return t.orders.transitionNotAllowed;
    case "invalid":
      return t.common.errorValidation;
    default:
      return t.common.errorGeneric;
  }
}

function revalidateLead(leadId: string) {
  revalidatePath(ROUTES.portal);
  revalidatePath(ROUTES.portalLead(leadId));
  revalidatePath(ROUTES.adminLead(leadId));
}

async function actor() {
  try {
    return await assertRole(ROLE_GROUPS.internal);
  } catch (e) {
    if (e instanceof ForbiddenError) return null;
    throw e;
  }
}

export async function changeStatusAction(_prev: OrdersActionState, form: FormData): Promise<OrdersActionState> {
  const profile = await actor();
  if (!profile) return fail(t.common.errorForbidden);
  const parsed = changeStatusSchema.safeParse(formToObject(form));
  if (!parsed.success) return fail(t.common.errorValidation);

  const result = await changeLeadStatus(await createClient(), profile, parsed.data);
  if (!result.ok) return fail(messageFor(result));
  revalidateLead(parsed.data.leadId);
  return ok(t.orders.statusUpdated);
}

export async function addNoteAction(_prev: OrdersActionState, form: FormData): Promise<OrdersActionState> {
  const profile = await actor();
  if (!profile) return fail(t.common.errorForbidden);
  const parsed = addNoteSchema.safeParse(formToObject(form));
  if (!parsed.success) return fail(t.orders.noteInvalid);

  const result = await addLeadNote(await createClient(), profile, parsed.data);
  if (!result.ok) return fail(messageFor(result));
  revalidateLead(parsed.data.leadId);
  return ok(t.orders.noteAdded);
}
