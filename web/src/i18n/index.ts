// i18n entry point. Today only Vietnamese; add `en` by creating en.ts typed as Dictionary.
import { vi, type Dictionary } from "./vi";

export type Locale = "vi";
export const DEFAULT_LOCALE: Locale = "vi";

const dictionaries: Record<Locale, Dictionary> = { vi };

export function getDictionary(locale: Locale = DEFAULT_LOCALE): Dictionary {
  return dictionaries[locale];
}

/** Interpolate `{name}` placeholders: format("Mã {code}", { code: "L1" }) -> "Mã L1". */
export function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

/** Format VND amounts the Vietnamese way: 1.234.567 ₫ */
export function formatVnd(amount: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount);
}

export type { Dictionary };
