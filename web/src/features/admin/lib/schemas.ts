import { z } from "zod";
import { ROLES, type AppRole, type Profile } from "@/lib/types";

const role = z.enum(ROLES as unknown as [AppRole, ...AppRole[]]);
const uuid = z.string().uuid();
/** HTML checkbox: "on" when checked, absent otherwise. */
const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
  .optional()
  .transform((v) => v === "on" || v === "true");

export const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  fullName: z.string().trim().min(1).max(120),
  role,
});
export type InviteInput = z.infer<typeof inviteSchema>;

export const updateUserSchema = z.object({
  userId: uuid,
  role,
  isActive: checkbox,
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

/** numeric(_, 1) columns: rounded to one decimal, must stay > 0 after rounding. */
const decimal = (max: number) =>
  z.coerce.number().finite().min(0.1).max(max).transform((v) => Math.round(v * 10) / 10);

export const presetSchema = z.object({
  id: z.union([uuid, z.literal("")]).optional().transform((v) => (v ? v : null)),
  label: z.string().trim().min(1).max(80),
  widthMm: decimal(200),
  lengthM: decimal(2000),
  thicknessMic: decimal(200),
  sortOrder: z.coerce.number().int().min(-10000).max(10000).default(0),
  isActive: checkbox,
});
export type PresetInput = z.infer<typeof presetSchema>;

export const leadIdSchema = z.object({ leadId: uuid });

/** Mirrors the SQL guard: an admin cannot demote or deactivate their own account. */
export function isSelfLockout(actor: Pick<Profile, "id">, input: UpdateUserInput): boolean {
  return actor.id === input.userId && (input.role !== "admin" || !input.isActive);
}

export function formToObject(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string" && !(key in out)) out[key] = value;
  }
  return out;
}

export type AdminActionState = { status: "idle" | "error" | "success"; message?: string };
export const IDLE: AdminActionState = { status: "idle" };
export const fail = (message: string): AdminActionState => ({ status: "error", message });
export const ok = (message: string): AdminActionState => ({ status: "success", message });
