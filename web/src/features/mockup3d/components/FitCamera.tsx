"use client";
// Frames the current object: places the camera so its bounding sphere fits the canvas
// (tighter of vertical/horizontal FOV, so nothing is clipped on narrow screens).
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import type { PerspectiveCamera } from "three";
import { cameraPosition, fitDistance, type Vec3 } from "../lib/camera";

type Controls = { target: { set(x: number, y: number, z: number): void }; update(): void };

export function FitCamera({ radius, direction }: { radius: number; direction: Vec3 }) {
  const get = useThree((s) => s.get);
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const controlsReady = useThree((s) => s.controls !== null);
  const [dx, dy, dz] = direction;

  useEffect(() => {
    // Read the live store inside the effect: three objects are mutated imperatively.
    const state = get();
    const camera = state.camera as PerspectiveCamera;
    const controls = state.controls as unknown as Controls | null;
    const distance = fitDistance(radius, camera.fov, aspect);
    camera.position.set(...cameraPosition([dx, dy, dz], distance));
    camera.near = Math.max(0.01, distance / 100);
    camera.far = distance * 10;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    controls?.target.set(0, 0, 0);
    controls?.update();
    state.invalidate();
  }, [get, aspect, controlsReady, radius, dx, dy, dz]);

  return null;
}
