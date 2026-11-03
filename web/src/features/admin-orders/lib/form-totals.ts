// Form values (strings, keyed by payload column) -> live totals, same mapping as the desktop
// form (bangkeoin.js) and admin_order_create. VAT is always a percent here, like the RPC.
import { calculatePrintedTape, type PrintedTapeResult } from "./order-math";

export type FormValues = Readonly<Record<string, string>>;

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
