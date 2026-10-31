import { describe, expect, it } from "vitest";
import { designColors, parseDesignJson } from "./design-schema";
import { DESIGN } from "../testing/fixtures";

const raw = (d: unknown) => JSON.stringify(d);

describe("parseDesignJson", () => {
  it("accepts a valid design and resets logo.path", () => {
    const r = parseDesignJson(raw({ ...DESIGN, logo: { ...DESIGN.logo!, path: "other/lead/x.svg" } }));
    expect(r?.presetId).toBe(DESIGN.presetId);
    expect(r?.logo?.path).toBeNull();
  });

  it("requires a preset", () => {
    expect(parseDesignJson(raw({ ...DESIGN, presetId: null }))).toBeNull();
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
