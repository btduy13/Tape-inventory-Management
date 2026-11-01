"use client";
// Eyedropper inside the R3F canvas. While active: OrbitControls is disabled by MockupScene (so the
// picking click never rotates / zooms), the cursor is a crosshair, hover reports the colour under
// the pointer (one sample per frame) and a click / tap picks it.
// Tape surfaces (userData.tapePrint) report the TRUE design colour: the hit UV is mapped to the 2D
// source canvas exactly like the GPU texture lookup (lib/pick.ts). Anything else (box, cup, floor,
// background) falls back to the rendered, lit pixel: render once, then gl.readPixels in the same
// task (no preserveDrawingBuffer needed).
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Mesh, Raycaster, Vector2, type Material, type Texture } from "three";
import { cssToBufferPixel, rgbToHex, uvToPixel, type PickResult } from "../lib/pick";

const CROSSHAIR = "cursor-crosshair";

export type PickHandlers = {
  /** Hover sample (null: pointer left the canvas). x / y are viewport (client) coordinates. */
  onHover(pick: PickResult | null, clientX: number, clientY: number): void;
  onPick(pick: PickResult, clientX: number, clientY: number): void;
};

function designPixel(map: Texture | null | undefined, uv: Vector2): PickResult | null {
  const img = map?.image as HTMLCanvasElement | undefined;
  if (!map || !img || typeof img.getContext !== "function" || !img.width || !img.height) return null;
  const ctx = img.getContext("2d");
  if (!ctx) return null;
  const p = uvToPixel(uv, map, img.width, img.height);
  const [r, g, b] = ctx.getImageData(p.x, p.y, 1, 1).data;
  return { hex: rgbToHex(r, g, b), source: "design", pixel: p };
}

export function EyedropperPolicy({ active, handlers }: { active: boolean; handlers: PickHandlers }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    if (!active) return;
    const canvas = gl.domElement;
    // Tailwind class (scanned from this file); no inline style.
    canvas.classList.add(CROSSHAIR);
    const ray = new Raycaster();
    const ndc = new Vector2();

    const sample = (clientX: number, clientY: number): PickResult | null => {
      const rect = canvas.getBoundingClientRect();
      const cx = clientX - rect.left;
      const cy = clientY - rect.top;
      if (cx < 0 || cy < 0 || cx > rect.width || cy > rect.height) return null;
      ndc.set((cx / rect.width) * 2 - 1, -(cy / rect.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(scene.children, true).find((h) => h.object instanceof Mesh && h.object.visible);
      if (hit?.object.userData.tapePrint && hit.uv) {
        const material = (hit.object as Mesh).material as Material & { map?: Texture | null };
        const design = designPixel(material.map, hit.uv);
        if (design) return design;
      }
      // Not on the tape: the displayed (lit, tone-mapped) colour of the render.
      gl.render(scene, camera);
      const ctx = gl.getContext();
      const px = cssToBufferPixel(cx, cy, rect.width, rect.height, ctx.drawingBufferWidth, ctx.drawingBufferHeight);
      if (!px) return null;
      const out = new Uint8Array(4);
      ctx.readPixels(px.x, px.y, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, out);
      return { hex: rgbToHex(out[0], out[1], out[2]), source: "render" };
    };

    let frame = 0;
    let last: { x: number; y: number } | null = null;
    const onMove = (e: PointerEvent) => {
      last = { x: e.clientX, y: e.clientY };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (last) handlers.onHover(sample(last.x, last.y), last.x, last.y);
      });
    };
    const onLeave = () => {
      last = null;
      handlers.onHover(null, 0, 0);
    };
    const onClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const pick = sample(e.clientX, e.clientY);
      if (pick) handlers.onPick(pick, e.clientX, e.clientY);
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("click", onClick);
    return () => {
      cancelAnimationFrame(frame);
      canvas.classList.remove(CROSSHAIR);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("click", onClick);
      handlers.onHover(null, 0, 0);
    };
  }, [active, handlers, gl, scene, camera]);

  return null;
}
