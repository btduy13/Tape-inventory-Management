// The web port must give the same numbers as the desktop app's orderMath.js. Skipped when the
// electron/ folder is not checked out next to web/ (web-only CI).
// @vitest-environment node
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { calculatePrintedTape, type PrintedTapeInput } from "./order-math";

// Vitest runs from web/ (jsdom: import.meta.url is not a file URL).
const jsPath = path.resolve(process.cwd(), "../electron/js/orderMath.js");
const present = existsSync(jsPath);

type Js = { calculatePrintedTape(input: PrintedTapeInput): unknown };

// Deterministic pseudo-random inputs (no flaky seeds).
function* inputs(count: number): Generator<PrintedTapeInput> {
  let s = 12345;
  const rnd = (max: number, dp = 0) => {
    s = (s * 1103515245 + 12345) % 2147483648;
    const v = (s / 2147483648) * max;
    return dp ? Math.round(v * 10 ** dp) / 10 ** dp : Math.round(v);
  };
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

describe.skipIf(!present)("order-math parity with electron/js/orderMath.js", () => {
  it("matches calculatePrintedTape on 300 inputs", () => {
    const js = createRequire(jsPath)(jsPath) as Js;
    for (const input of inputs(300)) {
      expect(calculatePrintedTape(input)).toEqual(js.calculatePrintedTape(input));
    }
  });
});
