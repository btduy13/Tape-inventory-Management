// VAT line of the admin hand-off form. convert_lead_to_production copies vat_percent from the
// latest accepted quote (0 when there is none); the form shows it read-only so it is not silent.
import { format } from "@/i18n";
import { wsCopy } from "./copy";

export function handoffVatLabel(vatPercent: number | null): string {
  if (vatPercent === null || !Number.isFinite(vatPercent)) return wsCopy.vatNoQuote;
  return format(wsCopy.vatFromQuote, { vat: vatPercent.toLocaleString("vi-VN", { maximumFractionDigits: 2 }) });
}
