"use server";
// Server Actions of /admin/don-hang. Permission gate + zod here, real enforcement in SQL (has_perm RPCs).
import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { format } from "@/i18n";
import { hasPerm, type Perm } from "@/lib/auth/permissions";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import { ordersCopy as c } from "../lib/copy";
import { normalizeVnPhone } from "../lib/format";
import { orderHref } from "../lib/paths";
import {
  ORDER_SCHEMAS, WORKSHOP_KEYS, customerCreateSchema, frozenOrderSchema, groupByType, isoDateSchema, orderIdSchema,
  orderItemsSchema, orderTypeSchema, optionalUuidSchema, statusSchema, toOrderPayload, type OrderItem,
} from "../lib/schemas";
import type { CustomerHit, OrderType } from "../lib/types";
import {
  convertQuote, createCustomer, createOrder, deleteOrders, sendToWorkshop, setStatus, updateOrder, type Fail,
} from "./mutations";
import { latestByName, searchCustomers, suggestNames } from "./queries";

export type OrderActionState = { status: "idle" | "error" | "success"; message?: string; fields?: string[] };

/** The matching order permission (same rule as SQL has_perm, which re-checks every RPC). */
async function can(perm: Perm): Promise<boolean> {
  return hasPerm(await getCurrentProfile(), perm);
}

async function canCreateOrEdit(): Promise<boolean> {
  const profile = await getCurrentProfile();
  return hasPerm(profile, "orders.create") || hasPerm(profile, "orders.edit");
}

/** Costs a user without orders.money cannot see on edit: left empty, SQL keeps the stored value. */
const HIDDEN_COSTS = ["don_gia_goc", "truc_gia_goc"] as const;

const err = (message: string): OrderActionState => ({ status: "error", message });
const done = (message: string): OrderActionState => ({ status: "success", message });
const FORBIDDEN = err(c.errorForbidden);

function reasonMessage(f: Fail): string {
  return { forbidden: c.errorForbidden, invalid: c.errorValidation, notFound: c.errorNotFound, generic: c.errorGeneric }[f.reason];
}

function formStrings(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of form.entries()) if (typeof value === "string" && !(key in out)) out[key] = value;
  return out;
}

function refresh() {
  revalidatePath(ROUTES.adminOrders, "layout");
  revalidatePath(ROUTES.workshop);
}

/** Fields of the order form; `type`, `id`, `is_quote`, `frozen` are routing fields. */
function parseOrderForm(type: OrderType, raw: Record<string, string>, frozen: boolean, assumed: readonly string[] = []) {
  const fields = { ...raw };
  for (const k of ["type", "id", "is_quote", "frozen"]) delete fields[k];
  // A cost left out on purpose passes the > 0 check; it is not in `raw`, so it is never sent.
  for (const k of assumed) fields[k] ??= "1";
  const parsed = (frozen ? frozenOrderSchema : ORDER_SCHEMAS[type]).safeParse(fields);
  if (parsed.success) return { ok: true as const, data: parsed.data as Record<string, unknown> };
  const fieldsBad = [...new Set(parsed.error.issues.map((i) => String(i.path[0])))];
  const axis = parsed.error.issues.some((i) => i.message === "axis");
  return { ok: false as const, state: { status: "error" as const, message: axis ? c.errorAxis : c.errorValidation, fields: fieldsBad } };
}

/** Create an order or a quote of any type; on success opens its detail page. */
export async function createOrderAction(_prev: OrderActionState, form: FormData): Promise<OrderActionState> {
  if (!(await can("orders.create"))) return FORBIDDEN;
  const raw = formStrings(form);
  const type = orderTypeSchema.safeParse(raw.type ?? "bang_keo_in");
  if (!type.success) return err(c.errorValidation);
  const isQuote = raw.is_quote === "1";
  const parsed = parseOrderForm(type.data, raw, false);
  if (!parsed.ok) return parsed.state;
  const payload = toOrderPayload(parsed.data);
  // The workshop fields belong to a printed-tape order only (the RPC rejects them elsewhere).
  if (isQuote || type.data !== "bang_keo_in") for (const k of WORKSHOP_KEYS) delete payload[k];
  const result = await createOrder(await createClient(), payload, type.data, isQuote);
  if (!result.ok) return err(reasonMessage(result));
  refresh();
  redirect(orderHref(type.data, result.orderId));
}

/** Edit: every field of the form is sent (empty = cleared); SQL recomputes money and debt. */
export async function updateOrderAction(_prev: OrderActionState, form: FormData): Promise<OrderActionState> {
  if (!(await can("orders.edit"))) return FORBIDDEN;
  const raw = formStrings(form);
  const type = orderTypeSchema.safeParse(raw.type);
  const id = orderIdSchema.safeParse(raw.id);
  if (!type.success || !id.success) return err(c.errorValidation);
  const money = await can("orders.money");
  if (!money) for (const k of HIDDEN_COSTS) if (!raw[k]?.trim()) delete raw[k];
  const parsed = parseOrderForm(type.data, raw, raw.frozen === "1", money ? [] : HIDDEN_COSTS);
  if (!parsed.ok) return parsed.state;
  const payload = toOrderPayload(parsed.data, true);
  // A field the form did not show (no orders.money: costs, CTV, ship) keeps its stored value, not null.
  for (const key of Object.keys(payload)) if (!(key in raw)) delete payload[key];
  const result = await updateOrder(await createClient(), type.data, id.data, payload);
  if (!result.ok) return err(reasonMessage(result));
  refresh();
  redirect(orderHref(type.data, id.data));
}

