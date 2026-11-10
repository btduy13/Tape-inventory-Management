import { describe, expect, it } from "vitest";
import { axisVnd, niceStep, niceTicks, scale } from "./chart-scale";

describe("chart-scale", () => {
  it("niceStep rounds up to 1 / 2 / 2.5 / 5 / 10 x 10^k", () => {
    expect(niceStep(0.8)).toBe(1);
    expect(niceStep(13)).toBe(20);
    expect(niceStep(2_300_000)).toBe(2_500_000);
    expect(niceStep(4_100)).toBe(5_000);
    expect(niceStep(0)).toBe(1);
  });

  it("niceTicks covers the data and includes 0, negatives too", () => {
    expect(niceTicks(0, 37_000_000)).toEqual({ min: 0, max: 40_000_000, ticks: [0, 10_000_000, 20_000_000, 30_000_000, 40_000_000] });
    const t = niceTicks(-3_000_000, 18_000_000);
    expect(t.min).toBeLessThanOrEqual(-3_000_000);
    expect(t.max).toBeGreaterThanOrEqual(18_000_000);
    expect(t.ticks).toContain(0);
    expect(niceTicks(0, 0)).toEqual({ min: 0, max: 1, ticks: [0, 1] });
  });

  it("scale maps linearly (inverted y axis)", () => {
    expect(scale(0, 0, 100, 200, 0)).toBe(200);
    expect(scale(50, 0, 100, 200, 0)).toBe(100);
    expect(scale(5, 5, 5, 10, 0)).toBe(10);
  });

  it("axisVnd: tỷ / tr / k", () => {
    expect(axisVnd(1_500_000_000)).toBe("1,5 tỷ");
    expect(axisVnd(45_000_000)).toBe("45 tr");
    expect(axisVnd(800_000)).toBe("800 k");
    expect(axisVnd(-2_500_000)).toBe("-2,5 tr");
    expect(axisVnd(0)).toBe("0");
  });
});
