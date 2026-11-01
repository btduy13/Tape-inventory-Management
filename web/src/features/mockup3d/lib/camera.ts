// Camera framing helpers: fit a bounding sphere inside a perspective frustum. Pure + unit-tested.

export type Vec3 = [number, number, number];

/**
 * Distance from the target at which a sphere of `radius` fits the view, using the
 * tighter of the vertical and horizontal fields of view (works on narrow phones too).
 */
export function fitDistance(radius: number, fovDeg: number, aspect: number, margin = 1.15): number {
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

/** Orbit zoom limits around the fitted distance (kept relative so every aspect behaves the same). */
export function orbitLimits(distance: number): { min: number; max: number } {
  return { min: distance * 0.55, max: distance * 1.8 };
}

/**
 * Direction to re-fit along: the view's default when the view (framing) changed, otherwise the
 * direction the user orbited to, so a resize / orientation change keeps the angle but re-fits.
 */
export function refitDirection(current: Vec3 | null, fallback: Vec3): Vec3 {
  if (!current) return fallback;
  const len = Math.hypot(...current);
  return len > 1e-6 && current.every(Number.isFinite) ? current : fallback;
}
