// URL-driven list of /admin/don-hang. Filtering, sorting and paging run in SQL (admin_orders_list,
// totals in admin_orders_totals); the spec only whitelists URL params. Filters follow the app's
// Thống kê (thongke.js:473-538): name, month, due / settled, from-to, delivered, CTV.
import { defineListSpec, type ListState } from "@/features/portal-ui/lib/list-params";
import { addDays, vnToday } from "@/features/workshop/lib/dates";
import { BOARD_STEPS } from "@/features/workshop/lib/steps";
import { ORDER_TYPES, type OrderType } from "./types";

/** Tabs: the 4 order types, app quotes (every type, is_quote) and every order type together (the
 *  overview KPIs count all 4 tables). Printed tape has no URL value. */
export const ORDER_TABS = [...ORDER_TYPES, "quote", "all"] as const;
export type OrderTab = (typeof ORDER_TABS)[number];
/** Tabs shown on the list, in the app's order. Quotes move to /admin/bao-gia; ?type=quote still works. */
export const LIST_TABS = ["bang_keo_in", "truc_in", "bang_keo", "thank_you", "all"] as const satisfies readonly OrderTab[];
export const MONTHS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] as const;

/** Sort keys are the admin_orders_list sort names. */
const desc = { firstDir: "desc" } as const;
export const ORDERS_SPEC = defineListSpec({
  sort: {
    keys: {
      thoi_gian: { column: "thoi_gian", ...desc }, ngay_du_kien: { column: "ngay_du_kien" }, id: { column: "id", ...desc },
      ten_hang: { column: "ten_hang" }, ten_khach_hang: { column: "ten_khach_hang" }, so_luong: { column: "so_luong", ...desc },
      tong_tien: { column: "tong_tien", ...desc }, cong_no_khach: { column: "cong_no_khach", ...desc },
      loi_nhuan_rong: { column: "loi_nhuan_rong", ...desc },
    },
    default: { key: "thoi_gian", dir: "desc" },
  },
  search: { columns: ["id", "ten_hang", "ten_khach_hang", "sdt_khach_hang"] },
  filters: {
    type: { kind: "enum", column: "type", values: ORDER_TABS },
    step: { kind: "enum", column: "step", values: [...BOARD_STEPS, "none"] },
    delivered: { kind: "bool", column: "da_giao" },
    settled: { kind: "bool", column: "da_tat_toan" },
    due: { kind: "enum", column: "ngay_du_kien", values: ["overdue", "soon"] },
    month: { kind: "enum", column: "thoi_gian", values: MONTHS },
    ctv: { kind: "text", column: "ctv", maxLength: 60 },
  },
  dateRange: { column: "thoi_gian", type: "date" },
  pageSizes: [25, 50, 100],
});

export function tabOf(state: ListState): OrderTab {
  return (state.filters.type?.[0] as OrderTab | undefined) ?? "bang_keo_in";
}

const bool = (v: string[] | undefined) => (v?.[0] === "1" ? true : v?.[0] === "0" ? false : undefined);

export type OrdersFilter = {
  q?: string; is_quote?: boolean; step?: string; delivered?: boolean; settled?: boolean; due?: string;
  date_from?: string; date_to?: string; ctv?: string; sort: string; dir: "asc" | "desc"; limit: number; offset: number;
};

/** "Tháng N" of the app: the most recent month N up to today (this year, or last year if N is later). */
export function monthRange(month: number, today: string): { from: string; to: string } {
  const y = Number(today.slice(0, 4)) - (month > Number(today.slice(5, 7)) ? 1 : 0);
  const mm = String(month).padStart(2, "0");
  const next = month === 12 ? `${y + 1}-01-01` : `${y}-${String(month + 1).padStart(2, "0")}-01`;
  return { from: `${y}-${mm}-01`, to: addDays(next, -1) };
}

/** From / to and the month together: the overlap (an empty overlap gives from > to = no rows). */
function dateBounds(state: ListState, today: string): { from: string | null; to: string | null } {
  const m = state.filters.month?.[0];
  if (!m) return { from: state.from, to: state.to };
  const r = monthRange(Number(m), today);
  return {
    from: state.from && state.from > r.from ? state.from : r.from,
    to: state.to && state.to < r.to ? state.to : r.to,
  };
}

/** List state -> admin_orders_list (p_type, p_filter): keys the SQL knows, nothing else. The CTV
 *  filter needs orders.money in SQL, so it is sent only when `money` is true. */
export function toOrdersQuery(state: ListState, opts: { today?: string; money?: boolean } = {}): { type: OrderType | "all"; filter: OrdersFilter } {
  const tab = tabOf(state);
  const quote = tab === "quote";
  const f = state.filters;
  const { from, to } = dateBounds(state, opts.today ?? vnToday());
  return {
    type: quote ? "all" : tab,
    filter: {
      ...(state.q ? { q: state.q } : {}),
      ...(quote ? { is_quote: true } : {}),
      // Only printed tape goes to the workshop; quotes are never delivered or settled.
      ...(tab === "bang_keo_in" && f.step?.[0] ? { step: f.step[0] } : {}),
      ...(!quote && bool(f.delivered) !== undefined ? { delivered: bool(f.delivered) } : {}),
      ...(!quote && bool(f.settled) !== undefined ? { settled: bool(f.settled) } : {}),
      ...(!quote && f.due?.[0] ? { due: f.due[0] } : {}),
      ...(from ? { date_from: from } : {}),
      ...(to ? { date_to: to } : {}),
      ...(opts.money && f.ctv?.[0] ? { ctv: f.ctv[0] } : {}),
      sort: state.sort,
      dir: state.dir,
      limit: state.pageSize,
      offset: (state.page - 1) * state.pageSize,
    },
  };
}

export type DueTone = "overdue" | "soon" | null;

/** Same rule as admin_orders_list: undelivered and due before today / within 3 days. */
export function dueTone(due: string | null, delivered: boolean, isQuote: boolean, today: string): DueTone {
  if (!due || delivered || isQuote) return null;
  const d = due.slice(0, 10);
  if (d < today) return "overdue";
  return d <= addDays(today, 3) ? "soon" : null;
}
