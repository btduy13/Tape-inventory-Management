// Zod checks of the customer forms. Mirror customer_clean_payload (0028); SQL stays the authority.
// Empty text is sent as "" and stored as null by SQL, so an edit can clear a field.
import { z } from "zod";

const text = (max: number) => z.string().trim().max(max).default("");

export const customerFormSchema = z.object({
  name: z.string().trim().min(1).max(255),
  phone: text(30),
  address: text(500),
  company: text(255),
  note: text(2000),
});
export type CustomerPayload = z.infer<typeof customerFormSchema>;

export const customerIdSchema = z.guid();

/** One review-queue row: which table and id the decision is about. */
export const reviewKeySchema = z.object({
  source_table: z.enum(["bang_keo_in_orders", "bang_keo_orders", "truc_in_orders", "thank_you_orders", "leads"]),
  source_id: z.string().min(1).max(64),
});
export type ReviewKey = z.infer<typeof reviewKeySchema>;

/** Merge form: target + 1-50 distinct other customers. */
export const mergeSchema = z
  .object({ target: z.guid(), sources: z.array(z.guid()).min(1).max(50) })
  .refine((m) => !m.sources.includes(m.target));

/** Bulk create: 1-500 'source_table:source_id' picks (one row of each group). */
export const bulkRowsSchema = z
  .array(z.string().regex(/^(bang_keo_in_orders|bang_keo_orders|truc_in_orders|thank_you_orders|leads):.{1,64}$/))
  .min(1)
  .max(500);

export const batchIdSchema = z.guid();
