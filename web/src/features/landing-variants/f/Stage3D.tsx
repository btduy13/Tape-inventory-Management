"use client";
// Variant F product stage: the shared 3D tape roll / carton / cup on a transparent canvas with
// soft studio lighting (local Lightformers, no remote HDR) and a contact shadow.
// Client-only: load with next/dynamic ssr:false. Renders continuously only while on screen.
import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import type { Group } from "three";
import { CartonBox } from "@/features/mockup3d/components/CartonBox";
import { DrinkCup } from "@/features/mockup3d/components/DrinkCup";
import { FitCamera } from "@/features/mockup3d/components/FitCamera";
import { TapeRoll } from "@/features/mockup3d/components/TapeRoll";
import { TouchScrollPolicy } from "@/features/mockup3d/components/TouchScrollPolicy";
import { rollGeometry, type RollPreset } from "@/features/mockup3d/lib/geometry";
import { installThreeConsoleFilter } from "@/features/mockup3d/lib/three-console";
import { viewFrame, type ViewFrame } from "@/features/mockup3d/lib/views";

installThreeConsoleFilter();

/** "wheel" = the hero roll: lying flat, seen from a low angle so the print reads left to right. */
export type StageView = "wheel" | "roll" | "carton" | "cup";

export type Stage3DProps = {
  view: StageView;
  preset: RollPreset;
  source: HTMLCanvasElement | null;
  version: number;
  stripLengthMm: number;
  tapeColor?: string;
  ariaLabel: string;
  /** Drag to orbit (carton / cup). Off = decorative, the page scrolls straight through it. */
  interactive?: boolean;
  /** Tips the hero roll toward the camera as the page scrolls (shows the core). */
  scrollTilt?: boolean;
};

const FOV = 32;
const SPIN = 0.45; // rad/s

function frameFor(view: StageView, preset: RollPreset): ViewFrame {
  if (view !== "wheel") return viewFrame(view, preset);
  const g = rollGeometry(preset);
  // a flat disc fills far less than its bounding sphere: frame it tighter
  return { radius: Math.hypot(g.outerRadius, g.width / 2) * 0.8, direction: [0.2, 0.34, 1], floorY: -g.width / 2 };
}

/** Rotates its children around the roll axis; the hero also tips forward with the scroll position. */
function Turning({ spin, scrollTilt, children }: { spin: boolean; scrollTilt: boolean; children: React.ReactNode }) {
  const yaw = useRef<Group>(null);
  const axis = useRef<Group>(null);
  useFrame((_, dt) => {
    if (spin && axis.current) axis.current.rotation.y += Math.min(dt, 0.05) * SPIN;
    if (scrollTilt && yaw.current) yaw.current.rotation.x = Math.min(1, window.scrollY / 700) * 0.6;
  });
  return (
    <group ref={yaw}>
      <group ref={axis}>{children}</group>
    </group>
  );
}

export default function Stage3D({ view, preset, source, version, stripLengthMm, tapeColor, ariaLabel, interactive = false, scrollTilt = false }: Stage3DProps) {
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

  const frame = frameFor(view, preset);
  const spin = !still && (view === "wheel" || view === "roll");
  const roll = <TapeRoll preset={preset} source={source} version={version} stripLengthMm={stripLengthMm} tapeColor={tapeColor} />;

  return (
    <div ref={box} className={`absolute inset-0 ${interactive ? "" : "pointer-events-none"}`}>
      <Canvas
        key={view}
        aria-label={ariaLabel}
        role="img"
        dpr={[1, 2]}
        frameloop={onScreen && (spin || interactive) ? "always" : "demand"}
        camera={{ position: [0, 0, 5], fov: FOV, near: 0.05, far: 100 }}
        resize={{ scroll: false, debounce: { scroll: 0, resize: 60 } }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 5, 4]} intensity={1.5} />
        <directionalLight position={[-4, 2, -2]} intensity={0.35} />
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={3} position={[0, 4, 2]} scale={[8, 3, 1]} rotation={[-Math.PI / 2, 0, 0]} />
          <Lightformer form="rect" intensity={1.4} position={[-4, 1, 2]} scale={[2, 6, 1]} rotation={[0, Math.PI / 2, 0]} />
          <Lightformer form="rect" intensity={1} position={[4, 1, 2]} scale={[2, 6, 1]} rotation={[0, -Math.PI / 2, 0]} />
        </Environment>
        <Suspense fallback={null}>
          {view === "wheel" && (
            <Turning spin={spin} scrollTilt={scrollTilt && !still}>
              {roll}
            </Turning>
          )}
          {view === "roll" && (
            <Turning spin={spin} scrollTilt={false}>
              {roll}
            </Turning>
          )}
          {view === "carton" && <CartonBox preset={preset} source={source} version={version} stripLengthMm={stripLengthMm} />}
          {view === "cup" && <DrinkCup widthMm={preset.width_mm} source={source} version={version} stripLengthMm={stripLengthMm} />}
          <ContactShadows position={[0, frame.floorY - 0.001, 0]} scale={frame.radius * 4} opacity={0.42} blur={2.6} far={frame.radius * 2} />
        </Suspense>
        <FitCamera radius={frame.radius} direction={frame.direction} />
        {interactive && (
          <>
            <OrbitControls makeDefault enablePan={false} enableZoom={false} enableDamping rotateSpeed={0.9} autoRotate={!still} autoRotateSpeed={0.9} />
            <TouchScrollPolicy />
          </>
        )}
      </Canvas>
    </div>
  );
}
