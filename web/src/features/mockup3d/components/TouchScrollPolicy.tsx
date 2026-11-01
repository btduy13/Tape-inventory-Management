"use client";
// Lets the page scroll over the 3D canvas on touch screens. OrbitControls sets
// `touch-action: none` (traps every swipe); `pan-y` hands vertical swipes back to the browser
// (it cancels the pointer, so the model does not move) while horizontal one-finger drags still
// rotate the model.
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

export function TouchScrollPolicy() {
  const controls = useThree((s) => s.controls) as unknown as { domElement?: HTMLElement | null } | null;
  const canvas = useThree((s) => s.gl.domElement);
  useEffect(() => {
    const targets = [canvas, controls?.domElement].filter((el): el is HTMLElement => Boolean(el));
    for (const el of targets) el.style.touchAction = "pan-y";
  }, [canvas, controls]);
  return null;
}
