// Parity with the desktop app: toVietnameseWords and calculateVoucherTotals must give the same
// result as electron/js/orderMath.js. Skipped when electron/ is not checked out (web-only CI).
// @vitest-environment node
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { calculateVoucherTotals } from "./voucher";
import { toVietnameseWords } from "./words";

const jsPath = path.resolve(process.cwd(), "../electron/js/orderMath.js");
type Js = { toVietnameseWords(v: unknown): string; calculateVoucherTotals(p: unknown[], d: unknown): unknown };

function random(seed: number) {
  let s = seed;
  return (max: number) => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return Math.round((s / 2147483648) * max);
  };
}

describe.skipIf(!existsSync(jsPath))("order-export parity with electron orderMath.js", () => {
  const js = createRequire(import.meta.url)(jsPath) as Js;

  it("toVietnameseWords matches on edge and random amounts", () => {
    const rnd = random(4242);
    const values: unknown[] = [0, 1, 5, 10, 11, 14, 15, 21, 24, 25, 101, 105, 1_000, 1_005, 1_015, 10_000, 100_001, 1_000_000,
      1_000_001, 1_234_567, 1_000_000_000, 2_000_000_005, -1500, 12.6, "3500", null, "abc"];
    for (let i = 0; i < 500; i++) values.push(rnd(10 ** (1 + (i % 12))));
    for (const v of values) expect(toVietnameseWords(v), String(v)).toBe(js.toVietnameseWords(v));
  });

  it("calculateVoucherTotals matches", () => {
    const rnd = random(99);
    for (let i = 0; i < 200; i++) {
      const lines = Array.from({ length: 1 + (i % 6) }, () => ({ total: rnd(50_000_000) - 1_000, vat: rnd(4_000_000) / 3 }));
      const deposit = i % 4 === 0 ? "" : rnd(80_000_000) - 500;
      expect(calculateVoucherTotals(lines, deposit)).toEqual(js.calculateVoucherTotals(lines, deposit));
    }
  });
});

describe("toVietnameseWords", () => {
  it.each([
    [0, "Không"], [15, "Mười lăm"], [21, "Hai mươi mốt"], [105, "Một trăm lẻ năm"], [1_005, "Một nghìn không trăm lẻ năm"],
    [1_250_000, "Một triệu hai trăm năm mươi nghìn"], [-24, "Âm hai mươi tư"],
  ])("%s", (v, words) => expect(toVietnameseWords(v)).toBe(words));
});
