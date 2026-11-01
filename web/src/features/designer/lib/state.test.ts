import { describe, expect, it } from "vitest";
import { MAX_TEXT_LENGTH } from "./constants";
import { paletteColors } from "./palette";
import { DEFAULT_PRESETS } from "./presets";
import { createInitialState, designReducer, maxFontSize, sanitizeText, type DesignState } from "./state";
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
    expect(sanitizeText("a\nb\u0000c")).toBe("a b c");
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
