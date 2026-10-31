// View-model types shared by quote server code and components.
import type { LeadStatus, Quote, QuoteLine } from "@/lib/types";

export type QuoteWithLines = Quote & { lines: QuoteLine[] };

/** Minimal lead info the quote flow needs. */
export interface QuoteLeadInfo {
  id: string;
  code: string;
  customer_name: string;
  email: string | null;
  phone: string;
  company: string | null;
  status: LeadStatus;
  assigned_to: string | null;
}

/** What the public /q/<token> page may show (no internal ids beyond what is needed). */
export interface PublicQuote {
  code: string;
  customerName: string;
  company: string | null;
  version: number;
  status: Quote["status"];
  currency: string;
  subtotal: number;
  vatPercent: number;
  vatAmount: number;
  total: number;
  validUntil: string | null;
  notes: string | null;
  sentAt: string | null;
  lines: Array<Pick<QuoteLine, "description" | "unit" | "quantity" | "unit_price" | "line_total">>;
}

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

/** PostgREST returns numeric as number, or string for very large values. */
export const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function normalizeQuote<T extends Quote>(q: T): T {
  return {
    ...q,
    subtotal: num(q.subtotal),
    vat_percent: num(q.vat_percent),
    vat_amount: num(q.vat_amount),
    total: num(q.total),
  };
}

export function normalizeLine<T extends QuoteLine>(l: T): T {
  return { ...l, quantity: num(l.quantity), unit_price: num(l.unit_price), line_total: num(l.line_total) };
}
