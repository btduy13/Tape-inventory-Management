// Reads of /admin/don-hang/xuat: the order picker (admin_orders_list), the voucher rows
// (admin_orders_for_export) and the email draft (admin_order_get + attachments + suggestions, 0031).
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { gen } from "@/features/admin-orders/server/queries";
import { type AdminOrderRow, type OrderRecord, type OrderType } from "@/features/admin-orders/lib/types";
import type { ExportOrder } from "../lib/voucher";
import type { PickerFilter, PickerRow } from "../lib/picker";

type Db = SupabaseClient<Database>;
/** 0031 RPCs are newer than lib/database.generated.ts: untyped client for them only. */
const raw = (db: Db) => db as unknown as SupabaseClient;

export const PICKER_LIMIT = 200;

const pad = (v: number) => String(v).padStart(2, "0");

/** Real orders (no quotes) of the year / month, newest first. shortcut: first 200 rows only,
 *  page with offset if a month ever holds more. */
export async function listPickerOrders(db: Db, f: PickerFilter): Promise<PickerRow[] | null> {
  const lastDay = f.month ? new Date(f.year, f.month, 0).getDate() : 31;
  const filter = {
    is_quote: false,
    date_from: `${f.year}-${pad(f.month ?? 1)}-01`,
    date_to: `${f.year}-${pad(f.month ?? 12)}-${pad(lastDay)}`,
    ...(f.q ? { q: f.q } : {}),
    sort: "thoi_gian", dir: "desc", limit: PICKER_LIMIT, offset: 0,
  };
  const { data, error } = await gen(db).rpc("admin_orders_list", { p_filter: filter, p_type: f.type });
  if (error || !Array.isArray(data)) return null;
  return (data as unknown as AdminOrderRow[]).map(({ type, id, thoi_gian, ten_hang, ten_khach_hang, so_luong, don_gia_ban }) =>
    ({ type, id, thoi_gian, ten_hang, ten_khach_hang, so_luong, don_gia_ban }));
}

export type ExportLoad = { ok: true; orders: ExportOrder[] } | { ok: false; missing: string[] };

/** Every id must load: a voucher missing an order would print wrong totals. */
export async function loadExportOrders(db: Db, ids: string[]): Promise<ExportLoad> {
  const { data, error } = await gen(db).rpc("admin_orders_for_export", { p_ids: ids });
  if (error || !Array.isArray(data)) return { ok: false, missing: ids };
  const orders = data as unknown as ExportOrder[];
  const found = new Set(orders.map((o) => o.id));
  const missing = ids.filter((id) => !found.has(id));
  return missing.length ? { ok: false, missing } : { ok: true, orders };
}

export type AttachmentInfo = { id: number; file_name: string; file_size: number };

export type EmailContext = { order: OrderRecord; attachments: AttachmentInfo[]; suggestions: string[] };

export async function loadEmailContext(db: Db, type: OrderType, id: string): Promise<EmailContext | null> {
  const [order, atts, sugg] = await Promise.all([
    gen(db).rpc("admin_order_get", { p_id: id, p_type: type }),
    gen(db).rpc("admin_order_attachments", { p_type: type, p_id: id }),
    raw(db).rpc("admin_email_suggestions"),
  ]);
  const detail = order.data as unknown as { order?: OrderRecord } | null;
  if (order.error || !detail?.order) return null;
  return {
    order: detail.order,
    attachments: Array.isArray(atts.data) ? (atts.data as unknown as AttachmentInfo[]) : [],
    suggestions: Array.isArray(sugg.data) ? (sugg.data as unknown[]).map(String) : [],
  };
}

/** Selected attachments of THIS order, as bytes. Null when one is missing or belongs elsewhere. */
export async function loadAttachments(db: Db, type: OrderType, id: string, ids: number[]) {
  const out: { filename: string; contentType: string; content: Uint8Array }[] = [];
  for (const attId of ids) {
    const { data, error } = await gen(db).rpc("admin_order_attachment_get", { p_attachment_id: attId });
    const row = Array.isArray(data) ? (data[0] as { order_type: string; order_id: string; file_name: string; content_type: string | null; base64_data: string } | undefined) : undefined;
    if (error || !row || row.order_type !== type || row.order_id !== id) return null;
    out.push({ filename: row.file_name, contentType: row.content_type || "application/octet-stream", content: Buffer.from(row.base64_data, "base64") });
  }
  return out;
}

export async function markEmailed(db: Db, type: OrderType, id: string, emails: string[]): Promise<boolean> {
  const { error } = await raw(db).rpc("admin_order_mark_emailed", { p_type: type, p_id: id, p_emails: emails });
  return !error;
}
