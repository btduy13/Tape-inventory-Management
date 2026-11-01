// Per-view framing (bounding sphere, camera direction, floor) for the 3D mockup. Pure + unit-tested.
import { cupBoundingRadiusMm, CUP_CENTER_Y_MM } from "./cup";
import { CARTON_MM, rollGeometry, toUnits, type RollPreset } from "./geometry";
import type { Vec3 } from "./camera";

export const MOCKUP_VIEWS = ["roll", "carton", "cup"] as const;
export type MockupView = (typeof MOCKUP_VIEWS)[number];

export type ViewFrame = {
  /** Bounding-sphere radius in scene units (object centred on the origin). */
  radius: number;
  /** Camera direction from the origin. */
  direction: Vec3;
  /** y of the surface the object stands on (contact shadow). */
  floorY: number;
};

export function viewFrame(view: MockupView, preset: RollPreset): ViewFrame {
  if (view === "carton") {
    const { length, depth, height } = CARTON_MM;
    return {
      radius: toUnits(Math.hypot(length, depth, height)) / 2,
      direction: [0.85, 0.8, 1.15],
      floorY: -toUnits(height) / 2,
    };
  }
  if (view === "cup") {
    return { radius: toUnits(cupBoundingRadiusMm()), direction: [0.35, 0.3, 1], floorY: -toUnits(CUP_CENTER_Y_MM) };
  }
  const g = rollGeometry(preset);
  const halfWidth = (g.width * 1.02) / 2;
  return { radius: Math.hypot(g.outerRadius, halfWidth), direction: [1.4, 0.9, 1.6], floorY: -halfWidth };
}
