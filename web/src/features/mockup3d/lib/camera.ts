// Camera framing helpers: fit a bounding sphere inside a perspective frustum. Pure + unit-tested.

export type Vec3 = [number, number, number];

/**
 * Distance from the target at which a sphere of `radius` fits the view, using the
 * tighter of the vertical and horizontal fields of view (works on narrow phones too).
 */
export function fitDistance(radius: number, fovDeg: number, aspect: number, margin = 1.08): number {
  const r = Math.max(0.01, radius);
  const vHalf = ((Math.min(Math.max(fovDeg, 1), 179) * Math.PI) / 180) / 2;
  const hHalf = Math.atan(Math.tan(vHalf) * (aspect > 0 ? aspect : 1));
  return (r * margin) / Math.sin(Math.min(vHalf, hHalf));
}

/** Point at `distance` from `target` along `direction` (need not be normalised). */
export function cameraPosition(direction: Vec3, distance: number, target: Vec3 = [0, 0, 0]): Vec3 {
  const len = Math.hypot(...direction) || 1;
  return [0, 1, 2].map((i) => target[i] + (direction[i] / len) * distance) as Vec3;
}
