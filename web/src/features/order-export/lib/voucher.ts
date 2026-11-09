// Lines and totals of the "Đơn đặt hàng / Phiếu giao hàng" voucher. Port of
// electron/js/modules/exportManager.js (getExportSpecsAndUnit, buildExportLine,
// buildExportProductsFromOrder, updatePreviewProductNumeric) and orderMath.calculateVoucherTotals /
// quoteItemsMatchOrder. Lines carry SALE values only, never cost.
import { money, number, vatAmount, vatPercentFromAmount } from "@/features/admin-orders/lib/order-math";
import type { OrderType } from "@/features/admin-orders/lib/types";

/** Row of rpc('admin_orders_for_export') (0030), the fields the voucher reads. */
export type ExportOrder = {
  type: OrderType; id: string; ten_hang: string | null; ten_khach_hang: string | null;
  dia_chi_khach_hang: string | null; quy_cach: string | null; quy_cach_mm: number | null;
  quy_cach_m: number | null; quy_cach_mic: number | null; mau_sac: string | null; mau_keo: string | null;
  so_luong: number | null; don_gia_ban: number | null; thanh_tien_ban: number | null; vat_percent: number | null;
  vat: number | null; tien_coc: number | null; quote_items: unknown; loai_truc: string | null;
  ten_truc: string | null; truc_chu_vi: number | null; truc_so_luong: number | null; truc_gia_ban: number | null;
  truc_thanh_tien_ban: number | null; truc_vat_percent: number | null; truc_vat: number | null;
};

export type ExportLine = {
  id: string; product: string; specs: string; text_color: string; bg_color: string; unit: string;
  quantity: number; price: number; vat: number; vatPercent: number; total: number;
};

type LineInput = Omit<ExportLine, "quantity" | "price" | "vat" | "vatPercent" | "total" | "text_color" | "bg_color" | "product"> & {
  product: string | null; text_color?: string | null; bg_color?: string | null;
  quantity: unknown; price: unknown; vat: unknown; vatPercent: unknown; total: unknown;
};

const n = (v: unknown) => number(v as number);
type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => Boolean(v) && typeof v === "object" && !Array.isArray(v);

function buildLine(f: LineInput): ExportLine {
  const quantity = Math.max(0, n(f.quantity));
  const price = Math.max(0, n(f.price));
  const total = Math.max(0, money(n(f.total))) || money(quantity * price);
  const vat = Math.max(0, money(n(f.vat)));
  return {
    id: f.id, product: f.product ?? "", specs: f.specs, text_color: f.text_color || "", bg_color: f.bg_color || "",
    unit: f.unit, quantity, price, vat, vatPercent: vatPercentFromAmount(vat, total, n(f.vatPercent)), total,
  };
}

export function specsAndUnit(o: ExportOrder): { specs: string; unit: string } {
  const text = String(o.quy_cach ?? "").trim();
  switch (o.type) {
    case "bang_keo_in":
      return { specs: `${Math.trunc(n(o.quy_cach_mm))}mm x ${Math.trunc(n(o.quy_cach_m))}m x ${Math.trunc(n(o.quy_cach_mic))}mic`, unit: "cuộn" };
    case "thank_you":
      return { specs: String(o.quy_cach ?? ""), unit: "cuộn" };
    case "truc_in":
      return { specs: text ? (text.toLowerCase().endsWith("mm") ? text : `${text}mm`) : "", unit: "cuộn" };
    default:
      // Free text ('48mm x 100y'): 'kg' only when the value is a bare number.
      return { specs: /^\d+(?:[.,]\d+)?$/.test(text) ? `${text}kg` : text, unit: "KG" };
  }
}

export function parseQuoteItems(value: unknown): Obj[] {
  let items = value;
  if (typeof items === "string") {
    try { items = JSON.parse(items); } catch { items = []; }
  }
  return Array.isArray(items) ? items.filter(isObj) : [];
}

const axesOf = (item: Obj): Obj[] => (Array.isArray(item.axes) ? item.axes.filter(isObj) : []);

/** quote_items is used only while its totals still match the order's money columns. */
export function quoteItemsMatchOrder(o: ExportOrder, items: Obj[]): boolean {
  if (!items.length) return false;
  let product = 0, axisCount = 0, axisTotal = 0, axisVat = 0;
  for (const item of items) {
    product += money(Math.max(0, n(item.total)));
    for (const axis of axesOf(item)) {
      axisCount += 1;
      axisTotal += money(Math.max(0, n(axis.total)));
      axisVat += money(Math.max(0, n(axis.vat)));
    }
  }
  const moi = o.loai_truc === "moi";
  const axisSale = moi ? money(n(o.truc_thanh_tien_ban)) : 0;
  const axisSaleVat = moi ? money(n(o.truc_vat)) : 0;
  const axisOk = axisCount === 0 ? axisSale === 0 : axisTotal === axisSale && axisVat === axisSaleVat;
  return product === money(n(o.thanh_tien_ban)) && axisOk;
}

