// Customer contact fields of the quote request. Used on the server (authoritative)
// and in the client form (UX only). Limits mirror CHECK constraints in 0003_leads_designs.sql.
import { z } from "zod";
import { getDictionary } from "@/i18n";
import type { LeadFieldName } from "./api-contract";

const t = getDictionary().leadIntake.errors;

// C0/C1 control chars except tab/newline (kept in the note only).
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;

export function cleanText(value: unknown): string {
  return typeof value === "string" ? value.replace(CONTROL_CHARS, "").trim() : "";
}

/** "+84 912.345-678" -> "+84912345678". Returns "" when the shape is not a phone number. */
export function normalizePhone(raw: string): string {
  const v = raw.trim();
  if (!/^\+?[0-9 .\-()]+$/.test(v)) return "";
  const digits = v.replace(/\D/g, "");
  return (v.startsWith("+") ? "+" : "") + digits;
}

const singleLine = (max: number) =>
  z.preprocess((v) => cleanText(v).replace(/\s+/g, " "), z.string().max(max, t.tooLong));

const optionalLine = (max: number) =>
  singleLine(max).transform((v) => (v === "" ? null : v));

export const leadFieldsSchema = z.object({
  name: singleLine(120).pipe(z.string().min(1, t.required)),
  phone: z.preprocess(
    (v) => normalizePhone(cleanText(v)),
    z.string().regex(/^\+?\d{9,15}$/, t.phone),
  ),
  email: z.preprocess(
    (v) => cleanText(v).toLowerCase(),
    z.union([z.literal(""), z.email(t.email).max(254, t.tooLong)]),
  ).transform((v) => (v === "" ? null : v)),
  company: optionalLine(200),
  quantity: z.preprocess(
    (v) => (typeof v === "string" ? v.replace(/[.,\s]/g, "") : v),
    z.coerce.number({ error: t.quantity }).int(t.quantity).min(1, t.quantity).max(10_000_000, t.quantity),
  ),
  note: z.preprocess(
    (v) => cleanText(v),
    z.string().max(2000, t.tooLong),
  ).transform((v) => (v === "" ? null : v)),
});

export type LeadFields = z.infer<typeof leadFieldsSchema>;
export type LeadFieldsInput = Record<LeadFieldName, string>;

/** First error message per field, for the form and the 422 response. */
export function fieldErrors(error: z.ZodError): Partial<Record<LeadFieldName, string>> {
  const out: Partial<Record<LeadFieldName, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as LeadFieldName | undefined;
    if (key && !(key in out)) out[key] = issue.message;
  }
  return out;
}
