// Excel template + import of the app (excelImport.js): printed tape, plain tape and print axis only.
// Pure: sheet rows (array of arrays) <-> order form strings. The server action validates each row with
// the form schema (schemas.ts) and the RPC recomputes money, exactly like a form save.
import { addDays } from "@/features/workshop/lib/dates";
import { parseMoney } from "./form-money";
import { money, number, percent } from "./order-math";
import type { OrderType } from "./types";

export const IMPORT_TYPES = ["bang_keo_in", "truc_in", "bang_keo"] as const satisfies readonly OrderType[];
export type ImportType = (typeof IMPORT_TYPES)[number];
export const isImportType = (t: string): t is ImportType => (IMPORT_TYPES as readonly string[]).includes(t);

/** Template headers -> form field (excelImport.js:2-56). da_giao / da_tat_toan become flags. */
const BKI: readonly [string, string][] = [
  ["Tên hàng", "ten_hang"], ["Tên khách hàng", "ten_khach_hang"], ["Ngày dự kiến", "ngay_du_kien"],
  ["Quy cách (mm)", "quy_cach_mm"], ["Quy cách (m)", "quy_cach_m"], ["Quy cách (mic)", "quy_cach_mic"], ["Cuộn/Cây", "cuon_cay"],
  ["Số lượng", "so_luong"], ["Phí SL", "phi_sl"], ["Màu keo", "mau_keo"], ["Phí keo", "phi_keo"], ["Màu sắc", "mau_sac"],
  ["Phí màu", "phi_mau"], ["Phí size", "phi_size"], ["Phí cắt", "phi_cat"], ["Đơn giá vốn", "don_gia_von"],
  ["Đơn giá bán", "don_gia_ban"], ["Tiền cọc", "tien_coc"], ["CTV", "ctv"], ["Hoa hồng (%)", "hoa_hong"], ["Lõi giấy", "loi_giay"],
  ["Thùng/Bao", "thung_bao"], ["Tiền ship", "tien_ship"], ["Loại trục", "loai_truc"], ["Tên Trục", "ten_truc"],
  ["Chu vi Trục", "truc_chu_vi"], ["Số lượng Trục", "truc_so_luong"], ["Giá gốc Trục", "truc_gia_goc"],
  ["Giá bán Trục", "truc_gia_ban"], ["CTV Trục", "truc_ctv"], ["Hoa hồng Trục (%)", "truc_hoa_hong"], ["Đã giao", "da_giao"],
  ["Đã tất toán", "da_tat_toan"], ["VAT (%)", "vat_percent"], ["VAT Trục (%)", "truc_vat_percent"],
];
const TI: readonly [string, string][] = [
  ["Tên hàng", "ten_hang"], ["Tên khách hàng", "ten_khach_hang"], ["Ngày dự kiến", "ngay_du_kien"], ["Quy cách", "quy_cach"],
  ["Số lượng", "so_luong"], ["Màu sắc", "mau_sac"], ["Màu keo", "mau_keo"], ["Đơn giá gốc", "don_gia_goc"],
  ["Đơn giá bán", "don_gia_ban"], ["CTV", "ctv"], ["Hoa hồng (%)", "hoa_hong"], ["Tiền ship", "tien_ship"], ["Đã giao", "da_giao"],
  ["Đã tất toán", "da_tat_toan"], ["VAT (%)", "vat_percent"],
];
export const IMPORT_COLUMNS: Readonly<Record<ImportType, readonly [string, string][]>> = {
  bang_keo_in: BKI, truc_in: TI, bang_keo: TI.filter(([, k]) => k !== "mau_keo"),
};

/** Other headers people bring (export headers, contact columns). */
const ALIASES: Readonly<Record<string, string>> = {
  "khach hang": "ten_khach_hang", "ngay giao": "ngay_du_kien", "ngay giao du kien": "ngay_du_kien",
  "sdt": "sdt_khach_hang", "sdt khach": "sdt_khach_hang", "dia chi": "dia_chi_khach_hang", "dia chi giao": "dia_chi_khach_hang",
  "gia ban": "don_gia_ban", "gia goc": "don_gia_goc", "gia von": "don_gia_von", "cuon cay": "cuon_cay",
  // Old app files: VAT as an amount (excelImport.js FIELD_ALIASES); turned into a percent below.
  "vat": "vat", "tien vat": "vat", "vat truc": "truc_vat", "tien vat truc": "truc_vat", "vat tong percent": "vat_percent",
};

const SAMPLE: Readonly<Record<string, string | number>> = {
  ten_hang: "Băng keo in logo ABC", ten_khach_hang: "Công ty ABC", quy_cach: "48mm", quy_cach_mm: 48, quy_cach_m: 90,
  quy_cach_mic: 45, cuon_cay: 6, so_luong: 100, mau_keo: "Trong", mau_sac: "Đỏ", don_gia_von: 150000, don_gia_goc: 10000,
  don_gia_ban: 15000, ctv: "", hoa_hong: 0, tien_ship: 0, loai_truc: "Trục cũ", da_giao: "Chưa", da_tat_toan: "Chưa", vat_percent: 8,
};

/** Accent- and case-insensitive key: "Hoa hồng (%)" -> "hoa hong percent" ("%" kept, as the app's
 *  normalizeExcelKey: "VAT" is an amount, "VAT (%)" a rate). */
