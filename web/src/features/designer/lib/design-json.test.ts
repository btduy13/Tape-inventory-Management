import { describe, expect, it } from "vitest";
import { buildDesignSubmission, designJsonSchema, toDesignJson } from "./design-json";
import { createInitialState, designReducer, type DesignState } from "./state";

const UUID = "123e4567-e89b-42d3-a456-426614174000";

function sample(): DesignState {
  let s = createInitialState({ id: UUID, label: "x", width_mm: 48, length_m: 100, thickness_mic: 45 });
  s = designReducer(s, { type: "setText", text: "  CÔNG TY ABC  " });
  return s;
}

describe("toDesignJson", () => {
  it("serialises state and passes the schema", () => {
    const json = toDesignJson(sample());
    expect(json).toMatchObject({ version: 1, presetId: UUID, text: "CÔNG TY ABC", logo: null });
    expect(json).not.toHaveProperty("accentColor");
    expect(designJsonSchema.safeParse(json).success).toBe(true);
  });

  it("includes logo transform with null path", () => {
    const s = designReducer(sample(), {
      type: "setLogo",
      logo: { file: new File(["x"], "a.png"), kind: "png", url: "blob:x", width: 1, height: 1 },
    });
    // No colorMode: the logo always prints in its own colours.
    expect(toDesignJson(s).logo).toEqual({ path: null, scale: 1, offsetX: 0, offsetY: 0 });
  });

  it("persists canvas positions and sizes", () => {
    let s = designReducer(sample(), { type: "setTextOffset", offsetX: 1.25, offsetY: -0.2 });
    s = designReducer(s, { type: "setFontSize", px: 60 });
    const json = toDesignJson(s);
    expect(json).toMatchObject({ textOffsetX: 1.25, textOffsetY: -0.2, fontSizePx: 60 });
    expect(designJsonSchema.safeParse(json).success).toBe(true);
  });
});

describe("print ink flag", () => {
  const withLogo = (inks: string[]) => {
    let s = designReducer(sample(), {
      type: "setLogo",
      logo: { file: new File(["x"], "a.png"), kind: "png", url: "blob:x", width: 1, height: 1 },
    });
    s = designReducer(s, { type: "setLogoInks", url: "blob:x", inks: inks.map((hex) => ({ hex, coverage: 0.25 })) });
    return s;
  };

  it("counts background + text + logo colours (same colour once)", () => {
    // Default tape #d9c3a0, text #cf1f27 (near the logo red, so printed with it).
    const json = toDesignJson(withLogo(["#c8102e", "#0a1466"]));
    expect(json).toMatchObject({ inkCount: 3, inkOverLimit: false, inkColors: ["#d9c3a0", "#c8102e", "#0a1466"] });
    expect(designJsonSchema.safeParse(json).success).toBe(true);
  });

  it("flags more than 3 inks and still validates", () => {
    const json = toDesignJson(withLogo(["#ff0000", "#00ff00", "#0000ff", "#ffff00"]));
    // Background + text + 4 logo colours.
    expect(json).toMatchObject({ inkCount: 6, inkOverLimit: true });
    expect(designJsonSchema.safeParse(json).success).toBe(true);
  });

  it("ignores a stale analysis result for a replaced logo", () => {
    const s = designReducer(withLogo(["#0a1466"]), { type: "setLogoInks", url: "blob:old", inks: [] });
    expect(s.logo?.inks).toHaveLength(1);
  });

  it("rejects malformed ink fields", () => {
    const json = toDesignJson(sample());
    expect(designJsonSchema.safeParse({ ...json, inkColors: ["red"] }).success).toBe(false);
    expect(designJsonSchema.safeParse({ ...json, inkCount: 1.5 }).success).toBe(false);
    expect(designJsonSchema.safeParse({ ...json, inkOverLimit: "yes" }).success).toBe(false);
  });
});

describe("designJsonSchema", () => {
  const ok = () => toDesignJson(sample());
  it("rejects tampered payloads", () => {
    expect(designJsonSchema.safeParse({ ...ok(), textColor: "red" }).success).toBe(false);
    expect(designJsonSchema.safeParse({ ...ok(), textColor: ok().backgroundColor }).success).toBe(false);
    expect(designJsonSchema.safeParse({ ...ok(), fontFamily: "evil" }).success).toBe(false);
    expect(designJsonSchema.safeParse({ ...ok(), text: "a\u0000b" }).success).toBe(false);
    expect(designJsonSchema.safeParse({ ...ok(), extra: 1 }).success).toBe(false);
    expect(designJsonSchema.safeParse({ ...ok(), presetId: "not-a-uuid" }).success).toBe(false);
    expect(designJsonSchema.safeParse({ ...ok(), version: 2 }).success).toBe(false);
    expect(designJsonSchema.safeParse({ ...ok(), textOffsetX: 99 }).success).toBe(false);
    expect(designJsonSchema.safeParse({ ...ok(), textOffsetY: "0" }).success).toBe(false);
    const logo = { path: null, scale: 1, offsetX: 0, offsetY: 0 };
    expect(designJsonSchema.safeParse({ ...ok(), logo: { ...logo, colorMode: "rainbow" } }).success).toBe(false);
    expect(designJsonSchema.safeParse({ ...ok(), logo }).success).toBe(true);
  });
});

describe("legacy logo colour fields (backward compatible)", () => {
  const ok = () => toDesignJson(sample());
  const logo = { path: null, scale: 1, offsetX: 0, offsetY: 0 };
  it("old designs with accentColor + logo colorMode still parse", () => {
    for (const colorMode of ["original", "tint"] as const) {
      const old = { ...ok(), accentColor: "#0033a0", logo: { ...logo, colorMode } };
      const r = designJsonSchema.safeParse(old);
      expect(r.success).toBe(true);
      expect(r.data?.logo?.colorMode).toBe(colorMode);
      expect(r.data?.accentColor).toBe("#0033a0");
    }
    expect(designJsonSchema.safeParse({ ...ok(), accentColor: null }).success).toBe(true);
  });
  it("new designs omit accentColor and colorMode", () => {
    const s = designReducer(sample(), {
      type: "setLogo",
      logo: { file: new File(["x"], "a.png"), kind: "png", url: "blob:x", width: 1, height: 1 },
    });
    const json = toDesignJson(s);
    expect("accentColor" in json).toBe(false);
    expect(json.logo && "colorMode" in json.logo).toBe(false);
    expect(designJsonSchema.safeParse(json).success).toBe(true);
  });
  it("still rejects a malformed legacy accent", () => {
    expect(designJsonSchema.safeParse({ ...ok(), accentColor: "blue" }).success).toBe(false);
  });
});

describe("buildDesignSubmission", () => {
  it("returns designs row fields", () => {
    const sub = buildDesignSubmission(sample());
    expect(sub).toMatchObject({ preset_id: UUID, width_mm: 48, length_m: 100, thickness_mic: 45, print_text: "CÔNG TY ABC" });
    expect(sub.colors).toEqual(["#d9c3a0", "#cf1f27"]);
    const empty = buildDesignSubmission(createInitialState());
    expect(empty.print_text).toBeNull();
    expect(empty.preset_id).toBeNull();
  });
});
