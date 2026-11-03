// TS port of the printed-tape money math in electron/js/orderMath.js (number, percent, money,
// vatAmount, calculateLine, calculatePrintedTape, outstandingFromOrder). Used for the live totals
// of the web order form only: admin_order_create recomputes every amount in SQL with the same
// formulas, so the form can never store a number the desktop app would not. Keep in sync with the
// JS file (order-math.parity.test.ts compares both on the same inputs).

/** Printed-tape cost is quoted per standard 90 m roll. */
export const STANDARD_ROLL_LENGTH_M = 90;

type Num = number | string | null | undefined;

export function number(value: Num): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function percent(value: Num): number {
  return Math.min(100, Math.max(0, number(value)));
}

/** Rounds to whole dong. Every stored / shown amount goes through this. */
export function money(value: Num): number {
  return Math.round(number(value));
}

/** VAT is rounded once per line; totals add the rounded lines. */
export function vatAmount(base: Num, vatPercentValue: Num): number {
  return money((Math.max(0, number(base)) * percent(vatPercentValue)) / 100);
}

export type LineInput = { quantity?: Num; costPrice?: Num; salePrice?: Num; shipping?: Num; commissionPercent?: Num };

export type Line = {
  quantity: number; costPrice: number; salePrice: number; costTotal: number; saleTotal: number;
  profit: number; commissionPercent: number; commission: number; shipping: number; netProfit: number;
};

export function calculateLine(input: LineInput = {}): Line {
  const quantity = Math.max(0, number(input.quantity));
  const costPrice = Math.max(0, number(input.costPrice));
  const salePrice = Math.max(0, number(input.salePrice));
  const shipping = money(Math.max(0, number(input.shipping)));
  const commissionPercent = percent(input.commissionPercent);
  // Parts are rounded first so profit - commission - shipping == netProfit exactly.
  const costTotal = money(quantity * costPrice);
  const saleTotal = money(quantity * salePrice);
  const profit = saleTotal - costTotal;
  const commission = money((Math.max(0, profit) * commissionPercent) / 100);
  return {
    quantity, costPrice, salePrice, costTotal, saleTotal, profit,
    commissionPercent, commission, shipping, netProfit: profit - commission - shipping,
  };
}

export type PrintedTapeInput = {
  quantity?: Num; rollLength?: Num; rollsPerTree?: Num;
  baseCost?: Num; quantityFee?: Num; glueFee?: Num; colorFee?: Num; sizeFee?: Num; cuttingFee?: Num;
  salePrice?: Num; commissionPercent?: Num; shipping?: Num; deposit?: Num;
  /** Percent wins over the legacy `vat` amount when the key is present (same as the JS). */
  vatPercent?: Num; vat?: Num; settled?: boolean;
  isNewAxis?: boolean; axisQuantity?: Num; axisCostPrice?: Num; axisSalePrice?: Num;
  axisCommissionPercent?: Num; axisVatPercent?: Num; axisVat?: Num;
};

export type PrintedTapeResult = {
  valid: boolean; errors: string[];
  product: Line; axis: Line & { vat: number; vatPercent?: number };
  deposit: number; vatPercent: number; axisVatPercent: number; vat: number;
  combinedCostTotal: number; combinedSaleTotal: number; combinedProfit: number;
  combinedCommission: number; combinedNetProfit: number; outstanding: number;
};

const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

export function calculatePrintedTape(input: PrintedTapeInput = {}): PrintedTapeResult {
  const rollLength = Math.max(0, number(input.rollLength));
  const rollsPerTree = Math.max(0, number(input.rollsPerTree));
  // Without m/roll or rolls/tree the cost cannot be computed: flag it instead of costing 0.
  const errors: string[] = [];
  if (!(rollLength > 0)) errors.push("Quy cách (m) phải lớn hơn 0");
  if (!(rollsPerTree > 0)) errors.push("Số cuộn/cây phải lớn hơn 0");
  const baseAndFees = [input.baseCost, input.quantityFee, input.glueFee, input.colorFee, input.sizeFee, input.cuttingFee]
    .reduce<number>((sum, value) => sum + Math.max(0, number(value)), 0);
  const costPrice = errors.length === 0 ? ((baseAndFees / STANDARD_ROLL_LENGTH_M) * rollLength) / rollsPerTree : 0;
  const product = calculateLine({
    quantity: input.quantity, costPrice, salePrice: input.salePrice,
    commissionPercent: input.commissionPercent, shipping: input.shipping,
  });
  const axisVatPercent = input.isNewAxis ? percent(input.axisVatPercent) : 0;
  const axis: PrintedTapeResult["axis"] = input.isNewAxis
    ? {
        ...calculateLine({
          quantity: input.axisQuantity, costPrice: input.axisCostPrice,
          salePrice: input.axisSalePrice, commissionPercent: input.axisCommissionPercent,
        }),
        vatPercent: axisVatPercent, vat: 0,
      }
    : { ...calculateLine(), vat: 0 };
  const deposit = money(Math.max(0, number(input.deposit)));
  const vatPercent = percent(input.vatPercent);
  const vat = has(input, "vatPercent") ? vatAmount(product.saleTotal, vatPercent) : money(Math.max(0, number(input.vat)));
  axis.vat = input.isNewAxis
    ? has(input, "axisVatPercent") ? vatAmount(axis.saleTotal, axisVatPercent) : money(Math.max(0, number(input.axisVat)))
    : 0;
  const combinedSaleTotal = product.saleTotal + axis.saleTotal;
  return {
    valid: errors.length === 0,
    errors,
    product,
    axis,
    deposit,
    vatPercent,
    axisVatPercent,
    vat,
    combinedCostTotal: product.costTotal + axis.costTotal,
    combinedSaleTotal,
    combinedProfit: product.profit + axis.profit,
    combinedCommission: product.commission + axis.commission,
    combinedNetProfit: product.netProfit + axis.netProfit,
    outstanding: input.settled ? 0 : Math.max(0, combinedSaleTotal + vat + axis.vat - deposit),
  };
}

/** Customer debt of a stored printed-tape order row (matches cong_no_khach). */
export function outstandingFromOrder(order: {
  thanh_tien_ban?: Num; vat?: Num; loai_truc?: string | null; truc_thanh_tien_ban?: Num;
  truc_vat?: Num; tien_coc?: Num; da_tat_toan?: boolean | null;
}): number {
  if (order.da_tat_toan) return 0;
  const axis = order.loai_truc === "moi";
  const sale = Math.max(0, number(order.thanh_tien_ban));
  const vat = Math.max(0, number(order.vat));
  const axisSale = axis ? Math.max(0, number(order.truc_thanh_tien_ban)) : 0;
  const axisVat = axis ? Math.max(0, number(order.truc_vat)) : 0;
  return Math.max(0, sale + axisSale + vat + axisVat - Math.max(0, number(order.tien_coc)));
}
