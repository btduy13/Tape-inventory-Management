// Maps DB rows to the minimal public view model for /q/<token>.
import type { Quote, QuoteLine } from "@/lib/types";
import type { PublicQuote } from "./types";

export function toPublicQuote(
  quote: Quote,
  lines: QuoteLine[],
  lead: { code: string; customer_name: string; company: string | null },
): PublicQuote {
  return {
    code: lead.code,
    customerName: lead.customer_name,
    company: lead.company,
    version: quote.version,
    status: quote.status,
    currency: quote.currency,
    subtotal: quote.subtotal,
    vatPercent: quote.vat_percent,
    vatAmount: quote.vat_amount,
    total: quote.total,
    validUntil: quote.valid_until,
    notes: quote.notes,
    sentAt: quote.sent_at,
    lines: lines.map(({ description, unit, quantity, unit_price, line_total }) => ({
      description,
      unit,
      quantity,
      unit_price,
      line_total,
    })),
  };
}
