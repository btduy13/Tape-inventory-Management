// Pure display helpers for the admin order pages. Money: formatVnd from @/i18n.
import { formatVnd } from "@/i18n";
import type { OrderOrigin } from "./types";

const num = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });

export function plain(value: unknown): string {
  const n = toNumber(value);
  return n === null ? "—" : num.format(n);
}

/** PostgREST numerics arrive as numbers, huge ones as strings. */
export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** RPC money (number, numeric string) through the shared formatVnd; null / NaN -> "—".
 *  Also used by features/admin and features/customers. */
export function money(value: unknown): string {
  const n = toNumber(value);
  return n === null ? "—" : formatVnd(Math.round(n));
}

const short = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

/** Stat cards: 1 234 567 890 -> "1,2 tỷ", 25 400 000 -> "25,4 tr" (full amount goes in the hint). */
export function vndShort(value: number): string {
  const a = Math.abs(value);
  if (a >= 1e9) return `${short.format(value / 1e9)} tỷ`;
  if (a >= 1e6) return `${short.format(value / 1e6)} tr`;
  return formatVnd(value);
}

/** Port of SQL public.normalize_vn_phone (0028): "+84 912.345.678" -> "0912345678", invalid -> null. */
export function normalizeVnPhone(phone: string | null | undefined): string | null {
  let v = (phone ?? "").replace(/[^0-9]/g, "");
  if (v.startsWith("0084")) v = `0${v.slice(4)}`;
  else if (v.startsWith("84") && (v.length === 11 || v.length === 12)) v = `0${v.slice(2)}`;
  else if (v.length === 9 && !v.startsWith("0")) v = `0${v}`;
  return /^0[1-9][0-9]{8,9}$/.test(v) ? v : null;
}

/** "2026-11-03" or "2026-11-03T10:20:00" -> "03/11/2026" (calendar day as stored, no tz shift). */
export function dateVn(value: unknown): string {
  if (typeof value !== "string") return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "—";
}

/** thoi_gian is a Vietnam wall-clock timestamp without zone: show it as stored. */
export function dateTimeVn(value: unknown): string {
  if (typeof value !== "string") return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(value);
  return m ? `${m[4]}:${m[5]} ${m[3]}/${m[2]}/${m[1]}` : dateVn(value);
}

const tsFmt = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric",
});

/** timestamptz (ISO with offset) in Vietnam time. */
export function instantVn(value: unknown): string {
  if (typeof value !== "string") return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : tsFmt.format(d);
}

/**
 * Origin of an order. Portal leads carry lead_id; otherwise the first step-log note written by
 * the 0024 order trigger says app or web. Orders without a job predate 0024 (desktop app).
 */
export function originOf(leadId: string | null, firstNote: string | null | undefined): OrderOrigin {
  if (leadId) return "lead";
  return firstNote?.startsWith("Đơn mới từ web") ? "web" : "app";
}