export function fold(s: unknown): string {
  return String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase()
    .replace(/%/g, " percent ").replace(/[^a-z0-9]+/g, " ").trim();
}

/** Template sheets: headers + one sample row, and a short guide. */
export function templateAoa(type: ImportType, today: string): { data: (string | number)[][]; guide: string[][] } {
  const cols = IMPORT_COLUMNS[type];
  return {
    data: [cols.map(([h]) => h), cols.map(([, k]) => (k === "ngay_du_kien" ? isoToVn(addDays(today, 1)) : SAMPLE[k] ?? ""))],
    guide: [
      ["Hướng dẫn"], ["Mỗi dòng là một đơn. Bắt buộc: Tên hàng, Tên khách hàng, Ngày dự kiến (dd/mm/yyyy), Số lượng, Đơn giá bán."],
      ["Đã giao / Đã tất toán: Rồi, Xong, Có, x hoặc 1 là có; để trống là chưa."],
      ["Loại trục (băng keo in): Trục cũ hoặc Trục mới. Trục mới cần Tên Trục, Số lượng Trục, Giá gốc Trục, Giá bán Trục."],
    ],
  };
}

const isoToVn = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

const TRUE_WORDS = new Set(["1", "true", "yes", "y", "x", "roi", "xong", "da giao", "da tat toan", "co"]);

/** Excel serial day, dd/mm/yy(yy) or yyyy-mm-dd -> yyyy-mm-dd; anything else as typed (the schema rejects it). */
export function toIsoDate(v: unknown): string {
  if (typeof v === "number" && v > 0) return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10);
  const s = String(v ?? "").trim();
  const vn = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(s);
  if (vn) return `${vn[3]!.length === 2 ? `20${vn[3]}` : vn[3]}-${vn[2]!.padStart(2, "0")}-${vn[1]!.padStart(2, "0")}`;
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : s;
}

/** "15.000" / "15,000" = 15000 (thousands), "1,5" / "0,500" = 1.5 / 0.5: app utils.parseCurrency (parseMoney). */
export function toNumberText(v: unknown): string {
  if (typeof v === "number") return String(v);
  const s = String(v ?? "").trim();
  const n = parseMoney(s);
  return n === null ? s : String(n);
}

const TEXT_KEYS = new Set(["ten_hang", "ten_khach_hang", "sdt_khach_hang", "dia_chi_khach_hang", "quy_cach", "mau_keo", "mau_sac",
  "ctv", "loi_giay", "thung_bao", "ten_truc", "truc_ctv"]);

export type ImportRow = { line: number; fields: Record<string, string>; delivered: boolean; settled: boolean };
export type ParsedSheet = { rows: ImportRow[]; detailLines: number[] };

/** A VAT amount column without a rate -> the rate, from quantity x unit price (excelImport.js importVat). */
function vatFromAmount(f: Record<string, string>, amount: string, rate: string, qty: string, price: string) {
  const vat = f[amount];
  delete f[amount];
  if (vat === undefined || f[rate] !== undefined) return;
  const subtotal = money(number(f[qty]) * number(f[price]));
  if (subtotal > 0) f[rate] = String(Math.round(percent((number(vat) / subtotal) * 100) * 100) / 100);
}

/** Sheet (first row = headers) -> form strings per order row. Blank rows are skipped; the app's "↳"
 *  detail rows (from an export) are reported by line number, never imported. A blank due date is
 *  tomorrow (`today` + 1), as in the app. */
export function parseImportSheet(type: ImportType, aoa: readonly (readonly unknown[])[], today: string): ParsedSheet {
  const byHeader = new Map<string, string>([...IMPORT_COLUMNS[type].map(([h, k]) => [fold(h), k] as const), ...Object.entries(ALIASES)]);
  const keys = (aoa[0] ?? []).map((h) => byHeader.get(fold(h)) ?? null);
  const rows: ImportRow[] = [];
  const detailLines: number[] = [];
  aoa.slice(1).forEach((cells, i) => {
    const line = i + 2;
    if (!cells.some((c) => String(c ?? "").trim() !== "")) return;
    if (cells.some((c) => String(c ?? "").trim().startsWith("↳")) || cells.some((c) => fold(c) === "truc kem bki")) {
      detailLines.push(line);
      return;
    }
    const row: ImportRow = { line, fields: {}, delivered: false, settled: false };
    keys.forEach((k, j) => {
      const v = cells[j];
      if (!k || v === undefined || v === null || String(v).trim() === "") return;
      if (k === "da_giao") row.delivered = TRUE_WORDS.has(fold(v));
      else if (k === "da_tat_toan") row.settled = TRUE_WORDS.has(fold(v));
      else if (k === "loai_truc") row.fields.loai_truc = fold(v).includes("moi") ? "moi" : "cu";
      else if (k === "ngay_du_kien") row.fields.ngay_du_kien = toIsoDate(v);
      else row.fields[k] = TEXT_KEYS.has(k) ? String(v).trim() : toNumberText(v);
    });
    row.fields.ngay_du_kien ??= addDays(today, 1);
    vatFromAmount(row.fields, "vat", "vat_percent", "so_luong", "don_gia_ban");
    vatFromAmount(row.fields, "truc_vat", "truc_vat_percent", "truc_so_luong", "truc_gia_ban");
    rows.push(row);
  });
  return { rows, detailLines };
}
