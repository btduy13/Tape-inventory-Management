"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertRole, ForbiddenError } from "@/lib/auth/require-role";
import { ROLE_GROUPS } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import { ordersCopy as c } from "../lib/copy";
import { orderFormSchema, toOrderPayload } from "../lib/schemas";
import { createOrder } from "./mutations";

export type OrderActionState = { status: "idle" | "error"; message?: string; fields?: string[] };

async function isAdmin(): Promise<boolean> {
  try {
    await assertRole(ROLE_GROUPS.admin);
    return true;
  } catch (e) {
    if (e instanceof ForbiddenError) return false;
    throw e;
  }
}

function formStrings(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of form.entries()) if (typeof value === "string" && !(key in out)) out[key] = value;
  return out;
}

/** Admin check + zod + RPC; on success opens the new order's detail page. */
export async function createOrderAction(_prev: OrderActionState, form: FormData): Promise<OrderActionState> {
  if (!(await isAdmin())) return { status: "error", message: c.errorForbidden };
  const parsed = orderFormSchema.safeParse(formStrings(form));
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((i) => String(i.path[0])))];
    const axis = parsed.error.issues.some((i) => i.message === "axis");
    return { status: "error", message: axis ? c.errorAxis : c.errorValidation, fields };
  }
  const result = await createOrder(await createClient(), toOrderPayload(parsed.data));
  if (!result.ok) {
    const message = result.reason === "forbidden" ? c.errorForbidden : result.reason === "invalid" ? c.errorValidation : c.errorGeneric;
    return { status: "error", message };
  }
  revalidatePath(ROUTES.adminOrders);
  revalidatePath(ROUTES.workshop);
  redirect(ROUTES.adminOrder(result.orderId));
}