/** Runs one RPC per order type of the selection and adds up the changed rows. */
async function perType(items: unknown, run: (type: OrderType, ids: string[]) => Promise<{ ok: true; count: number } | Fail>) {
  const parsed = orderItemsSchema.safeParse(items);
  if (!parsed.success) return { ok: false as const, state: err(c.errorValidation) };
  let count = 0;
  for (const [type, ids] of groupByType(parsed.data)) {
    const r = await run(type, ids);
    if (!r.ok) {
      if (count > 0) refresh();
      return { ok: false as const, state: err(reasonMessage(r)) };
    }
    count += r.count;
  }
  refresh();
  return { ok: true as const, count };
}

export async function setStatusAction(items: OrderItem[], flags: { da_giao: boolean | null; da_tat_toan: boolean | null }): Promise<OrderActionState> {
  if (!(await can("orders.status"))) return FORBIDDEN;
  const f = statusSchema.safeParse(flags);
  if (!f.success) return err(c.errorValidation);
  const db = await createClient();
  const r = await perType(items, (type, ids) => setStatus(db, type, ids, f.data.da_giao, f.data.da_tat_toan));
  return r.ok ? done(format(c.doneStatus, { count: r.count })) : r.state;
}

export async function deleteOrdersAction(items: OrderItem[], quoteOnly: boolean): Promise<OrderActionState> {
  if (!(await can("orders.delete"))) return FORBIDDEN;
  const db = await createClient();
  const r = await perType(items, (type, ids) => deleteOrders(db, type, ids, quoteOnly === true));
  return r.ok ? done(format(c.doneDelete, { count: r.count })) : r.state;
}

/** Converts each quote; one quote opens the new order. */
export async function convertQuotesAction(items: OrderItem[], due: string): Promise<OrderActionState> {
  if (!(await can("orders.create"))) return FORBIDDEN;
  const list = orderItemsSchema.safeParse(items);
  const date = isoDateSchema.safeParse(due);
  if (!list.success || !date.success) return err(c.errorValidation);
  const db = await createClient();
  const created: { type: OrderType; id: string }[] = [];
  for (const { type, id } of list.data) {
    const r = await convertQuote(db, type, id, date.data);
    if (!r.ok) {
      if (created.length) refresh();
      return err(reasonMessage(r));
    }
    created.push({ type, id: r.id });
  }
  refresh();
  if (created.length === 1) redirect(orderHref(created[0]!.type, created[0]!.id));
  return done(format(c.doneConvert, { count: created.length }));
}

/** Printed-tape orders without a job (the old "Chưa vào xưởng" orders). */
export async function sendToWorkshopAction(ids: string[], userId: string | null): Promise<OrderActionState> {
  if (!(await can("orders.edit"))) return FORBIDDEN;
  const list = orderItemsSchema.safeParse((Array.isArray(ids) ? ids : []).map((id) => ({ type: "bang_keo_in", id })));
  const user = optionalUuidSchema.safeParse(userId);
  if (!list.success || !user.success) return err(c.errorValidation);
  const db = await createClient();
  let count = 0;
  for (const { id } of list.data) {
    const r = await sendToWorkshop(db, id, user.data);
    if (!r.ok) {
      if (count) refresh();
      return err(reasonMessage(r));
    }
    count++;
  }
  refresh();
  return done(format(c.doneWorkshop, { count }));
}

const typeAndText = (type: unknown, text: unknown) => {
  const t = orderTypeSchema.safeParse(type);
  const s = typeof text === "string" ? text.trim().slice(0, 255) : "";
  return t.success && s ? { type: t.data, text: s } : null;
};

export async function suggestNamesAction(type: OrderType, q: string): Promise<string[]> {
  const input = typeAndText(type, q);
  if (!input || !(await canCreateOrEdit())) return [];
  return suggestNames(await createClient(), input.type, input.text);
}

/** Form values (strings) of the latest order with this name: everything the form edits except
 *  the due date and the workshop fields. null when there is none. */
export async function latestOrderAction(type: OrderType, name: string): Promise<{ id: string; values: Record<string, string> } | null> {
  const input = typeAndText(type, name);
  if (!input || !(await canCreateOrEdit())) return null;
  const row = await latestByName(await createClient(), input.type, input.text);
  if (!row) return null;
  const values: Record<string, string> = {};
  for (const key of Object.keys(ORDER_SCHEMAS[input.type].shape)) {
    if (key === "ngay_du_kien" || (WORKSHOP_KEYS as readonly string[]).includes(key)) continue;
    const v = row[key];
    if (typeof v === "string" || typeof v === "number") values[key] = String(v);
  }
  return { id: row.id, values };
}

export async function searchCustomersAction(q: string): Promise<CustomerHit[]> {
  if (typeof q !== "string" || !(await canCreateOrEdit())) return [];
  return searchCustomers(await createClient(), q.trim().slice(0, 100));
}

export async function createCustomerAction(input: { name: string; phone?: string; address?: string }): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  if (!(await can("customers.edit"))) return { ok: false, message: c.errorForbidden };
  const parsed = customerCreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: c.customerNeedName };
  const payload = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined)) as Record<string, string>;
  const db = await createClient();
  // Like the app's electron_customer_create: one customer already has this phone -> reuse it. A second
  // customer with the same phone would stop the phone trigger from linking new orders.
  const norm = normalizeVnPhone(payload.phone);
  if (norm) {
    const same = (await searchCustomers(db, norm, 50)).filter((h) => normalizeVnPhone(h.phone) === norm);
    if (same.length === 1) return { ok: true, id: same[0].id };
  }
  const r = await createCustomer(db, payload);
  if (r.ok) revalidatePath(ROUTES.adminCustomers);
  return r.ok ? r : { ok: false, message: r.reason === "invalid" ? c.customerCreateError : reasonMessage(r) };
}
