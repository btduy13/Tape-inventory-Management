// Quote form layout of the app (electron/index.html quote forms, quotations.js quoteEntryGroupConfigs /
// quoteAxisEntryGroups / restructureQuoteForm): "Kê khai" input groups, then the read-only "Kết quả
// tính toán". The payload keys (schema.ts SIZE_KEYS / AXIS_KEYS) are derived from the input groups.
import type { FieldKey } from "@/features/admin-orders/lib/copy";
import type { QuoteType } from "./bundle";

export type InputGroup = {
  title: string;
  description: string;
  keys: readonly FieldKey[];
  /** Printed tape: the "Loại trục" switch closes the group (UI only, axes decide loai_truc in SQL). */
  axisSwitch?: true;
};

const COLLABORATOR: InputGroup = { title: "Cộng tác viên", description: "Người giới thiệu và tỷ lệ hoa hồng.", keys: ["ctv", "hoa_hong"] };

export const SIZE_GROUPS: Readonly<Record<QuoteType, readonly InputGroup[]>> = {
  bang_keo_in: [
    { title: "Quy cách & trục in", description: "Kích thước cuộn và loại trục sử dụng.", keys: ["quy_cach_mm", "quy_cach_m", "quy_cach_mic", "cuon_cay"], axisSwitch: true },
    { title: "Sản lượng & thành phẩm", description: "Số lượng, màu in, lõi và bao bì.", keys: ["so_luong", "mau_keo", "mau_sac", "loi_giay", "thung_bao"] },
    { title: "Giá bán & phụ phí", description: "Chi phí cấu thành và đơn giá áp dụng.", keys: ["phi_sl", "phi_keo", "phi_mau", "phi_size", "phi_cat", "don_gia_von", "don_gia_ban"] },
    { title: "Thanh toán & cộng tác", description: "Cọc, VAT, vận chuyển và hoa hồng.", keys: ["tien_coc", "vat_percent", "tien_ship", "ctv", "hoa_hong"] },
  ],
  bang_keo: [
    { title: "Quy cách & sản lượng", description: "Thông số của mặt hàng đang báo giá.", keys: ["quy_cach", "so_luong", "mau_sac"] },
    { title: "Giá & thanh toán", description: "Giá mua, giá bán, VAT và vận chuyển.", keys: ["don_gia_goc", "don_gia_ban", "vat_percent", "tien_ship"] },
    COLLABORATOR,
  ],
  truc_in: [
    { title: "Quy cách & sản lượng", description: "Kích thước, số lượng và màu trục.", keys: ["quy_cach", "so_luong", "mau_sac", "mau_keo"] },
    { title: "Giá & thanh toán", description: "Giá gia công, giá bán, VAT và vận chuyển.", keys: ["don_gia_goc", "don_gia_ban", "vat_percent", "tien_ship"] },
    COLLABORATOR,
  ],
};

/** Read-only results of a size, in the app's order. Bang keo's cost total column is `thanh_tien`. */
export const SIZE_RESULTS: Readonly<Record<QuoteType, readonly FieldKey[]>> = {
  bang_keo_in: ["don_gia_goc", "thanh_tien_ban", "thanh_tien_goc", "cong_no_khach", "tien_hoa_hong", "loi_nhuan", "loi_nhuan_rong"],
  bang_keo: ["thanh_tien", "thanh_tien_ban", "cong_no_khach", "tien_hoa_hong", "loi_nhuan", "loi_nhuan_rong"],
  truc_in: ["thanh_tien_goc", "thanh_tien_ban", "cong_no_khach", "tien_hoa_hong", "loi_nhuan", "loi_nhuan_rong"],
};

/** Required marks of the app's quote forms. */
export const SIZE_REQUIRED: Readonly<Record<QuoteType, ReadonlySet<string>>> = {
  bang_keo_in: new Set(["so_luong", "don_gia_ban"]),
  bang_keo: new Set(["so_luong", "don_gia_goc", "don_gia_ban"]),
  truc_in: new Set(["so_luong", "don_gia_goc", "don_gia_ban"]),
};

export const AXIS_GROUPS: readonly InputGroup[] = [
  { title: "Thông số trục", description: "Tên, chu vi và số lượng trục.", keys: ["ten_truc", "truc_chu_vi", "truc_so_luong"] },
  { title: "Giá & VAT trục", description: "Giá vốn, giá bán và VAT riêng của trục.", keys: ["truc_gia_goc", "truc_gia_ban", "truc_vat_percent"] },
  { title: "Hoa hồng trục", description: "CTV và tỷ lệ hoa hồng của trục.", keys: ["truc_ctv", "truc_hoa_hong"] },
];

export const AXIS_RESULTS: readonly FieldKey[] = ["truc_thanh_tien_goc", "truc_thanh_tien_ban", "truc_tien_hoa_hong", "truc_loi_nhuan", "truc_loi_nhuan_rong"];
