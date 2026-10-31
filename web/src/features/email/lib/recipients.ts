// Recipient normalization: trim, lowercase, validate, dedupe.
import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));

export function normalizeRecipients(list: ReadonlyArray<string | null | undefined>): string[] {
  const out = new Set<string>();
  for (const raw of list) {
    if (!raw) continue;
    const parsed = emailSchema.safeParse(raw);
    if (parsed.success) out.add(parsed.data);
  }
  return [...out];
}
