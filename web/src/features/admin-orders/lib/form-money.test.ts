import { describe, expect, it } from "vitest";
import { formatMoneyInput, moneyValue, parseMoney } from "./form-money";

describe("parseMoney (app utils.parseCurrency rules)", () => {
  it.each([
    ["1.200.000", 1200000],
    ["1,200,000", 1200000],
    ["1200000", 1200000],
    ["12.500", 12500],
    ["12,500", 12500],
    ["12.5", 12.5],
    ["12,5", 12.5],
    ["0.125", 0.125],
    ["1234.567", 1234.567],
    ["1.234,56", 1234.56],
    ["1,234.5", 1234.5],
    [" 25.000 đ ", 25000],
    ["-1.000", -1000],
    ["0", 0],
  ])("%s -> %s", (text, n) => expect(parseMoney(text)).toBe(n));

  it("no digit -> null", () => {
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("abc")).toBeNull();
    expect(parseMoney(".")).toBeNull();
  });
});

describe("formatMoneyInput / moneyValue", () => {
  it("shows dots for thousands and a comma for decimals", () => {
    expect(formatMoneyInput("1200000")).toBe("1.200.000");
    expect(formatMoneyInput("12.5")).toBe("12,5");
    expect(formatMoneyInput("0")).toBe("0");
    expect(formatMoneyInput("")).toBe("");
  });

  it("round-trips what it shows", () => {
    for (const v of ["1200000", "12.5", "1234.56", "999", "1000", "0.5"]) expect(moneyValue(formatMoneyInput(v))).toBe(v);
  });

  it("empty text submits empty", () => expect(moneyValue("  ")).toBe(""));
});
