"use client";
// Frames the current object: places the camera so its bounding sphere fits the canvas
// (tighter of vertical/horizontal FOV, so nothing is clipped on narrow screens). Re-fits on
// every canvas resize / orientation change, keeping the angle the user orbited to; a new view
// (new framing) resets to that view's default angle.
import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import type { PerspectiveCamera } from "three";
import { cameraPosition, fitDistance, orbitLimits, refitDirection, type Vec3 } from "../lib/camera";

type Controls = {
  target: { x: number; y: number; z: number; set(x: number, y: number, z: number): void };
  minDistance: number;
  maxDistance: number;
  update(): void;
};

export function FitCamera({ radius, direction }: { radius: number; direction: Vec3 }) {
  const get = useThree((s) => s.get);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const controlsReady = useThree((s) => s.controls !== null);
  const [dx, dy, dz] = direction;
  const framing = `${radius}|${dx}|${dy}|${dz}`;
  const lastFraming = useRef<string | null>(null);

  useEffect(() => {
    if (width < 1 || height < 1) return;
    // Read the live store inside the effect: three objects are mutated imperatively.
    const state = get();
    const camera = state.camera as PerspectiveCamera;
    const controls = state.controls as unknown as Controls | null;
    const sameFraming = lastFraming.current === framing;
    lastFraming.current = framing;
    const current: Vec3 | null = sameFraming ? [camera.position.x, camera.position.y, camera.position.z] : null;
    const dir = refitDirection(current, [dx, dy, dz]);
    camera.aspect = width / height;
    const distance = fitDistance(radius, camera.fov, camera.aspect);
    camera.position.set(...cameraPosition(dir, distance));
    camera.near = Math.max(0.01, distance / 100);
    camera.far = distance * 10;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    if (controls) {
      const { min, max } = orbitLimits(distance);
      controls.minDistance = min;
      controls.maxDistance = max;
      controls.target.set(0, 0, 0);
      controls.update();
    }
    state.invalidate();
  }, [get, width, height, controlsReady, framing, radius, dx, dy, dz]);

  return null;
}
