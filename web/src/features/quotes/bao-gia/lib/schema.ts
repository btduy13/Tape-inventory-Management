// Editor state -> admin_quote_save payload (0032). Only the input keys of each type; empty size inputs
// are left out (empty header text is sent: SQL stores null), numbers must be finite and >= 0. SQL re-validates and recomputes every amount.
import { z } from "zod";
import { parseMoney } from "@/features/admin-orders/lib/form-money";
import { QUOTE_TYPES, TEXT_KEYS, type QuoteType } from "./bundle";
import { AXIS_GROUPS, SIZE_GROUPS } from "./layout";

/** Input keys of a size / an axis = the form's input groups (layout.ts). */
export const SIZE_KEYS: Readonly<Record<QuoteType, readonly string[]>> = {
  bang_keo_in: SIZE_GROUPS.bang_keo_in.flatMap((g) => g.keys),
  bang_keo: SIZE_GROUPS.bang_keo.flatMap((g) => g.keys),
  truc_in: SIZE_GROUPS.truc_in.flatMap((g) => g.keys),
};
export const AXIS_KEYS: readonly string[] = AXIS_GROUPS.flatMap((g) => g.keys);

const strings = z.record(z.string().max(40), z.string().max(255));
export const quoteInputSchema = z.object({
  type: z.enum(QUOTE_TYPES),
  id: z.string().trim().min(1).max(64).regex(/^[\p{L}\p{N}_.-]+$/u).nullable(),
  header: z.object({
    ten_hang: z.string().trim().min(1).max(255),
    ten_khach_hang: z.string().trim().min(1).max(255),
    sdt_khach_hang: z.string().trim().max(30),
    dia_chi_khach_hang: z.string().trim().max(500),
    customer_id: z.union([z.guid(), z.literal("")]),
  }),
  sizes: z.array(z.object({ fields: strings, axes: z.array(strings).max(20) })).min(1).max(20),
});
export type QuoteInput = z.infer<typeof quoteInputSchema>;

type Json = Record<string, string | number>;

/** Picks `keys` of `src`: text trimmed, numbers parsed like the app ("15.000" = 15000, "1,5" = 1.5);
 *  empty left out. Null = bad number. */
function pick(src: Record<string, string>, keys: readonly string[]): Json | null {
  const out: Json = {};
  for (const key of keys) {
    const raw = (src[key] ?? "").trim();
    if (!raw) continue;
    if (TEXT_KEYS.has(key)) out[key] = raw;
    else {
      const n = parseMoney(raw);
      if (n === null || n < 0) return null;
      out[key] = n;
    }
  }
  return out;
}

export type QuotePayload = { header: Json; items: Record<string, string | number | Json[]>[] };

export function toQuotePayload(input: QuoteInput): QuotePayload | null {
  const { customer_id, ...rest } = input.header;
  const header: Json = { ...rest, ...(customer_id ? { customer_id } : {}) };
  const items: QuotePayload["items"] = [];
  for (const size of input.sizes) {
    const item = pick(size.fields, SIZE_KEYS[input.type]);
    if (!item) return null;
    const axes = input.type === "bang_keo_in" ? size.axes.map((a) => pick(a, AXIS_KEYS)) : [];
    if (axes.some((a) => a === null)) return null;
    items.push({ ...item, ...(axes.length ? { axes: axes as Json[] } : {}) });
  }
  return { header, items };
}
