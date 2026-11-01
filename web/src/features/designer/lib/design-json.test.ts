import { describe, expect, it } from "vitest";
import { buildDesignSubmission, designJsonSchema, toDesignJson } from "./design-json";
import { createInitialState, designReducer, type DesignState } from "./state";

const UUID = "123e4567-e89b-42d3-a456-426614174000";

function sample(): DesignState {
  let s = createInitialState({ id: UUID, label: "x", width_mm: 48, length_m: 100, thickness_mic: 45 });
  s = designReducer(s, { type: "setText", text: "  CÔNG TY ABC  " });
  s = designReducer(s, { type: "setColor", role: "accentColor", color: "#0033a0" });
  return s;
}

describe("toDesignJson", () => {
  it("serialises state and passes the schema", () => {
    const json = toDesignJson(sample());
    expect(json).toMatchObject({ version: 1, presetId: UUID, text: "CÔNG TY ABC", accentColor: "#0033a0", logo: null });
    expect(designJsonSchema.safeParse(json).success).toBe(true);
  });

  it("includes logo transform with null path", () => {
    const s = designReducer(sample(), {
      type: "setLogo",
      logo: { file: new File(["x"], "a.png"), kind: "png", url: "blob:x", width: 1, height: 1 },
    });
    expect(toDesignJson(s).logo).toEqual({ path: null, scale: 1, offsetX: 0, offsetY: 0, colorMode: "original" });
  });

  it("persists canvas positions and sizes", () => {
    let s = designReducer(sample(), { type: "setTextOffset", offsetX: 1.25, offsetY: -0.2 });
    s = designReducer(s, { type: "setFontSize", px: 60 });
    const json = toDesignJson(s);
    expect(json).toMatchObject({ textOffsetX: 1.25, textOffsetY: -0.2, fontSizePx: 60 });
    expect(designJsonSchema.safeParse(json).success).toBe(true);
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

describe("buildDesignSubmission", () => {
  it("returns designs row fields", () => {
    const sub = buildDesignSubmission(sample());
    expect(sub).toMatchObject({ preset_id: UUID, width_mm: 48, length_m: 100, thickness_mic: 45, print_text: "CÔNG TY ABC" });
    expect(sub.colors).toHaveLength(3);
    const empty = buildDesignSubmission(createInitialState());
    expect(empty.print_text).toBeNull();
    expect(empty.preset_id).toBeNull();
  });
});
