// Quote money of the "Báo giá" page: one item per size (+ new axes per size for printed tape), and the
// bundle totals. TS port of electron/js/modules/quotations.js buildQuoteItem / axisFromFields and
// orderMath.calculateQuoteBundle (bundle.parity.test.ts compares with the JS). Live totals only:
// admin_quote_save (0032) recomputes and stores every amount.
import { moneyValue } from "@/features/admin-orders/lib/form-money";
import { calculateLine, calculatePrintedTape, calculateStandardOrder, money, number, percent, vatAmount } from "@/features/admin-orders/lib/order-math";

export const QUOTE_TYPES = ["bang_keo_in", "bang_keo", "truc_in"] as const;
export type QuoteType = (typeof QUOTE_TYPES)[number];

/** Form strings keyed by order column (same keys as the RPC payload). */
export type Fields = Record<string, string>;

export const TEXT_KEYS: ReadonlySet<string> = new Set(["quy_cach", "mau_sac", "mau_keo", "loi_giay", "thung_bao", "ctv", "ten_truc", "truc_ctv"]);

/** Typed numbers as the app reads them (utils.parseCurrency): "15.000" = 15000, "1,5" = 1.5. */
export function numericFields(f: Fields): Fields {
  return Object.fromEntries(Object.entries(f).map(([k, v]) => [k, TEXT_KEYS.has(k) ? v : moneyValue(v ?? "")]));
}
export type SizeDraft = { fields: Fields; axes: Fields[] };

export type QuoteAxis = {
  name: string; circumference: number | null; quantity: number; costPrice?: number; unitPrice: number;
  costTotal?: number; total: number; vat: number; vatPercent: number; collaborator?: string;
  commissionPercent?: number; commission?: number; profit?: number; netProfit?: number;
};

export type QuoteItem = {
  specification: string; quantity: number; unitPrice: number; total: number; costTotal?: number;
  vat: number; vatPercent: number; deposit: number; shipping?: number; commission?: number;
  profit?: number; netProfit?: number; axes: QuoteAxis[];
  details?: Record<string, unknown>; fields?: Record<string, unknown>;
};

/** "<mm>mm x <m>m (<mic>mic)" for printed tape, else the free-text quy cách. */
export function specification(type: QuoteType | string, f: Record<string, unknown>): string {
  if (type === "bang_keo_in") return `${f.quy_cach_mm || "-"}mm x ${f.quy_cach_m || "-"}m (${f.quy_cach_mic || "-"}mic)`;
  return String(f.quy_cach || f.kich_thuoc || "-");
}

export function buildAxis(typed: Fields): QuoteAxis {
  const a = numericFields(typed);
  const r = calculateLine({ quantity: a.truc_so_luong, costPrice: a.truc_gia_goc, salePrice: a.truc_gia_ban, commissionPercent: a.truc_hoa_hong });
  return {
    name: (a.ten_truc ?? "").trim(), circumference: number(a.truc_chu_vi) || null,
    quantity: r.quantity, costPrice: r.costPrice, unitPrice: r.salePrice, costTotal: r.costTotal, total: r.saleTotal,
    vat: vatAmount(r.saleTotal, a.truc_vat_percent), vatPercent: percent(a.truc_vat_percent),
    collaborator: (a.truc_ctv ?? "").trim(), commissionPercent: r.commissionPercent,
    commission: r.commission, profit: r.profit, netProfit: r.netProfit,
  };
}

