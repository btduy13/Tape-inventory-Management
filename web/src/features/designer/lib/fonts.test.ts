import { describe, expect, it } from "vitest";
import { FONT_FAMILIES } from "./constants";
import { designJsonSchema, toDesignJson } from "./design-json";
import { FONT_GROUPS, FONT_META, fontCss, fontShorthand, fontWeight, registerFontFamilies } from "./fonts";
import { createInitialState, designReducer } from "./state";

describe("font catalog", () => {
  it("has 20 fonts, each in a picker group with a print weight", () => {
    expect(FONT_FAMILIES.length).toBe(20);
    for (const f of FONT_FAMILIES) {
      expect(FONT_GROUPS).toContain(FONT_META[f].group);
      expect([400, 700, 800]).toContain(FONT_META[f].weight);
    }
    for (const g of FONT_GROUPS) expect(FONT_FAMILIES.some((f) => FONT_META[f].group === g)).toBe(true);
  });

  it("resolves web fonts to their self-hosted family, system fonts to their name", () => {
    registerFontFamilies({ Montserrat: "'__Montserrat_abc', '__Montserrat_Fallback_abc'" });
    expect(fontCss("Montserrat")).toBe("'__Montserrat_abc', '__Montserrat_Fallback_abc', Arial, sans-serif");
    expect(fontCss("Times New Roman")).toBe('"Times New Roman", Arial, sans-serif');
    expect(fontWeight("Anton")).toBe(400);
    expect(fontWeight("unknown")).toBe(700);
    expect(fontShorthand("Arial", 40)).toBe('700 40px "Arial", Arial, sans-serif');
  });

  it("customers can pick and save any catalog font; unknown fonts are refused", () => {
    let s = designReducer(createInitialState(), { type: "setText", text: "ACME" });
    s = designReducer(s, { type: "setFontFamily", fontFamily: "Pacifico" });
    expect(s.fontFamily).toBe("Pacifico");
    expect(designJsonSchema.safeParse(toDesignJson(s)).success).toBe(true);
    expect(designReducer(s, { type: "setFontFamily", fontFamily: "Comic Sans" })).toBe(s);
  });
});
