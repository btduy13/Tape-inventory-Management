// zod schemas for every quote input (server actions + public respond endpoint).
import { z } from "zod";

export const uuidSchema = z.guid();

/** Raw token from randomToken(32): base64url, 43 chars. Accept a small range, nothing else. */
export const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{32,128}$/);

const money = z.coerce.number().finite();

export const quoteLineInputSchema = z.object({
  description: z.string().trim().min(1).max(300),
  unit: z.string().trim().min(1).max(20).default("cuộn"),
  quantity: money.gt(0).max(1_000_000_000),
  unitPrice: money.min(0).max(1_000_000_000_000),
});
export type QuoteLineInput = z.infer<typeof quoteLineInputSchema>;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), "invalid date");

export const saveDraftSchema = z.object({
  quoteId: uuidSchema,
  vatPercent: money.min(0).max(100).refine((n) => Math.round(n * 100) === n * 100, "max 2 decimals"),
  validUntil: isoDate.nullable().default(null),
  notes: z.string().trim().max(4000).nullable().default(null).transform((s) => (s ? s : null)),
  lines: z.array(quoteLineInputSchema).min(1).max(50),
});
export type SaveDraftInput = z.input<typeof saveDraftSchema>;
export type SaveDraftData = z.output<typeof saveDraftSchema>;

export const RESPONSE_NOTE_MAX = 2000;

export const respondSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("accept"),
    note: z.string().trim().max(RESPONSE_NOTE_MAX).optional().transform((s) => s || null),
  }),
  z.object({
    action: z.literal("request_changes"),
    note: z.string().trim().min(3).max(RESPONSE_NOTE_MAX),
  }),
]);
export type RespondInput = z.output<typeof respondSchema>;
