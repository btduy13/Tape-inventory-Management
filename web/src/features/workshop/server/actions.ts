"use server";
// Server Actions of the workshop feature. Role gate here, real enforcement in SQL (0021 / 0024).
import "server-only";
import { revalidatePath } from "next/cache";
import { format, getDictionary } from "@/i18n";
import { assertRole, ForbiddenError } from "@/lib/auth/require-role";
import { ROLE_GROUPS } from "@/lib/auth/roles";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import type { AppRole, Profile } from "@/lib/types";
import { wsCopy } from "../lib/copy";
import { deliveryConfirmUrl, toPrintableNote, type PrintableNote } from "../lib/delivery";
import {
  advanceSchema, assignJobSchema, assignSchema, convertSchema, deliveryNoteSchema, fail, formToObject, ok, tableStepSchema,
  type WorkshopActionState,
} from "../lib/schemas";
import { advanceStep, assignJob, assignWorkshop, convertLeadToProduction, createDeliveryNote, setTableSteps, type MutationResult } from "./mutations";
import { qrSvg } from "./qr";

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

export async function setTableStepsAction(input: unknown): Promise<WorkshopActionState> {
  if (!(await actorOrNull(ROLE_GROUPS.admin))) return fail(t.common.errorForbidden);
  const parsed = tableStepSchema.safeParse(input);
  if (!parsed.success) return fail(t.common.errorValidation);

  const result = await setTableSteps(await createClient(), parsed.data);
  if (!result.ok) {
    if (result.reason !== "stale") return fail(mutationMessage(result));
    revalidatePath(ROUTES.workshop);
    return fail("Công đoạn đã thay đổi. Kiểm tra danh sách rồi thử lại.");
  }
  refresh();
  revalidatePath(`${ROUTES.workshop}/[id]`, "layout");
  revalidatePath(ROUTES.adminOrders, "layout");
  revalidatePath(ROUTES.admin);
  return ok(`Đã cập nhật ${result.count} đơn.`);
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

/** Job detail page (admin): assign by job id, lead-less jobs included. */
export async function assignJobAction(_prev: WorkshopActionState, form: FormData): Promise<WorkshopActionState> {
  if (!(await actorOrNull(ROLE_GROUPS.admin))) return fail(t.common.errorForbidden);
  const parsed = assignJobSchema.safeParse(formToObject(form));
  if (!parsed.success) return fail(t.common.errorValidation);
  const result = await assignJob(await createClient(), parsed.data);
  if (!result.ok) return fail(result.reason === "invalid" ? t.workshop.badAssignee : mutationMessage(result));
  refresh(undefined, parsed.data.jobId);
  return ok(t.workshop.assigned);
}

export type DeliveryNoteState = WorkshopActionState & { note?: PrintableNote; qr?: string };

/**
 * Creates the delivery note and returns it with its QR (SVG markup rendered here, on the server).
 * The raw token lives only inside the QR of this one response: it is never stored, logged or
 * sent back as text. Workshop users get recipient name / phone / address of their own job only.
 */
export async function createDeliveryNoteAction(_prev: DeliveryNoteState, form: FormData): Promise<DeliveryNoteState> {
  const actor = await actorOrNull(ROLE_GROUPS.production);
  if (!actor) return fail(t.common.errorForbidden);
  const parsed = deliveryNoteSchema.safeParse(formToObject(form));
  if (!parsed.success) return fail(t.common.errorValidation);
  const result = await createDeliveryNote(await createClient(), parsed.data.jobId);
  if (!result.ok) {
    return fail({
      forbidden: actor.role === "admin" ? t.common.errorForbidden : t.workshop.notAssignedToYou,
      notFound: t.workshop.jobNotFound,
      notReady: wsCopy.noteNotReady,
      generic: t.common.errorGeneric,
    }[result.reason]);
  }
  const qr = await qrSvg(deliveryConfirmUrl(publicEnv().NEXT_PUBLIC_SITE_URL, result.note.token));
  refresh(undefined, parsed.data.jobId);
  return { ...ok(wsCopy.noteCreated), note: toPrintableNote(result.note, actor.role, wsCopy.noteTitle), qr };
}
