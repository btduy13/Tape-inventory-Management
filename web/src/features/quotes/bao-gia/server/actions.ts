"use server";
// Server Actions of /admin/bao-gia. Permission check + zod here; SQL re-checks has_perm and
// recomputes the money (admin_quote_save 0032, admin_quote_convert / admin_order_delete 0026).
import "server-only";
import { revalidatePath } from "next/cache";
import { hasPerm, type Perm } from "@/lib/auth/permissions";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import { convertQuote, deleteOrders } from "@/features/admin-orders/server/mutations";
import { isoDateSchema, orderIdSchema, orderTypeSchema } from "@/features/admin-orders/lib/schemas";
import { quoteInputSchema, toQuotePayload, type QuoteInput } from "../lib/schema";
import { rpc } from "./queries";

export type QuoteActionResult = { ok: true; id: string } | { ok: false; message: string };

const MSG = {
  forbidden: "Bạn không có quyền thực hiện thao tác này",
  invalid: "Dữ liệu chưa hợp lệ, kiểm tra lại các ô bắt buộc",
  notFound: "Không tìm thấy báo giá",
  generic: "Có lỗi, thử lại sau",
} as const;

const CODE = { forbidden: "42501", invalid: "22023", notFound: "P0002", generic: undefined } as const;

function failure(code: string | undefined): QuoteActionResult {
  const message = code === "42501" ? MSG.forbidden : code === "22023" ? MSG.invalid : code === "P0002" ? MSG.notFound : MSG.generic;
  return { ok: false, message };
}

async function allowed(...perms: Perm[]): Promise<boolean> {
  const profile = await getCurrentProfile();
  return perms.every((p) => hasPerm(profile, p));
}

function refresh() {
  revalidatePath(ROUTES.adminQuotes, "layout");
  revalidatePath(ROUTES.adminOrders, "layout");
}

/** New quote (orders.create) or overwrite one (orders.edit + orders.money). */
export async function saveQuoteAction(input: QuoteInput): Promise<QuoteActionResult> {
  const parsed = quoteInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: MSG.invalid };
  if (!(await (parsed.data.id ? allowed("orders.edit", "orders.money") : allowed("orders.create")))) return { ok: false, message: MSG.forbidden };
  const payload = toQuotePayload(parsed.data);
  if (!payload) return { ok: false, message: MSG.invalid };
  const db = await createClient();
  const { data, error } = await rpc(db)("admin_quote_save", {
    p_type: parsed.data.type, p_header: payload.header, p_items: payload.items, ...(parsed.data.id ? { p_id: parsed.data.id } : {}),
  });
  if (error || typeof data !== "string") return failure(error?.code);
  refresh();
  return { ok: true, id: data };
}

export async function deleteQuoteAction(type: string, id: string): Promise<QuoteActionResult> {
  const t = orderTypeSchema.safeParse(type);
  const i = orderIdSchema.safeParse(id);
  if (!t.success || !i.success) return { ok: false, message: MSG.invalid };
  if (!(await allowed("orders.delete"))) return { ok: false, message: MSG.forbidden };
  const r = await deleteOrders(await createClient(), t.data, [i.data], true);
  if (!r.ok) return failure(CODE[r.reason]);
  if (r.count === 0) return { ok: false, message: MSG.notFound };
  refresh();
  return { ok: true, id: i.data };
}

/** Quote -> order with the chosen delivery date; returns the new order id. */
export async function convertQuoteAction(type: string, id: string, due: string): Promise<QuoteActionResult> {
  const t = orderTypeSchema.safeParse(type);
  const i = orderIdSchema.safeParse(id);
  const d = isoDateSchema.safeParse(due);
  if (!t.success || !i.success || !d.success) return { ok: false, message: MSG.invalid };
  if (!(await allowed("orders.create"))) return { ok: false, message: MSG.forbidden };
  const r = await convertQuote(await createClient(), t.data, i.data, d.data);
  if (!r.ok) return failure(CODE[r.reason]);
  refresh();
  return { ok: true, id: r.id };
}