export function buildItem(type: QuoteType, size: SizeDraft): QuoteItem {
  const f = numericFields(size.fields);
  if (type === "bang_keo_in") {
    const r = calculatePrintedTape({
      quantity: f.so_luong, baseCost: f.don_gia_von, quantityFee: f.phi_sl, glueFee: f.phi_keo, colorFee: f.phi_mau,
      sizeFee: f.phi_size, cuttingFee: f.phi_cat, salePrice: f.don_gia_ban, rollLength: f.quy_cach_m,
      rollsPerTree: f.cuon_cay, commissionPercent: f.hoa_hong, shipping: f.tien_ship, vatPercent: percent(f.vat_percent),
      isNewAxis: false,
    });
    return {
      specification: specification(type, f), quantity: r.product.quantity, unitPrice: r.product.salePrice,
      total: r.product.saleTotal, costTotal: r.product.costTotal, vat: r.vat, vatPercent: r.vatPercent,
      deposit: money(Math.max(0, number(f.tien_coc))), shipping: r.product.shipping, commission: r.product.commission,
      profit: r.product.profit, netProfit: r.product.netProfit, axes: size.axes.map(buildAxis),
    };
  }
  const r = calculateStandardOrder({
    quantity: f.so_luong, costPrice: f.don_gia_goc, salePrice: f.don_gia_ban, commissionPercent: f.hoa_hong,
    shipping: f.tien_ship, vatPercent: percent(f.vat_percent),
  });
  return {
    specification: (f.quy_cach ?? "").trim() || "-", quantity: r.quantity, unitPrice: r.salePrice, total: r.saleTotal,
    costTotal: r.costTotal, vat: r.vat, vatPercent: r.vatPercent, deposit: 0, shipping: r.shipping,
    commission: r.commission, profit: r.profit, netProfit: r.netProfit, axes: [],
  };
}

export type QuoteBundle = {
  quantity: number; productSubtotal: number; costTotal: number; vat: number; deposit: number; shipping: number;
  axisCount: number; axisQuantity: number; axisSubtotal: number; axisCostTotal: number; axisVat: number;
  totalPayable: number; remaining: number;
};

/** orderMath.calculateQuoteBundle. */
export function quoteBundle(items: readonly Partial<QuoteItem>[]): QuoteBundle {
  const t: QuoteBundle = {
    quantity: 0, productSubtotal: 0, costTotal: 0, vat: 0, deposit: 0, shipping: 0,
    axisCount: 0, axisQuantity: 0, axisSubtotal: 0, axisCostTotal: 0, axisVat: 0, totalPayable: 0, remaining: 0,
  };
  const pos = (v: unknown) => money(Math.max(0, number(v as number)));
  for (const item of items) {
    t.quantity += Math.max(0, number(item.quantity));
    t.productSubtotal += pos(item.total);
    t.costTotal += pos(item.costTotal);
    t.vat += pos(item.vat);
    t.deposit += pos(item.deposit);
    t.shipping += pos(item.shipping);
    for (const axis of Array.isArray(item.axes) ? item.axes : []) {
      t.axisCount += 1;
      t.axisQuantity += Math.max(0, number(axis.quantity));
      t.axisSubtotal += pos(axis.total);
      t.axisCostTotal += pos(axis.costTotal);
      t.axisVat += pos(axis.vat);
    }
  }
  t.totalPayable = t.productSubtotal + t.axisSubtotal + t.vat + t.axisVat;
  t.remaining = Math.max(0, t.totalPayable - t.deposit);
  return t;
}

/** quotations.js prepareQuoteItems checks; null when the sizes can be saved. */
export function quoteError(type: QuoteType, items: readonly QuoteItem[], sizes: readonly SizeDraft[]): string | null {
  if (type === "bang_keo_in" && sizes.some((s) => !(number(moneyValue(s.fields.quy_cach_m ?? "")) > 0) || !(number(moneyValue(s.fields.cuon_cay ?? "")) > 0)))
    return "Mỗi tab kích thước cần Quy cách (m) và Số cuộn/cây lớn hơn 0 để tính giá gốc";
  if (items.some((i) => i.quantity <= 0 || i.unitPrice <= 0)) return "Mỗi tab kích thước cần có số lượng và đơn giá bán lớn hơn 0";
  if (items.some((i) => i.axes.some((a) => !a.name || a.quantity <= 0 || !(number(a.costPrice) > 0) || a.unitPrice <= 0)))
    return "Mỗi trục cần đủ tên, số lượng, giá gốc và giá bán";
  return null;
}
