import { z } from "zod";

/** Empty `userId` (from a "— unassigned —" option) means unassign. */
export const assignSchema = z.object({
  leadId: z.guid(),
  userId: z
    .union([z.guid(), z.literal("")])
    .optional()
    .transform((v) => (v ? v : null)),
});
export type AssignInput = z.infer<typeof assignSchema>;

export function formToObject(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string" && !(key in out)) out[key] = value;
  }
  return out;
}

export type AssignActionState = { status: "idle" | "error" | "success" | "warning"; message?: string };
export const IDLE: AssignActionState = { status: "idle" };