const axisLine = (id: string, a: { name: unknown; circumference: unknown; quantity: unknown; price: unknown; vat: unknown; vatPercent: unknown; total: unknown }) =>
  buildLine({
    id, product: String(a.name || "") || "Trục mới", specs: a.circumference ? `Chu vi ${a.circumference}` : "",
    bg_color: "Trục mới", unit: "trục", quantity: a.quantity, price: a.price, vat: a.vat, vatPercent: a.vatPercent, total: a.total,
  });

/** One line per quote size (+ one per axis) when quote_items matches, else the row (+ its new axis). */
export function buildExportLines(o: ExportOrder): ExportLine[] {
  const { specs, unit } = specsAndUnit(o);
  const items = parseQuoteItems(o.quote_items);
  if (items.length > 0 && quoteItemsMatchOrder(o, items)) {
    return items.flatMap((item, i) => {
      const details = isObj(item.details) ? item.details : {};
      const spec = typeof item.specification === "string" && item.specification && item.specification !== "-" ? item.specification : specs;
      return [
        buildLine({
          id: `${o.id}-${i + 1}`, product: o.ten_hang, specs: spec,
          text_color: String(details.printColor || details.color || o.mau_sac || ""),
          bg_color: String(details.glueColor || o.mau_keo || ""), unit,
          quantity: item.quantity, price: item.unitPrice, vat: item.vat, vatPercent: item.vatPercent, total: item.total,
        }),
        ...axesOf(item).map((a, j) =>
          axisLine(`${o.id}-${i + 1}-TRUC-${j + 1}`, {
            name: a.name, circumference: a.circumference, quantity: a.quantity, price: a.unitPrice, vat: a.vat, vatPercent: a.vatPercent, total: a.total,
          })),
      ];
    });
  }
  const lines = [buildLine({
    id: o.id, product: o.ten_hang, specs, text_color: o.mau_sac, bg_color: o.mau_keo, unit,
    quantity: o.so_luong, price: o.don_gia_ban, vat: o.vat, vatPercent: o.vat_percent, total: o.thanh_tien_ban,
  })];
  if (o.type === "bang_keo_in" && o.loai_truc === "moi") {
    lines.push(axisLine(`${o.id}-TRUC`, {
      name: o.ten_truc, circumference: o.truc_chu_vi, quantity: o.truc_so_luong, price: o.truc_gia_ban,
      vat: o.truc_vat, vatPercent: o.truc_vat_percent, total: o.truc_thanh_tien_ban,
    }));
  }
  return lines;
}

export type VoucherDraft = { customer: string; address: string; lines: ExportLine[]; deposit: number };

/** Preview start: first order's customer + address, every order's lines, Σ deposits. */
export function draftOf(orders: ExportOrder[]): VoucherDraft {
  return {
    customer: orders[0]?.ten_khach_hang ?? "",
    address: orders[0]?.dia_chi_khach_hang ?? "",
    lines: orders.flatMap(buildExportLines),
    deposit: orders.reduce((sum, o) => sum + Math.max(0, money(n(o.tien_coc))), 0),
  };
}

export function calculateVoucherTotals(lines: readonly { total?: unknown; vat?: unknown }[], depositValue: unknown = 0) {
  let subtotal = 0, vat = 0;
  for (const l of lines) {
    subtotal += money(Math.max(0, n(l.total)));
    vat += money(Math.max(0, n(l.vat)));
  }
  const deposit = money(Math.max(0, n(depositValue)));
  const totalPayable = subtotal + vat;
  return { subtotal, vat, deposit, totalPayable, remaining: Math.max(0, totalPayable - deposit) };
}

/** Preview edit of quantity / price (total and VAT follow the stored %) or of the VAT amount (new %).
 *  Blank, negative or non-numeric input keeps the line (null). */
export function editLineNumber(line: ExportLine, field: "quantity" | "price" | "vat", raw: string): ExportLine | null {
  const text = raw.trim();
  const value = Number(text);
  if (text === "" || !Number.isFinite(value) || value < 0) return null;
  if (field === "vat") {
    const vat = money(value);
    return { ...line, vat, vatPercent: vatPercentFromAmount(vat, line.total) };
  }
  const next = { ...line, [field]: value };
  next.total = money(next.quantity * next.price);
  next.vat = vatAmount(next.total, next.vatPercent);
  return next;
}
