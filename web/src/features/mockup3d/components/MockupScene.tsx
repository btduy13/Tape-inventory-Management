"use client";
// R3F scene. Client-only (loaded via next/dynamic ssr:false). Local lights only: no remote HDRs.
// Each object is its own lazy chunk; the camera is fitted to the object's bounding sphere.
import { lazy, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { fitDistance } from "../lib/camera";
import type { RollPreset } from "../lib/geometry";
import { installThreeConsoleFilter } from "../lib/three-console";
import { viewFrame, type MockupView } from "../lib/views";
import { FitCamera } from "./FitCamera";
import { TouchScrollPolicy } from "./TouchScrollPolicy";
import { ZoomPolicy } from "./ZoomPolicy";

export type { MockupView } from "../lib/views";

installThreeConsoleFilter();

const TapeRoll = lazy(() => import("./TapeRoll").then((m) => ({ default: m.TapeRoll })));
const CartonBox = lazy(() => import("./CartonBox").then((m) => ({ default: m.CartonBox })));
const DrinkCup = lazy(() => import("./DrinkCup").then((m) => ({ default: m.DrinkCup })));

const FOV = 40;
/** devicePixelRatio cap: sharp on retina, affordable on 3x phones. */
const MAX_DPR = 2;

export type MockupSceneProps = {
  view: MockupView;
  preset: RollPreset;
  source: HTMLCanvasElement | null;
  version: number;
  stripLengthMm: number;
  ariaLabel: string;
  fallback: React.ReactNode;
};

function SceneObject({ view, preset, source, version, stripLengthMm }: Omit<MockupSceneProps, "ariaLabel" | "fallback">) {
  if (view === "roll") return <TapeRoll preset={preset} source={source} version={version} stripLengthMm={stripLengthMm} />;
  if (view === "carton") return <CartonBox preset={preset} source={source} version={version} stripLengthMm={stripLengthMm} />;
  return <DrinkCup widthMm={preset.width_mm} source={source} version={version} stripLengthMm={stripLengthMm} />;
}

export default function MockupScene({ ariaLabel, fallback, ...rest }: MockupSceneProps) {
  const frame = viewFrame(rest.view, rest.preset);
  // Initial guess (4:3); FitCamera refines it for the real canvas aspect.
  const d = fitDistance(frame.radius, FOV, 4 / 3);
  return (
    <Canvas
      key={rest.view}
      aria-label={ariaLabel}
      role="img"
      dpr={[1, MAX_DPR]}
      frameloop="demand"
      camera={{ position: [0, 0, d], fov: FOV, near: 0.05, far: 100 }}
      resize={{ scroll: false, debounce: { scroll: 0, resize: 60 } }}
      style={{ position: "absolute", inset: 0 }}
      gl={{ antialias: true, preserveDrawingBuffer: false }}
      fallback={fallback}
    >
      <color attach="background" args={["#f5f5f4"]} />
      <hemisphereLight args={["#ffffff", "#d6cfc4", 0.9]} />
      <directionalLight position={[3, 5, 4]} intensity={1.5} />
      <directionalLight position={[-4, 2, -3]} intensity={0.45} />
      <directionalLight position={[0, -2, 4]} intensity={0.2} />
      <Suspense fallback={null}>
        <SceneObject {...rest} />
        <ContactShadows position={[0, frame.floorY - 0.001, 0]} scale={frame.radius * 3} opacity={0.35} blur={2.4} far={frame.radius * 2} />
      </Suspense>
      <FitCamera radius={frame.radius} direction={frame.direction} />
      {/* Zoom: pinch, Ctrl/⌘ + wheel or the +/− buttons; a plain wheel scrolls the page (ZoomPolicy). */}
      <OrbitControls makeDefault enablePan={false} enableZoom enableDamping rotateSpeed={0.9} zoomSpeed={0.8} />
      <TouchScrollPolicy />
      <ZoomPolicy />
    </Canvas>
  );
}
