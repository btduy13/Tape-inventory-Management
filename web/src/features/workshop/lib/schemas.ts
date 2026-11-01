// zod schemas for the workshop Server Actions (server re-validates; SQL is the final check).
import { z } from "zod";
import { PRODUCTION_STEPS, type ProductionStep } from "@/lib/types";
import { isIsoDate, vnToday } from "./dates";

const uuid = z.string().uuid();
const optionalText = (max: number) =>
  z
    .string()
    .max(max * 4)
    .optional()
    .transform((v) => {
      const trimmed = (v ?? "").trim();
      return trimmed ? trimmed.slice(0, max) : null;
    });
const optionalUuid = z
  .union([uuid, z.literal("")])
  .optional()
  .transform((v) => (v ? v : null));

export const advanceSchema = z.object({
  jobId: uuid,
  to: z.enum(PRODUCTION_STEPS as unknown as [ProductionStep, ...ProductionStep[]]),
  note: optionalText(1000),
});
export type AdvanceInput = z.infer<typeof advanceSchema>;

/** Due date must be a real YYYY-MM-DD date and not before today (Vietnam). */
export function convertSchema(now: Date = new Date()) {
  const today = vnToday(now);
  return z.object({
    leadId: uuid,
    dueDate: z
      .string()
      .refine(isIsoDate, { message: "dueDate" })
      .refine((d) => d >= today, { message: "dueDate" }),
    note: optionalText(2000),
    workshopUserId: optionalUuid,
  });
}
export type ConvertInput = z.infer<ReturnType<typeof convertSchema>>;

export const assignSchema = z.object({ leadId: uuid, userId: optionalUuid });
export type AssignInput = z.infer<typeof assignSchema>;

export type WorkshopActionState = { status: "idle" | "error" | "success"; message?: string };
export const IDLE: WorkshopActionState = { status: "idle" };
export const fail = (message: string): WorkshopActionState => ({ status: "error", message });
export const ok = (message: string): WorkshopActionState => ({ status: "success", message });

export function formToObject(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string" && !(key in out)) out[key] = value;
  }
  return out;
}
