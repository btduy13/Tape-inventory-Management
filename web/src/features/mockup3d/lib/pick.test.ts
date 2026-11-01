import { describe, expect, it } from "vitest";
import { CylinderGeometry, MirroredRepeatWrapping, RepeatWrapping } from "three";
import { cupStripRibbon, cupStripWidthMm } from "./cup";
import { cartonStripRows, rollGeometry, textureRepeat } from "./geometry";
import { cssToBufferPixel, rgbToHex, stripTextureMapping, uvToPixel } from "./pick";
import { buildRibbon } from "./ribbon";

// Source canvas = the designer strip at logical size: STRIP_LENGTH_MM (300) x 4 px/mm by width.
const W = 1200;
const H = 192;
const STRIP_MM = 300;
const preset = { width_mm: 48, length_m: 100, thickness_mic: 45 };
const frac = (t: number) => t - Math.floor(t);

describe("uvToPixel (generic texture lookup)", () => {
  const id = stripTextureMapping(1);
  it("maps corners with flipY (canvas row 0 is the top, v = 1)", () => {
    expect(uvToPixel({ x: 0, y: 1 }, id, W, H)).toEqual({ x: 0, y: 0 });
    expect(uvToPixel({ x: 0, y: 0 }, id, W, H)).toEqual({ x: 0, y: H - 1 });
    expect(uvToPixel({ x: 0.5, y: 0.5 }, id, W, H)).toEqual({ x: 600, y: 96 });
    expect(uvToPixel({ x: 0.999999, y: 0.000001 }, id, W, H)).toEqual({ x: W - 1, y: H - 1 });
  });
  it("applies repeat + offset, wraps along (repeat) and clamps across (clamp)", () => {
    const m = stripTextureMapping(2.5, 0.1);
    // u' = 0.3 * 2.5 + 0.1 = 0.85
    expect(uvToPixel({ x: 0.3, y: 0.5 }, m, W, H).x).toBe(Math.floor(0.85 * W));
    // u' = 0.9 * 2.5 + 0.1 = 2.35 -> 0.35
    expect(uvToPixel({ x: 0.9, y: 0.5 }, m, W, H).x).toBe(Math.floor(0.35 * W));
    expect(uvToPixel({ x: 0.5, y: 1.2 }, m, W, H).y).toBe(0);
    expect(uvToPixel({ x: 0.5, y: -0.2 }, m, W, H).y).toBe(H - 1);
  });
  it("supports flipY false and mirrored repeat", () => {
    const m = { repeat: { x: 1, y: 1 }, offset: { x: 0, y: 0 }, wrapS: MirroredRepeatWrapping, wrapT: RepeatWrapping, flipY: false };
    expect(uvToPixel({ x: 1.25, y: 0.25 }, m, 100, 100)).toEqual({ x: 75, y: 25 });
    expect(uvToPixel({ x: 0.25, y: 1.25 }, m, 100, 100)).toEqual({ x: 25, y: 25 });
  });
});

describe("uvToPixel per 3D view (same mapping as use-strip-texture)", () => {
  it("roll: cylinder UV around the roll repeats the print circumference / strip length times", () => {
    const g = rollGeometry(preset);
    const rep = textureRepeat(g.circumferenceMm, STRIP_MM);
    expect(rep).toBeGreaterThan(1);
    const m = stripTextureMapping(rep);
    // Real CylinderGeometry UVs (same args as TapeRoll): u around, v = 1 at the top edge.
    const cyl = new CylinderGeometry(g.outerRadius, g.outerRadius, g.width, 96, 1, true);
    const uv = cyl.getAttribute("uv");
    for (const i of [0, 10, 48, 96, 97 + 30]) {
      const p = { x: uv.getX(i), y: uv.getY(i) };
      const got = uvToPixel(p, m, W, H);
      expect(got.x).toBe(Math.min(W - 1, Math.floor(frac(p.x * rep) * W)));
      expect(got.y).toBe(p.y >= 1 ? 0 : H - 1);
    }
    // A point `mm` along the circumference shows design column (mm mod 300) / 300.
    const mm = 420;
    const got = uvToPixel({ x: mm / g.circumferenceMm, y: 0.5 }, m, W, H);
    expect(got.x).toBeCloseTo(((mm % STRIP_MM) / STRIP_MM) * W, -0.5);
    expect(got.y).toBe(H / 2);
    cyl.dispose();
  });

  it("carton strip: ribbon UV.x = along / period, UV.y across the tape", () => {
    const strip = buildRibbon(cartonStripRows(preset.width_mm), STRIP_MM);
    const m = stripTextureMapping(1);
    const cols = cartonStripRows(preset.width_mm)[0].points.length;
    const rows = strip.uvs.length / 2 / cols;
    for (const i of [0, Math.floor(rows / 3), rows - 1]) {
      for (const j of [0, Math.floor(cols / 2), cols - 1]) {
        const k = i * cols + j;
        const p = { x: strip.uvs[k * 2], y: strip.uvs[k * 2 + 1] };
        const got = uvToPixel(p, m, W, H);
        expect(got.x).toBe(Math.min(W - 1, Math.floor(frac(p.x) * W)));
        expect(got.y).toBe(Math.min(H - 1, Math.floor((1 - p.y) * H)));
      }
    }
    // Strip longer than one print period: the pattern repeats (wraps) along it.
    expect(Math.max(...strip.uvs.filter((_, i) => i % 2 === 0))).toBeGreaterThan(1);
  });

  it("cup strip: period scaled with the capped strip width, print not stretched", () => {
    const widthMm = 72; // wider than the cup takes: shown 60 mm wide, period scaled the same
    const ribbon = cupStripRibbon(widthMm, STRIP_MM);
    const scale = cupStripWidthMm(widthMm) / widthMm;
    const m = stripTextureMapping(1);
    // Last row: along = uv.x * period. Pixel column must equal (along / (300 * scale)) mod 1.
    const k = ribbon.uvs.length / 2 - 1;
    const p = { x: ribbon.uvs[k * 2], y: ribbon.uvs[k * 2 + 1] };
    const got = uvToPixel(p, m, W, H);
    expect(got.x).toBe(Math.min(W - 1, Math.floor(frac(p.x) * W)));
    expect(got.y).toBe(0); // v = 1 edge -> top canvas row
    expect(scale).toBeLessThan(1);
  });
});

describe("helpers", () => {
  it("rgbToHex clamps and pads", () => {
    expect(rgbToHex(0, 51, 160)).toBe("#0033a0");
    expect(rgbToHex(300, -4, 15.4)).toBe("#ff000f");
  });
  it("cssToBufferPixel flips y and scales by DPR", () => {
    expect(cssToBufferPixel(0, 0, 100, 50, 200, 100)).toEqual({ x: 0, y: 99 });
    expect(cssToBufferPixel(99.9, 49.9, 100, 50, 200, 100)).toEqual({ x: 199, y: 0 });
    expect(cssToBufferPixel(150, 10, 100, 50, 200, 100)).toBeNull();
    expect(cssToBufferPixel(1, 1, 0, 50, 200, 100)).toBeNull();
  });
});
