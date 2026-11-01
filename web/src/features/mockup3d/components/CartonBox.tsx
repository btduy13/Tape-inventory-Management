"use client";
// Kraft carton sealed with one straight strip of the designed tape along the top seam
// (full length), folding down over both short end faces; a tape roll stands on the strip.
import { useMemo } from "react";
import { CARTON_MM, cartonLayout, cartonStripRows, toUnits, type RollPreset } from "../lib/geometry";
import { buildRibbon } from "../lib/ribbon";
import { TapeRibbon } from "./TapeRibbon";
import { TapeRoll } from "./TapeRoll";

const CARTON_COLOR = "#c39a68";
const SEAM_COLOR = "#7a5530";

type Props = { preset: RollPreset; source: HTMLCanvasElement | null; version: number; stripLengthMm: number };

export function CartonBox({ preset, source, version, stripLengthMm }: Props) {
  const { length, depth, height } = CARTON_MM;
  const h2 = toUnits(height) / 2;
  const layout = cartonLayout(preset);
  const strip = useMemo(
    () => buildRibbon(cartonStripRows(preset.width_mm), stripLengthMm > 0 ? stripLengthMm : 300),
    [preset.width_mm, stripLengthMm],
  );
  return (
    <group position={[0, layout.offsetY, 0]}>
      <mesh>
        <boxGeometry args={[toUnits(length), toUnits(height), toUnits(depth)]} />
        <meshStandardMaterial color={CARTON_COLOR} roughness={0.92} />
      </mesh>
      {/* Flap seam along the top (under the tape) and flap fold lines on the long faces */}
      <mesh position={[0, h2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[toUnits(length), 0.01]} />
        <meshBasicMaterial color={SEAM_COLOR} />
      </mesh>
      {[1, -1].map((side) => (
        <mesh key={side} position={[0, h2 - 0.004, side * (toUnits(depth) / 2 + 0.002)]} rotation={[0, side > 0 ? 0 : Math.PI, 0]}>
          <planeGeometry args={[toUnits(length), 0.008]} />
          <meshBasicMaterial color={SEAM_COLOR} transparent opacity={0.45} />
        </mesh>
      ))}
      <TapeRibbon data={strip} source={source} version={version} />
      <group position={layout.rollPosition} rotation={[Math.PI / 2, 0, 0]}>
        <TapeRoll preset={preset} source={source} version={version} stripLengthMm={stripLengthMm} />
      </group>
    </group>
  );
}
