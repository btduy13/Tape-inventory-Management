"use server";
// Server Actions of the workshop feature. Role gate here, real enforcement in SQL (0021).
import "server-only";
import { revalidatePath } from "next/cache";
import { format, getDictionary } from "@/i18n";
import { assertRole, ForbiddenError } from "@/lib/auth/require-role";
import { ROLE_GROUPS } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import type { AppRole, Profile } from "@/lib/types";
import {
  advanceSchema, assignSchema, convertSchema, fail, formToObject, ok, type WorkshopActionState,
} from "../lib/schemas";
import { advanceStep, assignWorkshop, convertLeadToProduction, type MutationResult } from "./mutations";

const t = getDictionary();

async function actorOrNull(roles: readonly AppRole[]): Promise<Profile | null> {
  try {
    return await assertRole(roles);
  } catch (e) {
    if (e instanceof ForbiddenError) return null;
    throw e;
  }
}

function refresh(leadId?: string, jobId?: string) {
  revalidatePath(ROUTES.workshop);
  if (jobId) revalidatePath(ROUTES.workshopJob(jobId));
  if (leadId) {
    revalidatePath(ROUTES.portalLead(leadId));
    revalidatePath(ROUTES.adminLead(leadId));
  }
  revalidatePath(ROUTES.portal);
}

function mutationMessage(result: Exclude<MutationResult, { ok: true }>): string {
  return {
    forbidden: t.common.errorForbidden,
    notFound: t.workshop.jobNotFound,
    invalid: t.workshop.invalidStep,
    generic: t.common.errorGeneric,
  }[result.reason];
}

export async function advanceStepAction(_prev: WorkshopActionState, form: FormData): Promise<WorkshopActionState> {
  if (!(await actorOrNull(ROLE_GROUPS.production))) return fail(t.common.errorForbidden);
  const parsed = advanceSchema.safeParse(formToObject(form));
  if (!parsed.success) return fail(t.common.errorValidation);
  const result = await advanceStep(await createClient(), parsed.data);
  if (!result.ok) return fail(mutationMessage(result));
  refresh(undefined, parsed.data.jobId);
  return ok(format(t.workshop.stepDone, { step: t.productionStep[parsed.data.to] }));
}

export async function convertToProductionAction(_prev: WorkshopActionState, form: FormData): Promise<WorkshopActionState> {
  const actor = await actorOrNull(ROLE_GROUPS.production);
  if (!actor) return fail(t.common.errorForbidden);
  const raw = formToObject(form);
  // Only an admin chooses the workshop user (SQL rejects it from anyone else as well).
  if (actor.role !== "admin") delete raw.workshopUserId;
  const parsed = convertSchema().safeParse(raw);
  if (!parsed.success) {
    const dateIssue = parsed.error.issues.some((i) => i.path[0] === "dueDate");
    return fail(dateIssue ? t.workshop.badDueDate : t.common.errorValidation);
  }
  const result = await convertLeadToProduction(await createClient(), parsed.data);
  if (!result.ok) {
    const message = {
      forbidden: actor.role === "admin" ? t.common.errorForbidden : t.workshop.notAssignedToYou,
      notFound: t.admin.leadNotFound,
      notReady: t.workshop.convertNotReady,
      badDueDate: t.workshop.badDueDate,
      badAssignee: t.workshop.badAssignee,
      generic: t.common.errorGeneric,
    }[result.reason];
    return fail(message);
  }
  refresh(parsed.data.leadId);
  return ok(format(t.workshop.convertDone, { id: result.orderId }));
}

export async function assignWorkshopAction(_prev: WorkshopActionState, form: FormData): Promise<WorkshopActionState> {
  if (!(await actorOrNull(ROLE_GROUPS.admin))) return fail(t.common.errorForbidden);
  const parsed = assignSchema.safeParse(formToObject(form));
  if (!parsed.success) return fail(t.common.errorValidation);
  const result = await assignWorkshop(await createClient(), parsed.data);
  if (!result.ok) {
    return fail(result.reason === "invalid" ? t.workshop.assignNotReady : mutationMessage(result));
  }
  refresh(parsed.data.leadId);
  return ok(t.workshop.assigned);
}
