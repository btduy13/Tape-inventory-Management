"use client";
// Carton box sealed with the designed tape across the top and down the front/back faces.
import { CARTON_MM, cartonTapeSegments, textureRepeat, toUnits, type CartonTapeSegment } from "../lib/geometry";
import { useStripTexture } from "./use-strip-texture";

const CARTON_COLOR = "#b8875a";

type Props = { widthMm: number; source: HTMLCanvasElement | null; version: number; stripLengthMm: number };

function TapeSegment({ seg, widthMm, source, version, stripLengthMm }: Props & { seg: CartonTapeSegment }) {
  const texture = useStripTexture(source, version, textureRepeat(seg.lengthMm, stripLengthMm));
  return (
    <mesh position={seg.position} rotation={seg.rotation}>
      <planeGeometry args={[toUnits(seg.lengthMm), toUnits(widthMm)]} />
      <meshStandardMaterial
        map={texture ?? undefined}
        color={texture ? "#ffffff" : "#d9c3a0"}
        roughness={0.35}
        transparent
        opacity={0.97}
        polygonOffset
        polygonOffsetFactor={-1}
      />
    </mesh>
  );
}

export function CartonBox(props: Props) {
  const { length, depth, height } = CARTON_MM;
  return (
    <group>
      <mesh>
        <boxGeometry args={[toUnits(length), toUnits(height), toUnits(depth)]} />
        <meshStandardMaterial color={CARTON_COLOR} roughness={0.95} />
      </mesh>
      {/* Flap seam line along the top */}
      <mesh position={[0, toUnits(height) / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.01, toUnits(depth)]} />
        <meshBasicMaterial color="#7a5533" />
      </mesh>
      {cartonTapeSegments().map((seg) => (
        <TapeSegment key={seg.name} seg={seg} {...props} />
      ))}
    </group>
  );
}
