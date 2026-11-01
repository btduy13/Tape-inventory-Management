import { describe, expect, it } from "vitest";
import { describePickedColor, nearestSwatch } from "./picked-color";

const ctx = { backgroundColor: "#d9c3a0", textColor: "#cf1f27", inks: ["#cf1f27", "#0a1466"] };

describe("nearestSwatch", () => {
  it("finds exact and near named swatches", () => {
    expect(nearestSwatch("#CF1F27")).toEqual({ hex: "#cf1f27", name: "Đỏ", exact: true });
    expect(nearestSwatch("#0a1466")).toMatchObject({ hex: "#0033a0", name: "Xanh dương", exact: false });
    expect(nearestSwatch("#fefefe")).toMatchObject({ name: "Trắng", exact: false });
    expect(nearestSwatch("#d8c2a1").name).toBe("Kraft (nâu nhạt)");
  });
});

describe("describePickedColor", () => {
  it("flags counted inks with their 1-based index (ΔE merge, same colour counts once)", () => {
    expect(describePickedColor("#cf1f27", ctx)).toMatchObject({ inkIndex: 1, isText: true, isBackground: false });
    expect(describePickedColor("#0b1567", ctx)).toMatchObject({ inkIndex: 2, isText: false });
  });
  it("background (tape film) is never a counted ink", () => {
    expect(describePickedColor("#d9c3a0", { ...ctx, inks: [...ctx.inks, "#d9c3a0"] })).toMatchObject({ isBackground: true, inkIndex: null });
  });
  it("a colour that is not printed is not counted", () => {
    expect(describePickedColor("#007a33", ctx)).toMatchObject({ inkIndex: null, isBackground: false, isText: false, swatch: { name: "Xanh lá", exact: true } });
  });
  it("rejects invalid hex", () => {
    expect(describePickedColor("red", ctx)).toBeNull();
  });
});
