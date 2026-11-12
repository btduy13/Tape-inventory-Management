// Stored quote rows (to_jsonb of an order row, admin_quotes_list / admin_order_get) -> items for the
// tree and the print page, and -> size drafts for editing. Ports of quotations.js
// normalizeStoredQuoteItems, quoteListPriceSummary, legacyQuoteFields and utils.parseCurrency.
import { money, number, percent, vatPercentFromAmount } from "@/features/admin-orders/lib/order-math";
import { specification, type Fields, type QuoteAxis, type QuoteItem, type QuoteType, type SizeDraft } from "./bundle";

export type QuoteRow = Record<string, unknown>;

const pos = (v: unknown) => Math.max(0, money(v as number));

function parseItems(value: unknown): Record<string, unknown>[] {
  let items = value;
  if (typeof items === "string") {
    try {
      items = JSON.parse(items);
    } catch {
      items = [];
    }
  }
  return Array.isArray(items) ? items.filter((i) => i && typeof i === "object" && !Array.isArray(i)) : [];
}

/** quote_items, or one item made from the row columns (old quotes). */
export function normalizeItems(row: QuoteRow, type: string): QuoteItem[] {
  const stored = parseItems(row.quote_items);
  if (stored.length > 0) {
    return stored.map((i) => ({
      specification: String(i.specification || "-"),
      quantity: Math.max(0, number(i.quantity as number)),
      unitPrice: Math.max(0, number(i.unitPrice as number)),
      total: pos(number(i.total as number) || number(i.quantity as number) * number(i.unitPrice as number)),
      costTotal: pos(i.costTotal),
      vat: pos(i.vat),
      vatPercent: number(i.vatPercent as number) > 0 ? percent(i.vatPercent as number) : vatPercentFromAmount(i.vat as number, i.total as number),
      deposit: pos(i.deposit),
      shipping: i.shipping == null ? undefined : pos(i.shipping),
      axes: (Array.isArray(i.axes) ? i.axes : [])
        .filter((a): a is Record<string, unknown> => !!a && typeof a === "object")
        .map((a) => ({
          ...(a as unknown as QuoteAxis),
          name: String(a.name ?? ""),
          circumference: a.circumference == null || a.circumference === "" ? null : number(a.circumference as number),
          quantity: number(a.quantity as number), unitPrice: number(a.unitPrice as number),
          total: pos(a.total), costTotal: pos(a.costTotal), vat: pos(a.vat),
          vatPercent: number(a.vatPercent as number) > 0 ? percent(a.vatPercent as number) : vatPercentFromAmount(a.vat as number, a.total as number),
        })),
      details: (i.details as Record<string, unknown>) ?? {},
      fields: (i.fields as Record<string, unknown>) ?? {},
    }));
  }
  const axis = row.loai_truc === "moi";
  return [{
    specification: specification(type, row),
    quantity: Math.max(0, number(row.so_luong as number)),
    unitPrice: Math.max(0, number(row.don_gia_ban as number)),
    total: pos(row.thanh_tien_ban),
    costTotal: pos(row.thanh_tien_goc ?? row.thanh_tien),
    vat: pos(row.vat),
    vatPercent: percent(row.vat_percent as number),
    deposit: pos(row.tien_coc),
    axes: axis ? [{
      name: String(row.ten_truc || "Trục mới"), circumference: row.truc_chu_vi == null ? null : number(row.truc_chu_vi as number),
      quantity: number(row.truc_so_luong as number), unitPrice: number(row.truc_gia_ban as number),
      total: pos(row.truc_thanh_tien_ban), costTotal: pos(row.truc_thanh_tien_goc), vat: pos(row.truc_vat),
      vatPercent: percent(row.truc_vat_percent as number),
    }] : [],
    details: {},
    fields: {},
  }];
}

/** Parent row of the list: one size shows its own price, several the weighted average. */
export function listPriceSummary(row: QuoteRow, items: readonly QuoteItem[]) {
  if (items.length <= 1) {
    const item = items[0];
    return { multiple: false, quantity: item ? item.quantity : number(row.so_luong as number), unitPrice: item ? item.unitPrice : number(row.don_gia_ban as number) };
  }
  const quantity = items.reduce((s, i) => s + number(i.quantity), 0);
  const total = items.reduce((s, i) => s + number(i.total), 0);
  return { multiple: true, quantity, unitPrice: quantity > 0 ? money(total / quantity) : 0 };
}

/** Σ(item total + VAT) + Σ(axis total + VAT): "Thành tiền" of the parent row. */
export const grandTotal = (items: readonly QuoteItem[]) =>
  items.reduce((s, i) => s + i.total + i.vat + i.axes.reduce((x, a) => x + a.total + a.vat, 0), 0);

/** utils.parseCurrency: "1,500,000" / "1.234,5" / 12500 -> number. */
export function parseCurrency(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  let s = String(value).trim().replace(/[^\d,.-]/g, "");
  const negative = s.startsWith("-");
  s = s.replace(/-/g, "");
  const seps = (s.match(/[.,]/g) || []).length;
  if (seps > 1) {
    const last = Math.max(s.lastIndexOf("."), s.lastIndexOf(","));
    const fraction = s.slice(last + 1);
    s = /^\d{1,2}$/.test(fraction) ? `${s.slice(0, last).replace(/[.,]/g, "")}.${fraction}` : s.replace(/[.,]/g, "");
  } else if (seps === 1) {
    const [int = "", fraction = ""] = s.split(/[.,]/);
    const thousands = /^\d{3}$/.test(fraction) && /^\d{1,3}$/.test(int) && !/^0+$/.test(int);
    s = thousands ? int + fraction : `${int || "0"}.${fraction}`;
  }
  if (!/\d/.test(s)) return 0;
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return negative && n !== 0 ? -n : n;
}

