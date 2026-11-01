// Per-view framing (bounding sphere, camera direction, floor) for the 3D mockup. Pure + unit-tested.
import { cupBoundingRadiusMm, CUP_CENTER_Y_MM } from "./cup";
import { cartonLayout, rollGeometry, toUnits, type RollPreset } from "./geometry";
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
    // Looking at the +x short end (tape folds down it), long side on the left, like the photo.
    const { radius, floorY } = cartonLayout(preset);
    return { radius, direction: [1.15, 0.8, 0.7], floorY };
  }
  if (view === "cup") {
    return { radius: toUnits(cupBoundingRadiusMm()), direction: [-0.3, 0.62, 1], floorY: -toUnits(CUP_CENTER_Y_MM) };
  }
  const g = rollGeometry(preset);
  const halfWidth = (g.width * 1.02) / 2;
  return { radius: Math.hypot(g.outerRadius, halfWidth), direction: [1.4, 0.9, 1.6], floorY: -halfWidth };
}
