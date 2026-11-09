// /admin/bao-gia routes: list, new (?type=), edit (/moi?type=&id=), print (/[id]?type=).
import { ROUTES } from "@/lib/routes";
import { QUOTE_TYPES, type QuoteType } from "./bundle";

const base = ROUTES.adminQuotes;
export const newQuoteHref = (type: QuoteType) => `${base}/moi?type=${type}`;
export const quoteEditHref = (type: string, id: string) => `${base}/moi?type=${type}&id=${encodeURIComponent(id)}`;
export const quotePrintHref = (type: string, id: string) => `${base}/${encodeURIComponent(id)}?type=${type}`;

export function parseQuoteType(raw: unknown): QuoteType {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return (QUOTE_TYPES as readonly unknown[]).includes(v) ? (v as QuoteType) : "bang_keo_in";
}

export const TYPE_LABEL: Readonly<Record<string, string>> = {
  bang_keo_in: "Băng Keo In Logo", bang_keo: "Băng Keo thường", truc_in: "Trục In", thank_you: "Băng keo Thank you",
};
