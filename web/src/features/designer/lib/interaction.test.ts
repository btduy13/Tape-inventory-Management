import { describe, expect, it } from "vitest";
import {
  deleteAction, fontSizeFromScale, logoScaleFromHeight, nudgeAction, offsetFromPosition,
} from "./interaction";
import { computePatternLayout, stripSize } from "./pattern";

const strip = stripSize(48);
const layout = (over = {}) =>
  computePatternLayout({
    strip, textWidth: 200, fontSize: 80, logoAspect: 1, logoScale: 1,
    logoOffsetX: 0, logoOffsetY: 0, textOffsetX: 0, textOffsetY: 0, repeatGapPx: 100, ...over,
  });

describe("offsetFromPosition", () => {
  it("converts a drag delta into offsets (fraction of strip height)", () => {
    const l = layout();
    const box = l.tiles[1].text!;
    const off = offsetFromPosition(l, strip, "text", 1, box.x + 19.2, box.y - 9.6)!;
    expect(off.offsetX).toBeCloseTo(0.1);
    expect(off.offsetY).toBeCloseTo(-0.05);
  });
  it("returns null for missing elements", () => {
    expect(offsetFromPosition(layout({ logoAspect: null }), strip, "logo", 0, 0, 0)).toBeNull();
    expect(offsetFromPosition(layout(), strip, "text", 99, 0, 0)).toBeNull();
  });
});

describe("nudgeAction", () => {
  it("moves by one step, five with shift", () => {
    expect(nudgeAction(layout(), "logo", "ArrowRight", false)).toEqual({ type: "setLogoTransform", offsetX: 0.02, offsetY: 0 });
    const a = nudgeAction(layout(), "text", "ArrowUp", true)!;
    expect(a.type).toBe("setTextOffset");
    expect((a as { offsetX: number }).offsetX).toBeCloseTo(0);
    expect((a as { offsetY: number }).offsetY).toBeCloseTo(-0.1);
    expect(nudgeAction(layout(), "text", "a", false)).toBeNull();
  });
  it("starts from the clamped (effective) position", () => {
    const l = layout({ textOffsetY: 0.5 });
    const a = nudgeAction(l, "text", "ArrowDown", false) as { offsetY: number };
    expect(a.offsetY).toBeCloseTo(l.effective.text!.y + 0.02);
    expect(a.offsetY).toBeLessThan(0.5);
  });
});

describe("resize helpers", () => {
  it("inverts logo height to scale", () => {
    const l = layout();
    expect(logoScaleFromHeight(l.logoSize!.height, strip, l.fit)).toBeCloseTo(1);
    expect(logoScaleFromHeight(192 * 0.7 * 0.5, strip, 0.5)).toBeCloseTo(1);
  });
  it("scales font and ignores bad factors", () => {
    expect(fontSizeFromScale(80, 1.5)).toBe(120);
    expect(fontSizeFromScale(80, Number.NaN)).toBe(80);
  });
  it("deletes the selected element", () => {
    expect(deleteAction("logo")).toEqual({ type: "setLogo", logo: null });
    expect(deleteAction("text")).toEqual({ type: "setText", text: "" });
  });
});
