// Pure display helpers for the admin order pages.
import type { OrderOrigin } from "./types";

const vnd = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });

/** 1234567 -> "1.234.567 đ"; null / NaN -> "—". */
export function money(value: unknown): string {
  const n = toNumber(value);
  return n === null ? "—" : `${vnd.format(Math.round(n))} đ`;
}

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
