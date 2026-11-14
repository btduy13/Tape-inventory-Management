import { describe, expect, it } from "vitest";
import { designColors, parseDesignJson } from "./design-schema";
import { DESIGN } from "../testing/fixtures";

const raw = (d: unknown) => JSON.stringify(d);

describe("parseDesignJson", () => {
  it("accepts a valid design and resets logo.path", () => {
    const r = parseDesignJson(raw({ ...DESIGN, logo: { ...DESIGN.logo!, path: "other/lead/x.svg" } }));
    expect(r?.logo?.path).toBeNull();
    expect(r).toMatchObject({ widthMm: 48, lengthM: 100 });
  });

  it("keeps the client ink count flag (> 3 inks needs a consultant)", () => {
    const r = parseDesignJson(raw({ ...DESIGN, inkColors: ["#c8102e", "#0a1466", "#8a8a8a", "#007a33"], inkCount: 4, inkOverLimit: true }));
    expect(r).toMatchObject({ inkCount: 4, inkOverLimit: true });
    expect(parseDesignJson(raw({ ...DESIGN, inkCount: -1 }))).toBeNull();
  });

  it("accepts legacy logo colour fields (accentColor, logo.colorMode) and omits them on new designs", () => {
    const old = parseDesignJson(raw({ ...DESIGN, accentColor: "#c8102e", logo: { ...DESIGN.logo!, colorMode: "tint" } }));
    expect(old).toMatchObject({ accentColor: "#c8102e", logo: { colorMode: "tint" } });
    const fresh: Partial<typeof DESIGN> = { ...DESIGN };
    delete fresh.accentColor;
    const r = parseDesignJson(raw(fresh));
    expect(r).not.toBeNull();
    expect(r && "accentColor" in r).toBe(false);
  });

  it("keeps the repeat pattern (staff and workshop see it) and rejects unknown ones", () => {
    expect(parseDesignJson(raw({ ...DESIGN, pattern: "stagger" }))?.pattern).toBe("stagger");
    expect(parseDesignJson(raw({ ...DESIGN, pattern: "spiral" }))).toBeNull();
  });

  it("ignores presetId (sizes come from tape_widths)", () => {
    expect(parseDesignJson(raw(DESIGN))?.presetId).toBeNull();
    expect(parseDesignJson(raw({ ...DESIGN, presetId: null }))).not.toBeNull();
  });

  it("requires a tape width and length", () => {
    const noWidth: Partial<typeof DESIGN> = { ...DESIGN };
    const noLength: Partial<typeof DESIGN> = { ...DESIGN };
    delete noWidth.widthMm;
    delete noLength.lengthM;
    expect(parseDesignJson(raw(noWidth))).toBeNull();
    expect(parseDesignJson(raw(noLength))).toBeNull();
  });

  it.each([
    ["fractional width", { widthMm: 48.5 }],
    ["zero length", { lengthM: 0 }],
    ["string length", { lengthM: "635" }],
    ["absurd length", { lengthM: 1e6 }],
  ])("rejects %s", (_name, patch) => {
    expect(parseDesignJson(raw({ ...DESIGN, ...patch }))).toBeNull();
  });

  it.each([
    ["not json", "{"],
    ["empty", ""],
    ["non-string", 42],
    ["bad color", raw({ ...DESIGN, backgroundColor: "red" })],
    ["wrong version", raw({ ...DESIGN, version: 2 })],
    ["oversized", " ".repeat(20_001)],
  ])("rejects %s", (_name, input) => {
    expect(parseDesignJson(input)).toBeNull();
  });
});

describe("designColors", () => {
  it("dedupes and keeps order", () => {
    expect(designColors({ backgroundColor: "#ffffff", textColor: "#000000", accentColor: "#000000" }))
      .toEqual(["#ffffff", "#000000"]);
    expect(designColors({ backgroundColor: "#ffffff", textColor: "#000000", accentColor: null }))
      .toHaveLength(2);
  });
});
