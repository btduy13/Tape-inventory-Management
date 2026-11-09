// Order picker filter of /admin/don-hang/xuat (app: Năm = this year..-5, Tháng, Loại, search).
import { ORDER_TYPES, type AdminOrderRow, type OrderType } from "@/features/admin-orders/lib/types";

export type PickerFilter = { year: number; month: number | null; type: OrderType | "all"; q: string };
export type PickerRow = Pick<AdminOrderRow, "type" | "id" | "thoi_gian" | "ten_hang" | "ten_khach_hang" | "so_luong" | "don_gia_ban">;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export const pickerYears = (now = new Date()) => Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

export function parsePickerFilter(sp: Record<string, string | string[] | undefined>, now = new Date()): PickerFilter {
  const thisYear = now.getFullYear();
  const year = Number(one(sp.year));
  const month = Number(one(sp.month));
  const type = one(sp.loai);
  return {
    year: Number.isInteger(year) && year >= thisYear - 5 && year <= thisYear ? year : thisYear,
    month: Number.isInteger(month) && month >= 1 && month <= 12 ? month : null,
    type: (ORDER_TYPES as readonly string[]).includes(type) ? (type as OrderType) : "all",
    q: one(sp.q).trim().slice(0, 100),
  };
}

