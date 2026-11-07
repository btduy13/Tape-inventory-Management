// Form values (strings, keyed by payload column) -> live totals, same mapping as the desktop forms
// (bangkeoin.js, bangkeo.js, trucin.js) and order_compute in SQL. VAT is always a percent here.
import { calculatePrintedTape, calculateStandardOrder, money, number, type PrintedTapeResult } from "./order-math";
import type { OrderType } from "./types";

export type FormValues = Readonly<Record<string, string>>;

/** Printed tape (bang_keo_in). */
export function formTotals(v: FormValues): PrintedTapeResult {
  const isNewAxis = v.loai_truc === "moi";
  return calculatePrintedTape({
    quantity: v.so_luong, rollLength: v.quy_cach_m, rollsPerTree: v.cuon_cay,
    baseCost: v.don_gia_von, quantityFee: v.phi_sl, glueFee: v.phi_keo, colorFee: v.phi_mau,
    sizeFee: v.phi_size, cuttingFee: v.phi_cat,
    salePrice: v.don_gia_ban, commissionPercent: v.hoa_hong, shipping: v.tien_ship,
    deposit: v.tien_coc, vatPercent: v.vat_percent ?? "",
    isNewAxis,
    ...(isNewAxis
      ? {
          axisQuantity: v.truc_so_luong, axisCostPrice: v.truc_gia_goc, axisSalePrice: v.truc_gia_ban,
          axisCommissionPercent: v.truc_hoa_hong, axisVatPercent: v.truc_vat_percent ?? "",
        }
      : {}),
  });
}

/** What the totals panel shows, for every order type. */
export type OrderSummary = {
  costPrice: number; costTotal: number; saleTotal: number; vat: number;
  axisSaleTotal: number | null; axisVat: number | null;
  payable: number; deposit: number | null; outstanding: number;
  commission: number; profit: number; netProfit: number; errors: string[];
};

export function orderTotals(type: OrderType, v: FormValues): OrderSummary {
  if (type === "bang_keo_in") {
    const t = formTotals(v);
    const axis = v.loai_truc === "moi";
    return {
      costPrice: Math.round(t.product.costPrice), costTotal: t.product.costTotal, saleTotal: t.product.saleTotal, vat: t.vat,
      axisSaleTotal: axis ? t.axis.saleTotal : null, axisVat: axis ? t.axis.vat : null,
      payable: t.combinedSaleTotal + t.vat + t.axis.vat, deposit: t.deposit, outstanding: t.outstanding,
      commission: t.combinedCommission, profit: t.combinedProfit, netProfit: t.combinedNetProfit, errors: t.errors,
    };
  }
  // Plain tape and axis have no deposit (order_compute); Thank you costs from don_gia_von.
  const thankYou = type === "thank_you";
  const t = calculateStandardOrder({
    quantity: v.so_luong, costPrice: thankYou ? v.don_gia_von : v.don_gia_goc, salePrice: v.don_gia_ban,
    commissionPercent: v.hoa_hong, shipping: v.tien_ship, vatPercent: v.vat_percent ?? "",
    ...(thankYou ? { deposit: v.tien_coc } : {}),
  });
  return {
    costPrice: Math.round(t.costPrice), costTotal: t.costTotal, saleTotal: t.saleTotal, vat: t.vat,
    axisSaleTotal: null, axisVat: null, payable: t.saleTotal + t.vat,
    deposit: thankYou ? money(Math.max(0, number(v.tien_coc))) : null, outstanding: t.outstanding,
    commission: t.commission, profit: t.profit, netProfit: t.netProfit, errors: [],
  };
}
