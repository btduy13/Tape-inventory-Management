// The web port must give the same numbers as the desktop app's orderMath.js. Skipped when the
// electron/ folder is not checked out next to web/ (web-only CI).
// @vitest-environment node
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { calculatePrintedTape, calculateStandardOrder, vatPercentFromAmount, type PrintedTapeInput, type StandardOrderInput } from "./order-math";

// Vitest runs from web/ (jsdom: import.meta.url is not a file URL).
const jsPath = path.resolve(process.cwd(), "../electron/js/orderMath.js");
const present = existsSync(jsPath);

type Js = {
  calculatePrintedTape(input: PrintedTapeInput): unknown; calculateStandardOrder(input: StandardOrderInput): unknown;
  vatPercentFromAmount(vat: unknown, base: unknown, stored?: unknown): number;
};

// Deterministic pseudo-random numbers (no flaky seeds).
function random(seed: number) {
  let s = seed;
  return (max: number, dp = 0) => {
    s = (s * 1103515245 + 12345) % 2147483648;
    const v = (s / 2147483648) * max;
    return dp ? Math.round(v * 10 ** dp) / 10 ** dp : Math.round(v);
  };
}

function* inputs(count: number): Generator<PrintedTapeInput> {
  const rnd = random(12345);
  for (let i = 0; i < count; i++) {
    const axis = i % 3 === 0;
    yield {
      quantity: rnd(5000), rollLength: rnd(300), rollsPerTree: rnd(120), baseCost: rnd(2_000_000),
      quantityFee: rnd(50_000), glueFee: rnd(50_000), colorFee: rnd(80_000), sizeFee: rnd(20_000), cuttingFee: rnd(20_000),
      salePrice: rnd(60_000, 1), commissionPercent: rnd(30, 1), shipping: rnd(300_000), deposit: rnd(5_000_000),
      vatPercent: rnd(10), isNewAxis: axis,
      ...(axis ? { axisQuantity: rnd(5), axisCostPrice: rnd(2_000_000), axisSalePrice: rnd(3_000_000), axisCommissionPercent: rnd(20), axisVatPercent: rnd(10) } : {}),
    };
  }
}

/** Plain tape / axis (no deposit) and Thank you (deposit), with and without the VAT percent key. */
function* standardInputs(count: number): Generator<StandardOrderInput> {
  const rnd = random(67890);
  for (let i = 0; i < count; i++) {
    yield {
      quantity: rnd(5000, i % 4 === 0 ? 2 : 0), costPrice: rnd(500_000, 1), salePrice: rnd(800_000, 1),
      commissionPercent: rnd(120, 1) - 10, shipping: rnd(300_000) - 1000,
      ...(i % 5 === 0 ? { vat: rnd(100_000) } : { vatPercent: rnd(12, 1) }),
      ...(i % 2 === 0 ? { deposit: rnd(20_000_000) } : {}),
      ...(i % 7 === 0 ? { settled: true } : {}),
    };
  }
}

describe.skipIf(!present)("order-math parity with electron/js/orderMath.js", () => {
  it("matches calculatePrintedTape on 300 inputs", () => {
    const js = createRequire(jsPath)(jsPath) as Js;
    for (const input of inputs(300)) {
      expect(calculatePrintedTape(input)).toEqual(js.calculatePrintedTape(input));
    }
  });

  it("matches calculateStandardOrder on 300 inputs (plain tape, axis, Thank you)", () => {
    const js = createRequire(jsPath)(jsPath) as Js;
    for (const input of standardInputs(300)) {
      expect(calculateStandardOrder(input)).toEqual(js.calculateStandardOrder(input));
    }
  });

  it("matches vatPercentFromAmount (stored percent, derived from amount, empty)", () => {
    const js = createRequire(jsPath)(jsPath) as Js;
    const cases: [unknown, unknown, unknown][] = [
      [50000, 500000, null], ["50000", "500000", "0"], [33333, 1000000, undefined], [10, 0, null], [0, 500, 8], ["7", "300", "12.345"], [-5, 100, null],
    ];
    for (const [vat, base, stored] of cases) {
      expect(vatPercentFromAmount(vat as string, base as string, stored as string)).toBe(js.vatPercentFromAmount(vat, base, stored));
    }
  });
});
