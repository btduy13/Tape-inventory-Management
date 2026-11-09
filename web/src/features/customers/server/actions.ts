"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { format } from "@/i18n";
import { assertRole, ForbiddenError } from "@/lib/auth/require-role";
import { ROLE_GROUPS } from "@/lib/auth/roles";
import { hasPerm } from "@/lib/auth/permissions";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import { customersCopy as c } from "../lib/copy";
import { customerFormSchema, customerIdSchema, mergeSchema, reviewKeySchema } from "../lib/schemas";
import { createCustomer, mergeCustomers, resolveReview, updateCustomer, type FailReason } from "./mutations";

export type CustomerActionState = { status: "idle" | "ok" | "error"; message?: string };

const ERROR: Record<FailReason, string> = {
  forbidden: c.errorForbidden, invalid: c.errorValidation, not_found: c.errorNotFound, generic: c.errorGeneric,
};
const err = (reason: FailReason): CustomerActionState => ({ status: "error", message: ERROR[reason] });

async function isAdmin(): Promise<boolean> {
  try {
    await assertRole(ROLE_GROUPS.admin);
    return true;
  } catch (e) {
    if (e instanceof ForbiddenError) return false;
    throw e;
  }
}

function str(form: FormData, key: string): string | undefined {
  const v = form.get(key);
  return typeof v === "string" ? v : undefined;
}

/** Create (no id: opens the new customer) or update (id) one customer. */
export async function saveCustomerAction(_prev: CustomerActionState, form: FormData): Promise<CustomerActionState> {
  // Same rule as SQL admin_customer_create / _update (0030); merge and review stay admin-only.
  if (!hasPerm(await getCurrentProfile(), "customers.edit")) return err("forbidden");
  const parsed = customerFormSchema.safeParse({
    name: str(form, "name"), phone: str(form, "phone"), address: str(form, "address"), company: str(form, "company"), note: str(form, "note"),
  });
  if (!parsed.success) return err("invalid");
  const db = await createClient();
  const id = str(form, "id");
  if (!id) {
    const created = await createCustomer(db, parsed.data);
    if (!created.ok) return err(created.reason);
    revalidatePath(ROUTES.adminCustomers);
    redirect(ROUTES.adminCustomer(created.id));
  }
  if (!customerIdSchema.safeParse(id).success) return err("invalid");
  const updated = await updateCustomer(db, id, parsed.data);
  if (!updated.ok) return err(updated.reason);
  revalidatePath(ROUTES.adminCustomers);
  revalidatePath(ROUTES.adminCustomer(id));
  return { status: "ok", message: c.saved };
}

/** Moves the checked customers' orders and leads to `target`, then SQL deletes them. */
export async function mergeCustomersAction(_prev: CustomerActionState, form: FormData): Promise<CustomerActionState> {
  if (!(await isAdmin())) return err("forbidden");
  const sources = [...new Set(form.getAll("source").filter((v): v is string => typeof v === "string"))];
  if (sources.length === 0) return { status: "error", message: c.mergePickOne };
  const parsed = mergeSchema.safeParse({ target: str(form, "target"), sources });
  if (!parsed.success) return err("invalid");
  const r = await mergeCustomers(await createClient(), parsed.data.target, parsed.data.sources);
  if (!r.ok) return err(r.reason);
  revalidatePath(ROUTES.adminCustomers);
  revalidatePath(ROUTES.adminCustomer(parsed.data.target));
  return { status: "ok", message: format(c.merged, { n: r.moved }) };
}

/**
 * One review-queue decision. intent=link uses the picked customer_id, intent=create first makes a
 * customer from the order's name / phone / address, intent=skip leaves the order unlinked.
 */
export async function resolveReviewAction(_prev: CustomerActionState, form: FormData): Promise<CustomerActionState> {
  if (!(await isAdmin())) return err("forbidden");
  const key = reviewKeySchema.safeParse({ source_table: str(form, "source_table"), source_id: str(form, "source_id") });
  if (!key.success) return err("invalid");
  const db = await createClient();
  const intent = str(form, "intent");
  let customerId: string | null = null;
  if (intent === "link") {
    const id = customerIdSchema.safeParse(str(form, "customer_id"));
    if (!id.success) return { status: "error", message: c.reviewNoPick };
    customerId = id.data;
  } else if (intent === "create") {
    const parsed = customerFormSchema.safeParse({ name: str(form, "name"), phone: str(form, "phone"), address: str(form, "address") });
    if (!parsed.success) return err("invalid");
    const created = await createCustomer(db, parsed.data);
    if (!created.ok) return err(created.reason);
    customerId = created.id;
  } else if (intent !== "skip") {
    return err("invalid");
  }
  const r = await resolveReview(db, key.data.source_table, key.data.source_id, customerId);
  if (!r.ok) return err(r.reason);
  revalidatePath(ROUTES.adminCustomerReview);
  revalidatePath(ROUTES.adminCustomers);
  return { status: "ok", message: c.reviewDone };
}
