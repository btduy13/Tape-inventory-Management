// Order list reads and attachment calls from the browser (user's own token, lib/supabase/client.ts).
// Straight to Supabase so big payloads (5000-row export, 25 MB files) skip the server-action and
// hosting body limits. Every RPC is SECURITY DEFINER and checks has_perm itself (0030).
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { GeneratedDatabase } from "@/lib/types";
import type { OrdersFilter } from "./list-spec";
import type { ExportRow } from "./excel-export";
import type { AdminOrderRow, OrderType } from "./types";

const db = () => createClient() as unknown as SupabaseClient<GeneratedDatabase>;

export type ListQuery = { type: OrderType | "all"; filter: OrdersFilter };
/** Excel export cap: 25 calls of 200 rows. */
export const EXPORT_MAX_ROWS = 5000;
/** The app's (and admin_order_attachment_add's) limit. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export async function fetchRows({ type, filter }: ListQuery): Promise<AdminOrderRow[] | null> {
  const { data, error } = await db().rpc("admin_orders_list", { p_filter: filter, p_type: type });
  return error || !Array.isArray(data) ? null : (data as unknown as AdminOrderRow[]);
}

/** Every row of the filter, 200 per call. "too_many" past EXPORT_MAX_ROWS, null on a load error. */
export async function fetchAllRows(query: ListQuery): Promise<AdminOrderRow[] | "too_many" | null> {
  const out: AdminOrderRow[] = [];
  for (let offset = 0; ; offset += 200) {
    const rows = await fetchRows({ ...query, filter: { ...query.filter, limit: 200, offset } });
    if (!rows) return null;
    out.push(...rows);
    if (out.length > EXPORT_MAX_ROWS) return "too_many";
    if (rows.length < 200) return out;
  }
}

/** Full rows (admin_orders_rows, 0030) of the list rows, same order, for the Excel export. */
export async function fetchFullRows(rows: readonly AdminOrderRow[]): Promise<ExportRow[] | null> {
  const byKey = new Map<string, ExportRow>();
  const types = [...new Set(rows.map((r) => r.type))];
  for (const type of types) {
    const ids = rows.filter((r) => r.type === type).map((r) => r.id);
    for (let i = 0; i < ids.length; i += 200) {
      // shortcut: admin_orders_rows is newer than lib/database.generated.ts (untyped call until regenerated).
      const { data, error } = await (db() as unknown as SupabaseClient).rpc("admin_orders_rows", { p_type: type, p_ids: ids.slice(i, i + 200) });
      if (error || !Array.isArray(data)) return null;
      for (const o of data as ExportRow[]) byKey.set(`${type}:${o.id}`, o);
    }
  }
  const out = rows.map((r) => byKey.get(`${r.type}:${r.id}`));
  return out.every(Boolean) ? (out as ExportRow[]) : null;
}

export type Attachment = { id: number; file_name: string; content_type: string | null; file_size: number; created_at: string };

export async function listAttachments(type: OrderType, id: string): Promise<Attachment[] | null> {
  const { data, error } = await db().rpc("admin_order_attachments", { p_type: type, p_id: id });
  return error || !Array.isArray(data) ? null : data;
}

/** Downloads one file (browser save) from its base64. */
export async function downloadAttachment(id: number): Promise<boolean> {
  const { data, error } = await db().rpc("admin_order_attachment_get", { p_attachment_id: id });
  const f = Array.isArray(data) ? data[0] : null;
  if (error || !f || typeof f.base64_data !== "string") return false;
  const bin = atob(f.base64_data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  saveBlob(new Blob([bytes], { type: f.content_type || "application/octet-stream" }), f.file_name);
  return true;
}

export async function addAttachment(type: OrderType, id: string, file: File): Promise<number | null> {
  if (file.size > MAX_FILE_BYTES) return null;
  const { data, error } = await db().rpc("admin_order_attachment_add", {
    p_type: type, p_id: id, p_file_name: file.name.slice(0, 255), p_content_type: file.type || "application/octet-stream",
    p_base64: await toBase64(file),
  });
  return error || typeof data !== "number" ? null : data;
}

export async function deleteAttachment(id: number): Promise<boolean> {
  const { error } = await db().rpc("admin_order_attachment_delete", { p_attachment_id: id });
  return !error;
}

/** data: URL minus its prefix = plain base64. */
function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).replace(/^data:[^,]*,/, ""));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
