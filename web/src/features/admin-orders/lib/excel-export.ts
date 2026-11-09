// Order rows -> Excel rows (array of arrays), like the app's Thống kê export (thongke.js:28-79, 898-1104):
// the per-type detail columns (statsDetailColumnsMap), flags as Rồi / Xong / Chưa, money rounded, then
// VAT (%), Thành Tiền Gồm VAT, Chu Vi Trục, Ghi Chú. Under each printed-tape order one "↳" row per axis
// (quote_items axes while their totals match the row, else the row's own trục columns). Rows are full
// order rows (admin_orders_rows, money hidden without orders.money); cost columns only with money.
// Pure: the component writes the file.
import { dateVn } from "./format";
import { money as round, vatPercentFromAmount } from "./order-math";
import type { OrderType } from "./types";

type Cell = string | number;
export type ExportRow = Record<string, unknown> & { id: string };

const HEADER: Record<string, string> = {
  id: "Mã Đơn Hàng", thoi_gian: "Ngày Tạo", ten_hang: "Tên Hàng", ten_khach_hang: "Khách Hàng",
  sdt_khach_hang: "SĐT Khách", dia_chi_khach_hang: "Địa Chỉ Giao", ngay_du_kien: "Ngày Giao", quy_cach: "Quy Cách",
  quy_cach_mm: "Quy Cách (mm)", quy_cach_m: "Quy Cách (m)", quy_cach_mic: "Quy Cách (mic)", cuon_cay: "Cuộn/Cây",
  so_luong: "Số Lượng", phi_sl: "Phí SL", mau_keo: "Màu Keo", phi_keo: "Phí Keo", mau_sac: "Màu Sắc", phi_mau: "Phí Màu",
  phi_size: "Phí Size", phi_cat: "Phí Cắt", don_gia_von: "Giá Vốn", don_gia_goc: "Giá Gốc", thanh_tien_goc: "Tiền Gốc",
  don_gia_ban: "Giá Bán", thanh_tien_ban: "Tiền Bán", tien_coc: "Tiền Cọc", cong_no_khach: "Công Nợ Khách",
  cong_no_ncc: "Nợ NCC", ctv: "CTV", hoa_hong: "Hoa Hồng (%)", tien_hoa_hong: "Tiền H.Hồng", loi_giay: "Lõi Giấy",
  thung_bao: "Thùng Bao", loi_nhuan: "Lợi Nhuận", tien_ship: "Tiền Ship", loi_nhuan_rong: "Lợi Nhuận Ròng", vat: "VAT",
  da_giao: "Đã Giao", da_tat_toan: "Đã Tất Toán", thanh_tien: "Thành Tiền", loai_truc: "Loại Trục",
  da_gui_email: "Đã Email", kich_thuoc: "Kích Thước", thanh_tien_von: "Tiền Vốn", ghi_chu: "Ghi Chú",
};

const HEAD = ["id", "thoi_gian", "ten_hang", "ten_khach_hang", "sdt_khach_hang", "dia_chi_khach_hang", "ngay_du_kien"];
const TAIL = ["cong_no_khach", "cong_no_ncc", "ctv", "hoa_hong", "tien_hoa_hong", "loi_nhuan", "tien_ship", "loi_nhuan_rong", "vat"];
const FLAGS = ["da_giao", "da_tat_toan", "da_gui_email"];

