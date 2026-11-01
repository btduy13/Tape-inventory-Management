"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import { getDictionary } from "@/i18n";
import { fail, formToObject, ok, type AdminActionState } from "../lib/schemas";
import {
  addWidthSchema, lengthLimitsSchema, moveWidthSchema, toggleWidthSchema, widthIdSchema,
} from "../lib/tape-spec-schemas";
import { adminOrNull } from "./guard";
import { addWidth, deleteWidth, moveWidth, saveLengthLimits, setWidthActive, type SpecResult } from "./tape-specs";

const t = getDictionary();

function failFor(result: Exclude<SpecResult, { ok: true }>): AdminActionState {
  switch (result.reason) {
    case "duplicate":
      return fail(t.tapeSpec.widthDuplicate);
    case "forbidden":
      return fail(t.common.errorForbidden);
    case "invalid":
      return fail(t.common.errorValidation);
    default:
      return fail(t.common.errorGeneric);
  }
}

/** Admin check + zod + RLS client; revalidates the admin page and the public designer. */
async function run<T>(
  form: FormData,
  schema: { safeParse(v: unknown): { success: true; data: T } | { success: false } },
  mutate: (db: Awaited<ReturnType<typeof createClient>>, input: T) => Promise<SpecResult>,
  success: string,
  invalid: string = t.common.errorValidation,
): Promise<AdminActionState> {
  if (!(await adminOrNull())) return fail(t.common.errorForbidden);
  const parsed = schema.safeParse(formToObject(form));
  if (!parsed.success) return fail(invalid);
  const result = await mutate(await createClient(), parsed.data);
  if (!result.ok) return failFor(result);
  revalidatePath(ROUTES.adminTapeSpecs);
  revalidatePath(ROUTES.design);
  return ok(success);
}

export async function addWidthAction(_prev: AdminActionState, form: FormData): Promise<AdminActionState> {
  return run(form, addWidthSchema, addWidth, t.tapeSpec.widthSaved);
}

export async function toggleWidthAction(_prev: AdminActionState, form: FormData): Promise<AdminActionState> {
  return run(form, toggleWidthSchema, setWidthActive, t.tapeSpec.widthSaved);
}

export async function moveWidthAction(_prev: AdminActionState, form: FormData): Promise<AdminActionState> {
  return run(form, moveWidthSchema, moveWidth, t.tapeSpec.widthSaved);
}

export async function deleteWidthAction(_prev: AdminActionState, form: FormData): Promise<AdminActionState> {
  return run(form, widthIdSchema, (db, input) => deleteWidth(db, input.id), t.tapeSpec.widthRemoved);
}

export async function saveLengthLimitsAction(_prev: AdminActionState, form: FormData): Promise<AdminActionState> {
  return run(form, lengthLimitsSchema, saveLengthLimits, t.tapeSpec.lengthSaved, t.tapeSpec.lengthRangeInvalid);
}
