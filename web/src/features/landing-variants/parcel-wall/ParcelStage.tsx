"use client";
// Variant "parcel wall": one sealed object (carton, foam box, mailer, paper bag or cup) on a
// transparent canvas, swaying slowly. The sway is driven by the wall clock (not the canvas clock),
// so several stages on one page (the compare slider stacks two) stay in exactly the same pose.
// Client-only: load with next/dynamic ssr:false.
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import type { Group } from "three";
import { installThreeConsoleFilter } from "@/features/mockup3d/lib/three-console";
import { Item, useTapeTextures, type ItemKind, type ItemSize } from "./parcel-kit";

installThreeConsoleFilter();

const FOV = 30;
/** Size of each object and how steeply the camera looks down at it (flat things need a higher view). */
const SHOTS: Record<ItemKind, { size: ItemSize; pitch: number }> = {
  carton: { size: [0.46, 0.3, 0.34], pitch: 0.5 },
  foam: { size: [0.46, 0.32, 0.36], pitch: 0.5 },
  mailer: { size: [0.5, 0.055, 0.36], pitch: 0.78 },
  bag: { size: [0.3, 0.38, 0.15], pitch: 0.3 },
  cup: { size: [0.2, 0.32, 0.2], pitch: 0.36 },
};

function Swaying({ kind, source, version, withLabel, still }: { kind: ItemKind; source: HTMLCanvasElement | null; version: number; withLabel: boolean; still: boolean }) {
  const sources = useMemo(() => [source], [source]);
  const [tape] = useTapeTextures(sources, version);
  const ref = useRef<Group>(null);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const { size, pitch } = SHOTS[kind];
  useEffect(() => {
    // Fit the object's bounding sphere, seen from `pitch` above the horizon. The narrower of the
    // frame's two half-angles decides, so a portrait stage does not crop the object's sides.
    const vertical = (FOV * Math.PI) / 360;
    const half = Math.min(vertical, Math.atan(Math.tan(vertical) * (width / Math.max(1, height))));
    const distance = (0.5 * Math.hypot(...size) * 1.08) / Math.sin(half);
    camera.position.set(0, Math.sin(pitch) * distance, Math.cos(pitch) * distance);
    camera.lookAt(0, 0, 0);
    invalidate();
  }, [camera, invalidate, size, pitch, width, height]);
  useFrame(() => {
    if (ref.current) ref.current.rotation.y = -0.6 + (still ? 0 : Math.sin(performance.now() / 2600) * 0.42);
  });
  return (
    <group ref={ref}>
      <Item kind={kind} size={size} tape={tape} tint={1} withLabel={withLabel} />
    </group>
  );
}

export default function ParcelStage({
  kind = "carton",
  source,
  version,
  withLabel = true,
  ariaLabel,
}: {
  kind?: ItemKind;
  source: HTMLCanvasElement | null;
  version: number;
  withLabel?: boolean;
  ariaLabel: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(false);
  const [still] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={box} className="pointer-events-none absolute inset-0">
      <Canvas
        aria-label={ariaLabel}
        role="img"
        dpr={[1, 2]}
        frameloop={onScreen && !still ? "always" : "demand"}
        camera={{ position: [0, 0.7, 1.3], fov: FOV, near: 0.1, far: 20 }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[3, 5, 4]} intensity={1.6} />
        <directionalLight position={[-4, 2, -2]} intensity={0.35} />
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={3} position={[0, 4, 2]} scale={[8, 3, 1]} rotation={[-Math.PI / 2, 0, 0]} />
          <Lightformer form="rect" intensity={1.3} position={[-4, 1, 2]} scale={[2, 6, 1]} rotation={[0, Math.PI / 2, 0]} />
          <Lightformer form="rect" intensity={1} position={[4, 1, 2]} scale={[2, 6, 1]} rotation={[0, -Math.PI / 2, 0]} />
        </Environment>
        <Swaying key={kind} kind={kind} source={source} version={version} withLabel={withLabel} still={still} />
        <ContactShadows position={[0, -SHOTS[kind].size[1] / 2 - 0.001, 0]} scale={2.2} opacity={0.42} blur={2.4} far={1} />
      </Canvas>
    </div>
  );
}
