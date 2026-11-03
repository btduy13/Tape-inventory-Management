// Mirrors the printed-tape cases of electron/test/orderMath.test.js.
import { describe, expect, it } from "vitest";
import {
  STANDARD_ROLL_LENGTH_M, calculateLine, calculatePrintedTape, money, outstandingFromOrder, percent, vatAmount,
} from "./order-math";

describe("order-math (port of electron/js/orderMath.js)", () => {
  it("printed tape includes a new axis in debt and profit", () => {
    const r = calculatePrintedTape({
      quantity: 120, baseCost: 900000, rollLength: 90, rollsPerTree: 60, salePrice: 26000,
      commissionPercent: 5, shipping: 100000, deposit: 1000000, isNewAxis: true,
      axisQuantity: 1, axisCostPrice: 1200000, axisSalePrice: 1800000, axisCommissionPercent: 10,
    });
    expect(r.product.costPrice).toBe(15000);
    expect(r.product.saleTotal).toBe(3120000);
    expect(r.axis.saleTotal).toBe(1800000);
    expect(r.axis.commission).toBe(60000);
    expect(r.combinedSaleTotal).toBe(4920000);
    expect(r.outstanding).toBe(3920000);
    expect(r.combinedNetProfit).toBe(1694000);
  });

  it("settled orders have no debt; reopening restores it", () => {
    const order = { thanh_tien_ban: 3120000, loai_truc: "moi", truc_thanh_tien_ban: 1800000, tien_coc: 1000000 };
    expect(outstandingFromOrder({ ...order, da_tat_toan: true })).toBe(0);
    expect(outstandingFromOrder({ ...order, da_tat_toan: false })).toBe(3920000);
    expect(outstandingFromOrder({ ...order, loai_truc: "cu" })).toBe(2120000);
  });

  it("VAT amount (legacy) and VAT percent are included in debt", () => {
    expect(calculatePrintedTape({ quantity: 2, salePrice: 100000, vat: 20000 }).outstanding).toBe(220000);
    const r = calculatePrintedTape({ quantity: 2, salePrice: 100000, vatPercent: 10 });
    expect(r.vat).toBe(20000);
    expect(r.outstanding).toBe(220000);
    expect(calculatePrintedTape({ quantity: 2, salePrice: 100000, vatPercent: 0, vat: 99999 }).vat).toBe(0);
  });

  it("keeps product VAT and new-axis VAT separate", () => {
    const amounts = calculatePrintedTape({
      quantity: 10, salePrice: 20000, vat: 20000, deposit: 50000, isNewAxis: true,
      axisQuantity: 2, axisCostPrice: 30000, axisSalePrice: 50000, axisVat: 10000,
    });
    expect(amounts.vat).toBe(20000);
    expect(amounts.axis.vat).toBe(10000);
    expect(amounts.outstanding).toBe(280000);
    const percents = calculatePrintedTape({
      quantity: 10, salePrice: 20000, vatPercent: 10, isNewAxis: true,
      axisQuantity: 2, axisCostPrice: 30000, axisSalePrice: 50000, axisVatPercent: 8,
    });
    expect(percents.vat).toBe(20000);
    expect(percents.axis.vat).toBe(8000);
    expect(percents.outstanding).toBe(328000);
  });

  it("ignores the axis unless it is new", () => {
    const r = calculatePrintedTape({ quantity: 1, salePrice: 1000, axisQuantity: 5, axisSalePrice: 1000, axisVatPercent: 10 });
    expect(r.axis.saleTotal).toBe(0);
    expect(r.axis.vat).toBe(0);
    expect(r.combinedSaleTotal).toBe(1000);
  });

  it("rounds VAT once per line so subtotal + VAT equals the total", () => {
    const r = calculatePrintedTape({
      quantity: 7, salePrice: 12345, vatPercent: 8, rollLength: 90, rollsPerTree: 60,
      isNewAxis: true, axisQuantity: 3, axisCostPrice: 1000, axisSalePrice: 33333, axisVatPercent: 8,
    });
    expect(r.vat).toBe(Math.round(86415 * 0.08));
    expect(r.axis.vat).toBe(Math.round(99999 * 0.08));
    expect(r.outstanding).toBe(r.combinedSaleTotal + r.vat + r.axis.vat);
  });

  it("derives net profit from already-rounded parts", () => {
    const line = calculateLine({ quantity: 3, costPrice: 1000.4, salePrice: 1999.7, commissionPercent: 7.5, shipping: 1000.6 });
    for (const key of ["costTotal", "saleTotal", "commission", "shipping", "netProfit"] as const) {
      expect(Number.isInteger(line[key])).toBe(true);
    }
    expect(line.profit - line.commission - line.shipping).toBe(line.netProfit);
  });

  it("flags a zero or empty roll length / rolls per tree instead of costing 0", () => {
    const base = { quantity: 10, baseCost: 900000, salePrice: 20000, rollsPerTree: 60, rollLength: 90 };
    expect(calculatePrintedTape(base).valid).toBe(true);
    expect(STANDARD_ROLL_LENGTH_M).toBe(90);
    expect(calculatePrintedTape(base).product.costPrice).toBe((900000 / 90) * 90 / 60);
    const zeroLength = calculatePrintedTape({ ...base, rollLength: 0 });
    expect(zeroLength.valid).toBe(false);
    expect(zeroLength.errors.some((m) => /Quy cách \(m\)/.test(m))).toBe(true);
    const emptyRolls = calculatePrintedTape({ ...base, rollsPerTree: "" });
    expect(emptyRolls.valid).toBe(false);
    expect(emptyRolls.errors.some((m) => /cuộn\/cây/.test(m))).toBe(true);
  });

  it("adds all fees to the base cost before scaling to the roll", () => {
    const r = calculatePrintedTape({
      quantity: 1, rollLength: 45, rollsPerTree: 2, salePrice: 1,
      baseCost: 100, quantityFee: 10, glueFee: 20, colorFee: 30, sizeFee: 40, cuttingFee: -50,
    });
    expect(r.product.costPrice).toBe((200 / 90) * 45 / 2);
  });

  it("never produces negative money, commission or debt", () => {
    const loss = calculateLine({ quantity: 1, costPrice: 2000000, salePrice: 1000000, commissionPercent: 20 });
    expect(loss.commission).toBe(0);
    expect(calculatePrintedTape({ quantity: 1, salePrice: 1000, deposit: 5000 }).outstanding).toBe(0);
    expect(calculateLine({ quantity: -5, salePrice: 2000 }).saleTotal).toBe(0);
    expect(calculateLine({ quantity: 2, salePrice: -100 }).saleTotal).toBe(0);
    expect(percent(150)).toBe(100);
    expect(percent(-1)).toBe(0);
    expect(money("12.5")).toBe(13);
    expect(money("abc")).toBe(0);
    expect(vatAmount(99999, 10)).toBe(10000);
  });
});
