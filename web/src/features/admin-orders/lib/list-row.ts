// Pure display rules of one list row: the single "Trạng thái" column and the "└ TRỤC" child line
// (app thongke.js:223-267, 335-361). Tones follow the app badges: success green, warning amber, gray.
import { getDictionary } from "@/i18n";
import { STEP_TONE, type Tone } from "@/features/portal-ui/lib/status-tones";
import { ordersCopy as c } from "./copy";
import type { AdminOrderRow } from "./types";

const t = getDictionary();

export type RowBadge = { label: string; tone: Tone };

type StatusRow = Pick<AdminOrderRow, "type" | "is_quote" | "da_giao" | "da_gui_email" | "job_id" | "step">;

/** One badge per row: Báo giá, else Đã giao, else the workshop step (printed tape) or Chưa giao;
 *  "· Đã email" is appended to the label when the email went out. */
export function statusBadges(o: StatusRow): RowBadge[] {
  if (o.is_quote) return [{ label: c.quoteBadge, tone: "yellow" }];
  const b: RowBadge = o.da_giao ? { label: c.delivered, tone: "green" }
    : o.type !== "bang_keo_in" ? { label: c.notDelivered, tone: "grey" }
    : o.job_id && o.step ? { label: t.productionStep[o.step], tone: STEP_TONE[o.step] }
    : { label: c.noJob, tone: "grey" };
  return [o.da_gui_email ? { ...b, label: `${b.label} · ${c.emailed}` } : b];
}

type AxisRow = Pick<AdminOrderRow, "loai_truc" | "ten_truc" | "truc_chu_vi" | "truc_so_luong" | "truc_thanh_tien_ban" |
  "truc_ctv" | "truc_hoa_hong" | "truc_tien_hoa_hong" | "truc_loi_nhuan_rong">;

export type AxisLine = {
  name: string; meta: string; total: number;
  /** Cost side: null without orders.money (the RPC returns null). */
  ctv: string | null; commission: { pct: number; amount: number } | null; netProfit: number | null;
};

const num = (v: unknown) => Number(v ?? 0);

/** Child line of a printed-tape order with a new axis; null otherwise. */
export function axisLine(o: AxisRow, money: boolean): AxisLine | null {
  if (o.loai_truc !== "moi") return null;
  const parts = [o.truc_chu_vi != null ? `${c.axisCircumference} ${num(o.truc_chu_vi)}` : null, `${num(o.truc_so_luong)} ${c.axisUnit}`];
  return {
    name: o.ten_truc?.trim() || c.axisDefaultName,
    meta: parts.filter(Boolean).join(" • "),
    total: num(o.truc_thanh_tien_ban),
    ctv: money ? o.truc_ctv?.trim() || "" : null,
    commission: money && o.truc_hoa_hong != null ? { pct: num(o.truc_hoa_hong), amount: num(o.truc_tien_hoa_hong) } : null,
    netProfit: money && o.truc_loi_nhuan_rong != null ? num(o.truc_loi_nhuan_rong) : null,
  };
}

/** "Tổng CN" of the selection: what customers still owe (settled orders count 0). */
export function selectedDebt(rows: readonly Pick<AdminOrderRow, "cong_no_khach" | "da_tat_toan">[]): number {
  return rows.reduce((s, o) => s + (o.da_tat_toan ? 0 : num(o.cong_no_khach)), 0);
}
