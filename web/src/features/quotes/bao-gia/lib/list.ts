// Pure helpers of the quote list (/admin/bao-gia): URL spec, status, size summary, tab filter.
// A converted quote becomes an order (admin_quote_convert flips is_quote), so the list only ever
// holds open quotes; the one stored status is da_gui_email ("Đã gửi").
import { defineListSpec, type ListState } from "@/features/portal-ui/lib/list-params";
import type { QuoteItem } from "./bundle";
import type { QuoteRow } from "./stored";

export const QUOTE_LIST_TYPES = ["bang_keo_in", "bang_keo", "truc_in", "thank_you"] as const;
export const QUOTE_TABS = ["chua_gui", "da_gui"] as const;
export type QuoteStatus = (typeof QUOTE_TABS)[number];
export const MONTHS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] as const;

export const QUOTES_SPEC = defineListSpec({
  sort: { keys: { thoi_gian: { column: "thoi_gian", firstDir: "desc" } }, default: { key: "thoi_gian", dir: "desc" } },
  search: { columns: ["id", "ten_hang", "ten_khach_hang"], maxLength: 80 },
  filters: {
    tab: { kind: "enum", column: "status", values: QUOTE_TABS },
    type: { kind: "enum", column: "type", values: QUOTE_LIST_TYPES },
    month: { kind: "enum", column: "thoi_gian", values: MONTHS },
  },
  pageSizes: [50],
});

export const quoteStatus = (row: QuoteRow): QuoteStatus => (row.da_gui_email === true ? "da_gui" : "chua_gui");

/** "1 size", "2 size · 4 trục". */
export function sizeSummary(items: readonly Pick<QuoteItem, "axes">[]): string {
  const axes = items.reduce((n, i) => n + i.axes.length, 0);
  const sizes = Math.max(1, items.length);
  return axes > 0 ? `${sizes} size · ${axes} trục` : `${sizes} size`;
}

/** Count per tab ("all" included) and the rows of the current tab. */
export function splitByTab<T extends { quote: QuoteRow }>(rows: readonly T[], state: Pick<ListState, "filters">) {
  const counts: Record<QuoteStatus | "all", number> = { all: rows.length, chua_gui: 0, da_gui: 0 };
  for (const r of rows) counts[quoteStatus(r.quote)]++;
  const tab = state.filters.tab?.[0] as QuoteStatus | undefined;
  return { counts, tab: tab ?? "all", shown: tab ? rows.filter((r) => quoteStatus(r.quote) === tab) : [...rows] };
}
