import { describe, expect, it } from "vitest";
import { MAX_TEXT_LENGTH } from "./constants";
import { paletteColors } from "./palette";
import { DEFAULT_PRESETS } from "./presets";
import { createInitialState, designReducer, sanitizeText, type DesignState } from "./state";

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
  it("drops accent that duplicates another colour", () => {
    const s = designReducer(base(), { type: "setColor", role: "accentColor", color: "#000000" });
    expect(s.accentColor).toBeNull();
  });
  it("clears accent when a main colour takes its value", () => {
    let s = designReducer(base(), { type: "setColor", role: "accentColor", color: "#ff0000" });
    expect(s.accentColor).toBe("#ff0000");
    s = designReducer(s, { type: "setColor", role: "textColor", color: "#ff0000" });
    expect(s.textColor).toBe("#ff0000");
    expect(s.accentColor).toBeNull();
    expect(paletteColors(s).length).toBeLessThanOrEqual(3);
  });
  it("allows removing accent", () => {
    let s = designReducer(base(), { type: "setColor", role: "accentColor", color: "#ff0000" });
    s = designReducer(s, { type: "setColor", role: "accentColor", color: null });
    expect(s.accentColor).toBeNull();
  });
  it("ignores null for non-accent roles", () => {
    const s = base();
    expect(designReducer(s, { type: "setColor", role: "textColor", color: null })).toBe(s);
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
    s = designReducer(s, { type: "setLogoTransform", scale: 10, offsetX: -3 });
    expect(s.logoScale).toBe(1.5);
    expect(s.logoOffsetX).toBe(-0.5);
    expect(s.logoOffsetY).toBe(0);
  });
  it("resets logo transform when logo removed", () => {
    let s = designReducer(base(), { type: "setLogoTransform", scale: 0.5 });
    s = designReducer(s, { type: "setLogo", logo: null });
    expect(s.logoScale).toBe(1);
  });
  it("sets preset and resets", () => {
    let s = designReducer(base(), { type: "setPreset", preset: DEFAULT_PRESETS[3] });
    expect(s.preset.width_mm).toBe(72);
    s = designReducer(s, { type: "reset" });
    expect(s.preset.width_mm).toBe(72);
    expect(s.text).toBe("");
  });
});