/** statsDetailColumnsMap without the printed-tape truc_* columns (the "↳" rows carry them). */
const COLUMNS: Record<OrderType, readonly string[]> = {
  bang_keo_in: [...HEAD, "quy_cach_mm", "quy_cach_m", "quy_cach_mic", "cuon_cay", "so_luong", "phi_sl", "mau_keo", "phi_keo",
    "mau_sac", "phi_mau", "phi_size", "phi_cat", "don_gia_von", "don_gia_goc", "thanh_tien_goc", "don_gia_ban", "thanh_tien_ban",
    "tien_coc", "cong_no_khach", "cong_no_ncc", "ctv", "hoa_hong", "tien_hoa_hong", "loi_giay", "thung_bao", "loai_truc",
    "loi_nhuan", "tien_ship", "loi_nhuan_rong", "vat", ...FLAGS],
  truc_in: [...HEAD, "quy_cach", "so_luong", "mau_sac", "mau_keo", "don_gia_goc", "thanh_tien_goc", "don_gia_ban", "thanh_tien_ban",
    ...TAIL, ...FLAGS],
  bang_keo: [...HEAD, "quy_cach", "so_luong", "mau_sac", "don_gia_goc", "thanh_tien", "don_gia_ban", "thanh_tien_ban", ...TAIL, ...FLAGS],
  thank_you: [...HEAD, "kich_thuoc", "so_luong", "mau_sac", "don_gia_von", "thanh_tien_von", "don_gia_ban", "thanh_tien_ban",
    "tien_coc", ...TAIL, "ghi_chu", ...FLAGS],
};

/** Hidden without orders.money (order_hide_money returns them as null). */
const MONEY_ONLY = new Set(["phi_sl", "phi_keo", "phi_mau", "phi_size", "phi_cat", "don_gia_von", "don_gia_goc", "thanh_tien_goc",
  "thanh_tien", "thanh_tien_von", "cong_no_ncc", "ctv", "hoa_hong", "tien_hoa_hong", "loi_nhuan", "tien_ship", "loi_nhuan_rong"]);
const CURRENCY = new Set([...MONEY_ONLY, "don_gia_ban", "thanh_tien_ban", "tien_coc", "cong_no_khach", "vat"]);
const NUMBER = new Set(["so_luong", "hoa_hong", "quy_cach_mm", "quy_cach_m", "quy_cach_mic", "cuon_cay"]);
const EXTRA = ["VAT (%)", "Thành Tiền Gồm VAT", "Chu Vi Trục", "Ghi Chú"];

const columnsOf = (type: OrderType, money: boolean) => COLUMNS[type].filter((k) => money || !MONEY_ONLY.has(k));
const num = (v: unknown) => Number(v ?? 0) || 0;
const blank = (v: unknown) => v === null || v === undefined || v === "";

/** Header row of one order type. */
export function exportHeaders(type: OrderType, money: boolean): string[] {
  return [...new Set([...columnsOf(type, money).map((k) => HEADER[k]!), ...EXTRA])];
}

function cell(key: string, v: unknown): Cell {
  if (key === "thoi_gian" || key === "ngay_du_kien") return blank(v) ? "" : dateVn(v);
  if (FLAGS.includes(key)) return v === true ? (key === "da_tat_toan" ? "Xong" : "Rồi") : "Chưa";
  if (CURRENCY.has(key)) return blank(v) ? "" : round(v as number);
  if (NUMBER.has(key)) return blank(v) ? "" : num(v);
  return blank(v) ? "" : (v as Cell);
}

function orderCells(o: ExportRow, type: OrderType, money: boolean): Record<string, Cell> {
  const out: Record<string, Cell> = {};
  for (const k of columnsOf(type, money)) out[HEADER[k]!] = cell(k, o[k]);
  const total = Math.max(0, round(o.thanh_tien_ban as number));
  const vat = Math.max(0, round(o.vat as number));
  if ("VAT" in out) out.VAT = vat;
  out["VAT (%)"] = vatPercentFromAmount(vat, total, o.vat_percent as number);
  out["Thành Tiền Gồm VAT"] = total + vat;
  out["Chu Vi Trục"] = "";
  // The app blanks Ghi Chú here (also Thank you's own note); the web keeps the Thank you note.
  out["Ghi Chú"] = type === "thank_you" ? cell("ghi_chu", o.ghi_chu) : "";
  return out;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);

