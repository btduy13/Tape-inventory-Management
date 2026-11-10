// Order notification email of the desktop app (emailDialog.js openEmailDialog): subject
// "TRỤC MỚI - / TRỤC CŨ - <Loại> <tên hàng>" and the "Chào bác, ..." body, as editable plain text.
import type { OrderType } from "@/features/admin-orders/lib/types";

/** The app's default recipient (emailDialog.js). */
export const DEFAULT_EMAIL_TO = "tque197@gmail.com";
/** Total attachment size, as in the app. */
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
export const MAX_EMAIL_ATTACHMENTS = 20;

const TYPE_LABEL: Record<OrderType, string> = {
  bang_keo_in: "Băng Keo In", truc_in: "Trục In", thank_you: "Băng Keo Thank you", bang_keo: "Băng Keo",
};

type Order = Record<string, unknown>;
const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const or = (v: unknown, fallback: string) => s(v) || fallback;

function bangKeoSpec(quyCach: unknown): string {
  const text = s(quyCach).trim();
  if (!text) return "Mặc định";
  return /^\d+(?:[.,]\d+)?$/.test(text) ? `${text} KG` : text;
}

function specText(type: OrderType, o: Order): string {
  if (type === "bang_keo_in") {
    return `Quy cách: ${or(o.quy_cach_mm, "0")}mm * ${or(o.quy_cach_m, "0")}m * ${or(o.quy_cach_mic, "0")}mic\n` +
      `Lõi giấy: ${or(o.loi_giay, "Mặc định")}\nThùng bao: ${or(o.thung_bao, "Mặc định")}`;
  }
  if (type === "truc_in") return `Quy cách: ${or(o.quy_cach, "Mặc định")}`;
  if (type === "thank_you") return `Kích thước: ${or(o.kich_thuoc, "Mặc định")}${o.ghi_chu ? `\nGhi chú: ${s(o.ghi_chu)}` : ""}`;
  return `Quy cách: ${bangKeoSpec(o.quy_cach)}`;
}

export type EmailDraft = { baseSubject: string; isNewAxis: boolean; body: string };

export function orderEmailDraft(type: OrderType, o: Order): EmailDraft {
  const label = TYPE_LABEL[type];
  const qty = `${Number(o.so_luong || 0).toLocaleString("vi-VN")}${type === "bang_keo" ? " KG" : " cuộn"}`;
  const line = "________________________________";
  return {
    baseSubject: `${label} ${s(o.ten_hang)}`.replace(/[\r\n]+/g, " ").trim(),
    isNewAxis: type === "bang_keo_in" && o.loai_truc === "moi",
    body: [
      "Chào bác,", "",
      `Bác làm giúp con đơn hàng ${label} "${s(o.ten_hang)}" này nhé:`,
      "Thông tin đơn hàng:", line,
      `Màu sắc: ${or(o.mau_sac, "Mặc định")}`,
      `Màu keo: ${or(o.mau_keo, "Thường")}`,
      `Số lượng: ${qty}`,
      specText(type, o), line, "",
      "Cám ơn bác", "Quế",
    ].join("\n"),
  };
}

export const emailSubject = (base: string, newAxis: boolean) => `${newAxis ? "TRỤC MỚI - " : "TRỤC CŨ - "}${base}`;

/** Recipients split by , or ; trimmed, lowercased, deduped (splitEmailRecipients). */
export function splitRecipients(value: string): string[] {
  return [...new Set(value.split(/[,;]/).map((a) => a.trim().toLowerCase()).filter(Boolean))];
}
