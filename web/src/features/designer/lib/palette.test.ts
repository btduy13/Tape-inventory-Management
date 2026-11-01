import { describe, expect, it } from "vitest";
import { contrastRatio, hexToRgb, isLowContrast, normalizeHex, paletteColors } from "./palette";

describe("normalizeHex", () => {
  it("normalises valid forms", () => {
    expect(normalizeHex("#ABC")).toBe("#aabbcc");
    expect(normalizeHex("c8102E")).toBe("#c8102e");
    expect(normalizeHex(" #000000 ")).toBe("#000000");
  });
  it("rejects invalid input", () => {
    for (const v of ["", "#12", "red", "#gggggg", "url(x)", null, undefined]) expect(normalizeHex(v)).toBeNull();
  });
});

describe("paletteColors", () => {
  it("background then text, deduped", () => {
    expect(paletteColors({ backgroundColor: "#fff", textColor: "#000" })).toEqual(["#ffffff", "#000000"]);
    expect(paletteColors({ backgroundColor: "#111111", textColor: "#111" })).toEqual(["#111111"]);
  });
});

describe("contrast", () => {
  it("computes ratios", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(isLowContrast("#fefefe", "#ffffff")).toBe(true);
    expect(isLowContrast("#000000", "#ffffff")).toBe(false);
    expect(hexToRgb("#102030")).toEqual({ r: 16, g: 32, b: 48 });
  });
});
