// True-scale checks: roll, carton strip and cup strip share one mm system (1 unit = 100 mm).
import { describe, expect, it } from "vitest";
import { CUP_MM, cupStripRows, cupStripWidthMm } from "./cup";
import {
  CARTON_MM, CORE_INNER_DIAMETER_MM, CORE_WALL_MM, DEFAULT_THICKNESS_MIC, MM_PER_UNIT, cartonStripRows, rollGeometry, rollOuterRadiusMm, toUnits,
} from "./geometry";

const coreOuter = CORE_INNER_DIAMETER_MM / 2 + CORE_WALL_MM;
const outerDiameterMm = (length_m: number, thickness_mic = 45) => 2 * rollOuterRadiusMm(length_m, thickness_mic, coreOuter);

describe("real-world dimensions", () => {
  it("carton is a standard 40 x 30 x 25 cm shipping box", () => {
    expect(CARTON_MM).toEqual({ length: 400, depth: 300, height: 250 });
  });

  it("roll core is 76 mm (3 inch) inner diameter", () => {
    expect(2 * rollGeometry({ width_mm: 48, length_m: 100, thickness_mic: 45 }).innerRadius * MM_PER_UNIT).toBeCloseTo(76);
  });

  it("outer diameter follows length x thickness (annulus area), no visual clamp for real presets", () => {
    // 50 m x 45 mic: sqrt(44^2 + 50000*0.045/pi) = 52.8 mm radius
    expect(outerDiameterMm(50)).toBeCloseTo(2 * Math.sqrt(44 ** 2 + 2250 / Math.PI), 6);
    // 635 m x 45 mic: ~ 210 mm
    expect(outerDiameterMm(635)).toBeCloseTo(2 * Math.sqrt(44 ** 2 + 635000 * 0.045 / Math.PI), 6);
    expect(outerDiameterMm(635)).toBeGreaterThan(205);
    expect(outerDiameterMm(635)).toBeLessThan(215);
    // thickest admin value (200 mic) at max length is still real size
    expect(outerDiameterMm(635, 200)).toBeCloseTo(2 * Math.sqrt(44 ** 2 + 635000 * 0.2 / Math.PI), 6);
  });

  it("missing thickness falls back to 45 mic", () => {
    expect(rollOuterRadiusMm(100, 0, coreOuter)).toBeCloseTo(rollOuterRadiusMm(100, DEFAULT_THICKNESS_MIC, coreOuter));
    expect(rollOuterRadiusMm(100, Number.NaN, coreOuter)).toBeCloseTo(rollOuterRadiusMm(100, DEFAULT_THICKNESS_MIC, coreOuter));
  });

  it("tape width is the selected width on the roll and the carton (12 to 80 mm)", () => {
    for (const w of [12, 24, 48, 60, 72, 80]) {
      expect(rollGeometry({ width_mm: w, length_m: 100, thickness_mic: 45 }).width).toBeCloseTo(toUnits(w));
      const r = cartonStripRows(w, 0)[2];
      expect(r.points[0][2] - r.points[1][2]).toBeCloseTo(w);
    }
  });

  it("cup strip uses the real width up to the 60 mm cap", () => {
    for (const w of [12, 24, 48, 60]) {
      const row = cupStripRows(cupStripWidthMm(w))[0];
      expect(row.points[0][0] - row.points.at(-1)![0]).toBeCloseTo(w);
    }
    expect(cupStripWidthMm(80)).toBe(60);
  });

  it("relative sizes: 635 m roll fits on the carton top and is taller than the cup", () => {
    expect(outerDiameterMm(635)).toBeLessThan(CARTON_MM.length);
    expect(outerDiameterMm(635)).toBeGreaterThan(CUP_MM.height);
    // a 48 mm strip covers 16% of the carton depth
    expect(48 / CARTON_MM.depth).toBeCloseTo(0.16);
  });
});
