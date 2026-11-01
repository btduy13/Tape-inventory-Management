"use client";
// Zoom without trapping page scroll. A plain mouse wheel over the viewer keeps scrolling the
// page; Ctrl/⌘ + wheel (and trackpad pinch, which the browser reports as ctrlKey wheel) zooms.
// Touch pinch reaches OrbitControls directly. The +/− buttons outside the canvas dispatch a
// ZOOM_EVENT on the viewer element; zoom always stays inside OrbitControls' min/max distance.
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import type { Vector3 } from "three";
import { VIEWER_ATTR, ZOOM_EVENT } from "../lib/zoom";

type Controls = {
  target: Vector3;
  minDistance: number;
  maxDistance: number;
  update(): void;
};

export function ZoomPolicy() {
  const controls = useThree((s) => s.controls) as unknown as Controls | null;
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const canvas = useThree((s) => s.gl.domElement);

  useEffect(() => {
    if (!controls) return;
    const viewer = canvas.closest(`[${VIEWER_ATTR}]`);
    if (!(viewer instanceof HTMLElement)) return;

    // Capture on an ancestor runs before OrbitControls' own wheel listener on the canvas.
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) e.stopImmediatePropagation();
    };
    const onZoom = (e: Event) => {
      const factor = (e as CustomEvent<number>).detail;
      if (!Number.isFinite(factor) || factor <= 0) return;
      const offset = camera.position.clone().sub(controls.target);
      const next = Math.min(controls.maxDistance, Math.max(controls.minDistance, offset.length() * factor));
      camera.position.copy(controls.target).add(offset.setLength(next));
      controls.update();
      invalidate();
    };
    viewer.addEventListener("wheel", onWheel, { capture: true });
    viewer.addEventListener(ZOOM_EVENT, onZoom);
    return () => {
      viewer.removeEventListener("wheel", onWheel, { capture: true });
      viewer.removeEventListener(ZOOM_EVENT, onZoom);
    };
  }, [controls, camera, invalidate, canvas]);

  return null;
}
