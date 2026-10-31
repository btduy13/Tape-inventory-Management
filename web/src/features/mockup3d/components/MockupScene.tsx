"use client";
// R3F scene. Client-only (loaded via next/dynamic ssr:false). Local lights only: no remote HDRs.
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { RollPreset } from "../lib/geometry";
import { CartonBox } from "./CartonBox";
import { TapeRoll } from "./TapeRoll";

export type MockupView = "roll" | "carton";

export type MockupSceneProps = {
  view: MockupView;
  preset: RollPreset;
  source: HTMLCanvasElement | null;
  version: number;
  stripLengthMm: number;
  ariaLabel: string;
  fallback: React.ReactNode;
};

const CAMERA: Record<MockupView, [number, number, number]> = {
  roll: [1.4, 0.9, 1.6],
  carton: [4.2, 3.2, 4.6],
};

export default function MockupScene({ view, preset, source, version, stripLengthMm, ariaLabel, fallback }: MockupSceneProps) {
  return (
    <Canvas
      key={view}
      aria-label={ariaLabel}
      role="img"
      dpr={[1, 2]}
      camera={{ position: CAMERA[view], fov: 40, near: 0.05, far: 100 }}
      gl={{ antialias: true, preserveDrawingBuffer: false }}
      fallback={fallback}
    >
      <color attach="background" args={["#f5f5f4"]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} />
      <directionalLight position={[-4, 2, -3]} intensity={0.5} />
      {view === "roll" ? (
        <TapeRoll preset={preset} source={source} version={version} stripLengthMm={stripLengthMm} />
      ) : (
        <CartonBox widthMm={preset.width_mm} source={source} version={version} stripLengthMm={stripLengthMm} />
      )}
      <OrbitControls enablePan={false} enableDamping minDistance={view === "roll" ? 0.6 : 2} maxDistance={view === "roll" ? 4 : 12} />
    </Canvas>
  );
}
