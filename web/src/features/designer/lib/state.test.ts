import { describe, expect, it } from "vitest";
import { MAX_TEXT_LENGTH } from "./constants";
import { paletteColors } from "./palette";
import { DEFAULT_PRESETS } from "./presets";
import { createInitialState, designReducer, maxFontSize, sanitizeText, textLines, type DesignState } from "./state";
import { DESIGN_TEMPLATES } from "./templates";

const base = (): DesignState => ({ ...createInitialState(), backgroundColor: "#ffffff", textColor: "#000000" });

describe("designReducer colours (max 3, distinct roles)", () => {
  it("rejects invalid hex", () => {
    const s = base();
    expect(designReducer(s, { type: "setColor", role: "textColor", color: "javascript:1" })).toBe(s);
  });
  it("refuses text colour equal to background", () => {
    const s = base();
    expect(designReducer(s, { type: "setColor", role: "textColor", color: "#FFFFFF" })).toBe(s);
    expect(designReducer(s, { type: "setColor", role: "backgroundColor", color: "#000" })).toBe(s);
  });
  it("has no accent / logo colour mode (logo always prints in its own colours)", () => {
    const s = base();
    expect(s).not.toHaveProperty("accentColor");
    expect(s).not.toHaveProperty("logoColorMode");
    expect(designReducer(s, { type: "setColor", role: "accentColor" as never, color: "#ff0000" })).toBe(s);
    expect(designReducer(s, { type: "setLogoColorMode", mode: "tint" } as never)).toBe(s);
    expect(paletteColors(s)).toEqual(["#ffffff", "#000000"]);
  });
  it("ignores null colours", () => {
    const s = base();
    expect(designReducer(s, { type: "setColor", role: "textColor", color: null as never })).toBe(s);
  });
});

describe("designReducer text + limits", () => {
  it("sanitizes and caps text", () => {
    expect(sanitizeText("a\nb\u0000c")).toBe("a\nb c");
    expect(sanitizeText("1\r\n2\n3\n4\n5")).toBe("1\n2\n3\n4");
    expect(textLines("  A \n\n B\n")).toEqual(["A", "B"]);
    const s = designReducer(base(), { type: "setText", text: "x".repeat(200) });
    expect(s.text).toHaveLength(MAX_TEXT_LENGTH);
  });
  it("only accepts whitelisted fonts", () => {
    const s = base();
    expect(designReducer(s, { type: "setFontFamily", fontFamily: "Comic</style>" })).toBe(s);
    expect(designReducer(s, { type: "setFontFamily", fontFamily: "Tahoma" }).fontFamily).toBe("Tahoma");
  });
  it("clamps numeric values", () => {
    let s = designReducer(base(), { type: "setFontSize", px: 9999 });
    expect(s.fontSizePx).toBe(200);
    s = designReducer(s, { type: "setFontSize", px: Number.NaN });
    expect(s.fontSizePx).toBe(12);
    s = designReducer(s, { type: "setRepeatGap", px: -5 });
    expect(s.repeatGapPx).toBe(0);
    s = designReducer(s, { type: "setLogoTransform", scale: 10, offsetX: -30, offsetY: 9 });
    expect(s.logoScale).toBe(1.5);
    expect(s.logoOffsetX).toBe(-3);
    expect(s.logoOffsetY).toBe(0.5);
    s = designReducer(s, { type: "setLogoTransform", offsetY: 0 });
    expect(s.logoOffsetY).toBe(0);
  });
  it("resets logo transform when logo removed", () => {
    let s = designReducer(base(), { type: "setLogoTransform", scale: 0.5 });
    s = designReducer(s, { type: "setLogo", logo: null });
    expect(s.logoScale).toBe(1);
  });
  it("rescales font size with the tape width (QC-09)", () => {
    let s = createInitialState(DEFAULT_PRESETS[0]);
    expect(s.fontSizePx).toBe(86);
    s = designReducer(s, { type: "setPreset", preset: DEFAULT_PRESETS[1] });
    expect(s.fontSizePx).toBe(108);
    s = designReducer(s, { type: "setPreset", preset: DEFAULT_PRESETS[3] });
    expect(s.fontSizePx).toBe(130);
    s = designReducer(s, { type: "setFontSize", px: 250 });
    s = designReducer(s, { type: "setPreset", preset: DEFAULT_PRESETS[0] });
    expect(s.fontSizePx).toBe(133); // 200 * 48 / 72
    expect(s.fontSizePx).toBeLessThanOrEqual(maxFontSize(48));
  });
  it("moves text within limits", () => {
    let s = designReducer(base(), { type: "setTextOffset", offsetX: 0.3, offsetY: -2 });
    expect([s.textOffsetX, s.textOffsetY]).toEqual([0.3, -0.5]);
    s = designReducer(s, { type: "setTextOffset", offsetX: Number.NaN });
    expect(s.textOffsetX).toBe(-3);
  });
  it("applies a template and rejects invalid ones", () => {
    const s = designReducer(base(), { type: "applyTemplate", template: DESIGN_TEMPLATES[1] });
    expect(s).toMatchObject({ backgroundColor: "#ffcd00", textColor: "#000000", text: "HÀNG DỄ VỠ - XIN NHẸ TAY" });
    const bad = { ...DESIGN_TEMPLATES[0], textColor: DESIGN_TEMPLATES[0].backgroundColor };
    expect(designReducer(s, { type: "applyTemplate", template: bad })).toBe(s);
  });
  it("sets preset and resets", () => {
    let s = designReducer(base(), { type: "setPreset", preset: DEFAULT_PRESETS[3] });
    expect(s.preset.width_mm).toBe(72);
    s = designReducer(s, { type: "reset" });
    expect(s.preset.width_mm).toBe(72);
    expect(s.text).toBe("");
  });
});

