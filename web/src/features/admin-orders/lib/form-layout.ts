// Field order of the order form, card by card, as in the app (electron/index.html: "Thông tin cơ bản",
// "Thông tin Trục mới", "Giá và Chi phí"). `calc` = read-only computed value (form-totals formCalc).
// The basic card's customer fields (tên hàng, ngày giao, khách, SĐT, địa chỉ) are drawn by the form.
import type { FieldKey } from "./copy";
import type { OrderType } from "./types";

export type FieldKind = "text" | "num" | "pct" | "money" | "calc" | "area";
export type FieldSpec = readonly [FieldKey, FieldKind, number?];

/** Basic card, after the customer fields (the printed-tape axis switch comes last). */
export const BASIC_FIELDS: Readonly<Record<OrderType, readonly FieldSpec[]>> = {
  bang_keo_in: [["quy_cach_mm", "num"], ["quy_cach_m", "num"], ["quy_cach_mic", "num"], ["cuon_cay", "num"]],
  bang_keo: [["quy_cach", "text", 255], ["so_luong", "num"], ["mau_sac", "text", 100]],
  truc_in: [["quy_cach", "text", 255], ["so_luong", "num"], ["mau_sac", "text", 100], ["mau_keo", "text", 100]],
  thank_you: [["kich_thuoc", "text", 255], ["so_luong", "num"], ["mau_sac", "text", 100], ["ghi_chu", "area", 2000]],
};

const tail: readonly FieldSpec[] = [
  ["ctv", "text", 255], ["hoa_hong", "pct"], ["tien_hoa_hong", "calc"], ["loi_nhuan", "calc"], ["tien_ship", "money"], ["loi_nhuan_rong", "calc"],
];

export const PRICE_FIELDS: Readonly<Record<OrderType, readonly FieldSpec[]>> = {
  bang_keo_in: [
    ["so_luong", "num"], ["phi_sl", "money"], ["mau_keo", "text", 100], ["phi_keo", "money"], ["mau_sac", "text", 100],
    ["phi_mau", "money"], ["phi_size", "money"], ["phi_cat", "money"], ["don_gia_von", "money"], ["don_gia_ban", "money"],
    ["don_gia_goc", "calc"], ["thanh_tien_ban", "calc"], ["thanh_tien_goc", "calc"], ["tien_coc", "money"],
    ["vat_percent", "pct"], ["vat", "calc"], ["cong_no_khach", "calc"], ["tien_ship", "money"], ["ctv", "text", 255],
    ["hoa_hong", "pct"], ["tien_hoa_hong", "calc"], ["loi_nhuan", "calc"], ["loi_giay", "text", 255],
    ["thung_bao", "text", 255], ["loi_nhuan_rong", "calc"],
  ],
  bang_keo: [
    ["don_gia_goc", "money"], ["thanh_tien", "calc"], ["don_gia_ban", "money"], ["thanh_tien_ban", "calc"],
    ["vat_percent", "pct"], ["vat", "calc"], ["cong_no_khach", "calc"], ...tail,
  ],
  truc_in: [
    ["don_gia_goc", "money"], ["thanh_tien_goc", "calc"], ["don_gia_ban", "money"], ["thanh_tien_ban", "calc"],
    ["cong_no_khach", "calc"], ["vat_percent", "pct"], ["vat", "calc"], ...tail,
  ],
  thank_you: [
    ["don_gia_von", "money"], ["thanh_tien_von", "calc"], ["don_gia_ban", "money"], ["thanh_tien_ban", "calc"],
    ["vat_percent", "pct"], ["vat", "calc"], ["tien_coc", "money"], ["cong_no_khach", "calc"], ...tail,
  ],
};

export const AXIS_FIELDS: readonly FieldSpec[] = [
  ["ten_truc", "text", 255], ["truc_chu_vi", "num"], ["truc_so_luong", "num"], ["truc_gia_goc", "money"], ["truc_gia_ban", "money"],
  ["truc_vat_percent", "pct"], ["truc_vat", "calc"], ["truc_thanh_tien_goc", "calc"], ["truc_thanh_tien_ban", "calc"],
  ["truc_ctv", "text", 255], ["truc_hoa_hong", "pct"], ["truc_tien_hoa_hong", "calc"], ["truc_loi_nhuan", "calc"],
  ["truc_loi_nhuan_rong", "calc"],
];

export const AXIS_REQUIRED: ReadonlySet<FieldKey> = new Set(["ten_truc", "truc_so_luong", "truc_gia_goc", "truc_gia_ban"]);

export function requiredFor(type: OrderType): ReadonlySet<FieldKey> {
  const base: FieldKey[] = ["ten_hang", "ten_khach_hang", "ngay_du_kien", "so_luong", "don_gia_ban"];
  if (type === "bang_keo_in") base.push("quy_cach_m", "cuon_cay");
  if (type === "bang_keo" || type === "truc_in") base.push("don_gia_goc");
  return new Set(base);
}

/** Hidden without orders.money (the RPCs return them as null): costs, fees, ship, CTV, commission,
 *  profit. A required cost input (don_gia_goc of plain tape / axis, truc_gia_goc) stays: SQL needs it. */
const MONEY_ONLY: ReadonlySet<FieldKey> = new Set([
  "phi_sl", "phi_keo", "phi_mau", "phi_size", "phi_cat", "don_gia_von", "thanh_tien_goc", "thanh_tien", "thanh_tien_von",
  "tien_ship", "ctv", "hoa_hong", "tien_hoa_hong", "loi_nhuan", "loi_nhuan_rong", "truc_thanh_tien_goc", "truc_ctv",
  "truc_hoa_hong", "truc_tien_hoa_hong", "truc_loi_nhuan", "truc_loi_nhuan_rong",
]);

export function visibleFields(specs: readonly FieldSpec[], money: boolean): readonly FieldSpec[] {
  if (money) return specs;
  // The printed-tape unit cost (calc don_gia_goc) is a cost too; plain tape's don_gia_goc input is required.
  return specs.filter(([key, kind]) => !MONEY_ONLY.has(key) && !(kind === "calc" && key === "don_gia_goc"));
}
