// Zod schemas for auth forms. Messages are i18n keys resolved by the UI layer.
import { z } from "zod";

export const MIN_PASSWORD_LENGTH = 8;

const email = z.string().trim().toLowerCase().email().max(254);

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(256),
  next: z.string().max(512).optional().nullable(),
});

export const resetRequestSchema = z.object({ email });

export const updatePasswordSchema = z
  .object({
    password: z.string().min(MIN_PASSWORD_LENGTH, "passwordTooShort").max(256),
    confirm: z.string().max(256),
  })
  .refine((v) => v.password === v.confirm, { message: "passwordMismatch", path: ["confirm"] });

/** FormData -> plain object with string values only (files and duplicates ignored). */
export function formToObject(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string" && !(key in out)) out[key] = value;
  }
  return out;
}