/** quote_items axes, or [] when they no longer match the row's trục totals (bkiQuoteAxesMatchOrder). */
function quoteAxes(o: ExportRow): Obj[] {
  let items = o.quote_items;
  if (typeof items === "string") try { items = JSON.parse(items); } catch { items = []; }
  const axes = (Array.isArray(items) ? items.filter(isObj) : []).flatMap((i) => (Array.isArray(i.axes) ? i.axes.filter(isObj) : []));
  if (!axes.length || blank(o.truc_thanh_tien_ban)) return axes;
  if (o.loai_truc !== "moi") return [];
  const sale = axes.reduce((s, a) => s + Math.max(0, round((a.total ?? num(a.quantity) * num(a.unitPrice)) as number)), 0);
  const vat = axes.reduce((s, a) => s + Math.max(0, round(a.vat as number)), 0);
  return sale === Math.max(0, round(o.truc_thanh_tien_ban as number)) && vat === Math.max(0, round(o.truc_vat as number)) ? axes : [];
}

/** buildBkiAxisExcelRows + buildBkiAxisInlineExcelRow, cost side only with money. */
function axisCells(o: ExportRow, money: boolean): Record<string, Cell>[] {
  const fromRow = { name: o.ten_truc, circumference: o.truc_chu_vi, quantity: o.truc_so_luong, costPrice: o.truc_gia_goc,
    unitPrice: o.truc_gia_ban, costTotal: o.truc_thanh_tien_goc, total: o.truc_thanh_tien_ban, vat: o.truc_vat,
    vatPercent: o.truc_vat_percent, collaborator: o.truc_ctv, commissionPercent: o.truc_hoa_hong,
    commission: o.truc_tien_hoa_hong, profit: o.truc_loi_nhuan, netProfit: o.truc_loi_nhuan_rong };
  const stored = quoteAxes(o);
  const axes = stored.length ? stored : o.loai_truc === "moi" ? [fromRow] : [];
  return axes.map((a) => {
    const qty = num(a.quantity);
    const price = num(a.unitPrice);
    const cost = num(a.costPrice ?? (qty > 0 ? num(a.costTotal) / qty : 0));
    const total = Math.max(0, round((a.total ?? qty * price) as number));
    const vat = Math.max(0, round((a.vat ?? (total * num(a.vatPercent)) / 100) as number));
    const pct = vatPercentFromAmount(vat, total, a.vatPercent as number);
    const row: Record<string, Cell> = {
      "Mã Đơn Hàng": `↳ ${o.id}`, "Ngày Tạo": cell("thoi_gian", o.thoi_gian), "Tên Hàng": `↳ Trục kèm BKI: ${String(a.name ?? "")}`,
      "Khách Hàng": cell("ten_khach_hang", o.ten_khach_hang), "Loại Trục": "Trục kèm BKI",
      "Chu Vi Trục": blank(a.circumference) ? "" : num(a.circumference), "Số Lượng": qty, "Giá Bán": price, VAT: vat,
      "VAT (%)": pct, "Thành Tiền Gồm VAT": total + vat, "Tiền Bán": total,
      "Ghi Chú": `VAT ${pct}% · Giá gồm VAT ${new Intl.NumberFormat("vi-VN").format(total + vat)}đ`,
    };
    if (money) Object.assign(row, {
      "Giá Gốc": cost, "Tiền Gốc": Math.max(0, round((a.costTotal ?? qty * cost) as number)), CTV: String(a.collaborator ?? ""),
      "Hoa Hồng (%)": num(a.commissionPercent), "Tiền H.Hồng": num(a.commission), "Lợi Nhuận": num(a.profit),
      "Lợi Nhuận Ròng": num(a.netProfit),
    });
    return row;
  });
}

/** One sheet of one order type: header row, then each order and its "↳" axis rows. */
export function exportAoa(rows: readonly ExportRow[], type: OrderType, money: boolean): Cell[][] {
  const headers = exportHeaders(type, money);
  const out: Cell[][] = [headers];
  for (const o of rows) {
    for (const r of [orderCells(o, type, money), ...(type === "bang_keo_in" ? axisCells(o, money) : [])]) {
      out.push(headers.map((h) => r[h] ?? ""));
    }
  }
  return out;
}

/** Column widths: Tên Hàng 42, others max(16, header + 2) (app). */
export function columnWidths(headers: readonly string[]): { wch: number }[] {
  return headers.map((h) => ({ wch: h === "Tên Hàng" ? 42 : Math.max(16, h.length + 2) }));
}