describe("designReducer pattern, border, logo rotation", () => {
  const narrow = () => designReducer(base(), { type: "setWidth", widthMm: 36 });

  it("starts straight, switches pattern, rejects unknown values, resets to straight", () => {
    const s = base();
    expect(s.pattern).toBe("straight");
    const flipped = designReducer(s, { type: "setPattern", pattern: "flip" });
    expect(flipped.pattern).toBe("flip");
    expect(designReducer(flipped, { type: "setPattern", pattern: "flip" })).toBe(flipped);
    expect(designReducer(flipped, { type: "setPattern", pattern: "spiral" as never })).toBe(flipped);
    expect(designReducer(flipped, { type: "reset" }).pattern).toBe("straight");
  });

  it("tapes under 48mm only print straight", () => {
    const n = narrow();
    expect(designReducer(n, { type: "setPattern", pattern: "brick" })).toBe(n);
    const wide = designReducer(base(), { type: "setPattern", pattern: "diagonal" });
    expect(designReducer(wide, { type: "setWidth", widthMm: 36 }).pattern).toBe("straight");
    expect(designReducer(wide, { type: "setWidth", widthMm: 60 }).pattern).toBe("diagonal");
  });

  it("border: 3mm minimum, capped by the tape width, off when no line fits", () => {
    let s = designReducer(base(), { type: "setBorder", style: "stripes" });
    expect(s.border).toEqual({ style: "stripes", widthMm: 3 });
    s = designReducer(s, { type: "setBorder", widthMm: 1 });
    expect(s.border.widthMm).toBe(3);
    s = designReducer(s, { type: "setBorder", widthMm: 6.3 });
    expect(s.border.widthMm).toBe(6.5);
    expect(designReducer(s, { type: "setWidth", widthMm: 24 }).border).toEqual({ style: "stripes", widthMm: 4.5 });
    expect(designReducer(s, { type: "setWidth", widthMm: 12 }).border.style).toBe("none");
    expect(designReducer(s, { type: "setBorder", style: "dotted" as never })).toBe(s);
  });

  it("logo rotation is normalised to [-180, 180] and cleared with the logo", () => {
    let s = designReducer(base(), { type: "setLogoTransform", rotation: 270 });
    expect(s.logoRotation).toBe(-90);
    s = designReducer(s, { type: "setLogoTransform", rotation: -190.4 });
    expect(s.logoRotation).toBe(170);
    expect(designReducer(s, { type: "setLogoTransform", rotation: Number.NaN }).logoRotation).toBe(0);
    expect(designReducer(s, { type: "setLogo", logo: null }).logoRotation).toBe(0);
  });
});

describe("logo clean-up toggle", () => {
  const logo = {
    file: new File(["x"], "a.jpg"),
    kind: "jpg" as const,
    url: "blob:clean",
    width: 80,
    height: 40,
    cleaned: true,
    alt: { url: "blob:orig", width: 100, height: 60 },
    cleanup: { bgRemoved: true, trimmed: true },
  };
  it("swaps between the cleaned and the original image", () => {
    const s = designReducer(base(), { type: "setLogo", logo });
    const raw = designReducer(s, { type: "setLogoCleanup", on: false });
    expect(raw.logo).toMatchObject({ url: "blob:orig", width: 100, height: 60, cleaned: false, alt: { url: "blob:clean" } });
    expect(designReducer(raw, { type: "setLogoCleanup", on: false })).toBe(raw);
    expect(designReducer(raw, { type: "setLogoCleanup", on: true }).logo).toMatchObject({ url: "blob:clean", cleaned: true });
  });
  it("accepts the ink analysis of either version", () => {
    const s = designReducer(base(), { type: "setLogo", logo });
    const inks = [{ hex: "#cf1f27", coverage: 1 }];
    expect(designReducer(s, { type: "setLogoInks", url: "blob:orig", inks }).logo?.inks).toEqual(inks);
    expect(designReducer(s, { type: "setLogoInks", url: "blob:other", inks })).toBe(s);
  });
  it("does nothing without an alternative", () => {
    const s = designReducer(base(), { type: "setLogo", logo: { ...logo, alt: undefined, cleaned: false } });
    expect(designReducer(s, { type: "setLogoCleanup", on: true })).toBe(s);
  });
});