/** Desktop form keys of item.fields -> order columns. Money keys go through parseCurrency. */
const APP_KEYS: Readonly<Record<string, [string, boolean]>> = {
  "qc-mm": ["quy_cach_mm", false], "qc-m": ["quy_cach_m", false], "qc-mic": ["quy_cach_mic", false],
  "cuon-cay": ["cuon_cay", false], "so-luong": ["so_luong", false], "don-gia-ban": ["don_gia_ban", true],
  "mau-keo": ["mau_keo", false], "mau-sac": ["mau_sac", false], "loi-giay": ["loi_giay", false],
  "thung-bao": ["thung_bao", false], "don-gia-von": ["don_gia_von", true], "phi-sl": ["phi_sl", true],
  "phi-keo": ["phi_keo", true], "phi-mau": ["phi_mau", true], "phi-size": ["phi_size", true],
  "phi-cat": ["phi_cat", true], vat: ["vat_percent", false], "tien-coc": ["tien_coc", true],
  "tien-ship": ["tien_ship", true], ctv: ["ctv", false], "hoa-hong-percent": ["hoa_hong", false],
  "quy-cach": ["quy_cach", false], "don-gia-goc": ["don_gia_goc", true],
};

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

/** quotations.js loadQuoteIntoEditor: legacyQuoteFields(...) overridden by item.fields. */
export function draftsFromQuote(type: QuoteType, row: QuoteRow): SizeDraft[] {
  return normalizeItems(row, type).map((item, index) => {
    const shared: QuoteRow = index === 0 ? row : {};
    const d = (item.details ?? {}) as Record<string, unknown>;
    const fields: Fields = type === "bang_keo_in"
      ? {
          quy_cach_mm: str(d.mm ?? shared.quy_cach_mm), quy_cach_m: str(d.m ?? shared.quy_cach_m),
          quy_cach_mic: str(d.mic ?? shared.quy_cach_mic), cuon_cay: str(d.rollsPerTree ?? shared.cuon_cay),
          so_luong: str(item.quantity), don_gia_ban: str(item.unitPrice),
          mau_keo: str(d.glueColor ?? shared.mau_keo), mau_sac: str(d.printColor ?? shared.mau_sac),
          loi_giay: str(d.paperCore ?? shared.loi_giay), thung_bao: str(d.packaging ?? shared.thung_bao),
          don_gia_von: str(shared.don_gia_von ?? ""), phi_sl: str(shared.phi_sl ?? ""), phi_keo: str(shared.phi_keo ?? ""),
          phi_mau: str(shared.phi_mau ?? ""), phi_size: str(shared.phi_size ?? ""), phi_cat: str(shared.phi_cat ?? ""),
          vat_percent: str(vatPercentFromAmount(item.vat, item.total, item.vatPercent)), tien_coc: str(item.deposit),
          tien_ship: str(item.shipping ?? shared.tien_ship ?? ""), ctv: str(shared.ctv), hoa_hong: str(shared.hoa_hong ?? ""),
          loai_truc: item.axes.length ? "moi" : "cu", // quoteFieldsWithStoredAxes
        }
      : {
          quy_cach: item.specification === "-" ? "" : item.specification, so_luong: str(item.quantity),
          mau_sac: str(d.color ?? shared.mau_sac), mau_keo: str(d.glueColor ?? shared.mau_keo),
          don_gia_goc: str(item.quantity > 0 && item.costTotal ? item.costTotal / item.quantity : shared.don_gia_goc ?? ""),
          don_gia_ban: str(item.unitPrice), vat_percent: str(vatPercentFromAmount(item.vat, item.total, item.vatPercent)),
          tien_ship: str(item.shipping ?? shared.tien_ship ?? ""), ctv: str(shared.ctv), hoa_hong: str(shared.hoa_hong ?? ""),
        };
    for (const [key, value] of Object.entries(item.fields ?? {})) {
      const map = APP_KEYS[key];
      if (map && value !== undefined && value !== null) fields[map[0]] = map[1] ? str(parseCurrency(value)) : str(value);
    }
    if (type !== "bang_keo_in") delete fields.tien_coc;
    const axes = item.axes.map((a) => ({
      ten_truc: a.name, truc_chu_vi: str(a.circumference ?? ""), truc_so_luong: str(a.quantity),
      truc_gia_goc: str(a.costPrice ?? ""), truc_gia_ban: str(a.unitPrice), truc_vat_percent: str(a.vatPercent),
      truc_ctv: str(a.collaborator ?? ""), truc_hoa_hong: str(a.commissionPercent ?? ""),
    }));
    return { fields, axes };
  });
}

/** "Tháng N" filter = the latest occurrence of that month (not after the current month). [from, to] ISO dates. */
export function monthRange(month: number, now = new Date()): [string, string] {
  const year = month <= now.getMonth() + 1 ? now.getFullYear() : now.getFullYear() - 1;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = String(month).padStart(2, "0");
  return [`${year}-${mm}-01`, `${year}-${mm}-${String(last).padStart(2, "0")}`];
}
