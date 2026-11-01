import { describe, expect, it } from "vitest";
import { buildDesignSubmission, designJsonSchema, toDesignJson } from "./design-json";
import { createInitialState, designReducer, maxFontSize } from "./state";
import {
  checkTapeSize, clampLength, DEFAULT_TAPE_SPEC, formatTapeSize, initialTapeSize, lengthIssue,
  parseLengthInput, toTapeSpec, type TapeSpec,
} from "./tape-spec";

const SPEC: TapeSpec = DEFAULT_TAPE_SPEC;

describe("DEFAULT_TAPE_SPEC", () => {
  it("mirrors the 0022 seed", () => {
    expect(SPEC.widths).toEqual([12, 15, 16, 18, 20, 24, 30, 35, 40, 48, 60, 70, 80]);
    expect([SPEC.minLengthM, SPEC.maxLengthM]).toEqual([50, 635]);
  });
});

describe("toTapeSpec", () => {
  it("maps DB rows (numeric strings), dedupes and drops invalid widths", () => {
    const s = toTapeSpec({
      widths: [{ width_mm: 24 }, { width_mm: "12" }, { width_mm: 24 }, { width_mm: 0 }, { width_mm: 12.5 }, { width_mm: 300 }],
      settings: { min_length_m: "40.0", max_length_m: "700.0", thickness_mic: "50" },
    });
    expect(s).toEqual({ widths: [24, 12], minLengthM: 40, maxLengthM: 700, thicknessMic: 50 });
  });

  it("falls back per part when rows are missing or inconsistent", () => {
    const s = toTapeSpec({ widths: [], settings: { min_length_m: 700, max_length_m: 50, thickness_mic: null } });
    expect(s).toEqual(DEFAULT_TAPE_SPEC);
    expect(toTapeSpec({ widths: null, settings: null })).toEqual(DEFAULT_TAPE_SPEC);
  });
});

describe("checkTapeSize", () => {
  it.each([
    [12, 50, null],
    [80, 635, null],
    [48, 100.5, null],
    [100, 100, "width"],
    ["48", 100, "width"],
    [48, 49.9, "length"],
    [48, 40, "length"],
    [48, 635.1, "length"],
    [48, 100.25, "length"],
    [48, Number.NaN, "length"],
    [48, "100", "length"],
  ])("width %s / length %s -> %s", (w, l, expected) => {
    expect(checkTapeSize(SPEC, w, l)).toBe(expected);
  });

  it("follows an admin-edited list", () => {
    expect(checkTapeSize({ ...SPEC, widths: [...SPEC.widths, 100] }, 100, 100)).toBeNull();
    expect(checkTapeSize({ ...SPEC, widths: [] }, 48, 100)).toBe("width");
  });
});

describe("length input", () => {
  it("parses dot / comma decimals and rejects junk", () => {
    expect(parseLengthInput(" 635 ")).toBe(635);
    expect(parseLengthInput("100,5")).toBe(100.5);
    expect(parseLengthInput("100.55")).toBe(100.6);
    for (const bad of ["", "abc", "-50", "1e3", "50m", "123456"]) expect(parseLengthInput(bad)).toBeNaN();
  });

  it("reports issues with the range", () => {
    expect(lengthIssue(SPEC, 40)).toBe("tooShort");
    expect(lengthIssue(SPEC, 636)).toBe("tooLong");
    expect(lengthIssue(SPEC, Number.NaN)).toBe("invalid");
    expect(lengthIssue(SPEC, 50)).toBeNull();
  });

  it("clamps for the 3D preview", () => {
    expect(clampLength(SPEC, 10)).toBe(50);
    expect(clampLength(SPEC, 9999)).toBe(635);
    expect(clampLength(SPEC, Number.NaN)).toBe(100);
  });
});

describe("designer size state", () => {
  it("starts at 48 mm x 100 m, or the first width / clamped length", () => {
    expect(initialTapeSize(SPEC)).toMatchObject({ id: null, width_mm: 48, length_m: 100, thickness_mic: 45 });
    expect(initialTapeSize({ ...SPEC, widths: [12, 24], minLengthM: 200 })).toMatchObject({ width_mm: 12, length_m: 200 });
  });

  it("setWidth / setLength update the size and json; font fits the 12 mm band", () => {
    let s = createInitialState(initialTapeSize(SPEC));
    s = designReducer(s, { type: "setFontSize", px: 150 });
    s = designReducer(s, { type: "setWidth", widthMm: 12 });
    expect(s.preset).toMatchObject({ id: null, width_mm: 12, length_m: 100, label: "12mm x 100m" });
    expect(s.fontSizePx).toBeLessThanOrEqual(maxFontSize(12));
    s = designReducer(s, { type: "setLength", lengthM: 635 });
    expect(s.preset.length_m).toBe(635);
    const json = toDesignJson(s);
    expect(json).toMatchObject({ presetId: null, widthMm: 12, lengthM: 635 });
    expect(designJsonSchema.safeParse(json).success).toBe(true);
    expect(buildDesignSubmission(s)).toMatchObject({ width_mm: 12, length_m: 635, preset_id: null });
  });

  it("ignores invalid widths; unfinished length is serialised as 0 (server rejects)", () => {
    const s0 = createInitialState(initialTapeSize(SPEC));
    expect(designReducer(s0, { type: "setWidth", widthMm: Number.NaN })).toBe(s0);
    const s = designReducer(s0, { type: "setLength", lengthM: Number.NaN });
    expect(toDesignJson(s).lengthM).toBe(0);
    expect(designJsonSchema.safeParse(toDesignJson(s)).success).toBe(false);
  });

  it("formats sizes for staff views", () => {
    expect(formatTapeSize("48.0", "635.0")).toBe("48 mm × 635 m");
    expect(formatTapeSize(null, 100)).toBe("? mm × 100 m");
  });
});

describe("strip layout for every width", () => {
  it.each([12, 15, 16, 18, 20, 24, 30, 35, 40, 48, 60, 70, 80, 100])("%i mm: logo + long text stay inside the print band", async (w) => {
    const { computePatternLayout, stripSize } = await import("./pattern");
    const s = designReducer(createInitialState(initialTapeSize(SPEC)), { type: "setWidth", widthMm: w });
    const strip = stripSize(w);
    const layout = computePatternLayout({
      strip, textWidth: s.fontSizePx * 14, fontSize: s.fontSizePx, logoAspect: 3, logoScale: 1.5,
      logoOffsetX: 0, logoOffsetY: 0.5, textOffsetY: -0.5, repeatGapPx: 0,
    });
    expect(layout.count).toBeGreaterThanOrEqual(1);
    for (const tile of layout.tiles) {
      for (const box of [tile.logo, tile.text]) {
        if (!box) continue;
        expect(box.y).toBeGreaterThanOrEqual(layout.band.top - 0.01);
        expect(box.y + box.height).toBeLessThanOrEqual(layout.band.bottom + 0.01);
      }
    }
  });
});
