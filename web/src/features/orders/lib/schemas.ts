import { z } from "zod";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/types";

const leadStatus = z.enum(LEAD_STATUSES as unknown as [LeadStatus, ...LeadStatus[]]);

const optionalNote = z
  .string()
  .trim()
  .max(1000)
  .optional()
  .transform((v) => (v ? v : null));

export const changeStatusSchema = z.object({
  leadId: z.guid(),
  to: leadStatus,
  note: optionalNote,
});
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;

export const addNoteSchema = z.object({
  leadId: z.guid(),
  body: z.string().trim().min(1).max(2000),
});
export type AddNoteInput = z.infer<typeof addNoteSchema>;

export function formToObject(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string" && !(key in out)) out[key] = value;
  }
  return out;
}
