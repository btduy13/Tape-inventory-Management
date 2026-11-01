"use client";
// White paper cup with a black lid, sealed by a narrow vertical strip of the designed tape
// running from the lid top, over the rim and down the tapered wall (seal label).
// Geometry is procedural (LatheGeometry + ribbon): no model files.
import { useMemo } from "react";
import { DoubleSide, Vector2 } from "three";
import { CUP_CENTER_Y_MM, cupLidProfile, cupStripRibbon, cupWallProfile, type Pt } from "../lib/cup";
import { toUnits } from "../lib/geometry";
import { TapeRibbon } from "./TapeRibbon";

const SEGMENTS = 72;

type Props = { widthMm: number; source: HTMLCanvasElement | null; version: number; stripLengthMm: number };

const toPoints = (pts: Pt[]) => pts.map(([x, y]) => new Vector2(toUnits(x), toUnits(y)));

export function DrinkCup({ widthMm, source, version, stripLengthMm }: Props) {
  const wall = useMemo(() => toPoints(cupWallProfile()), []);
  const lid = useMemo(() => toPoints(cupLidProfile()), []);
  const strip = useMemo(() => cupStripRibbon(widthMm, stripLengthMm), [widthMm, stripLengthMm]);
  return (
    <group position={[0, -toUnits(CUP_CENTER_Y_MM), 0]}>
      <mesh>
        <latheGeometry args={[wall, SEGMENTS]} />
        <meshStandardMaterial color="#f7f6f2" roughness={0.55} side={DoubleSide} />
      </mesh>
      <mesh>
        <latheGeometry args={[lid, SEGMENTS]} />
        <meshPhysicalMaterial color="#141414" roughness={0.35} clearcoat={0.5} side={DoubleSide} />
      </mesh>
      <TapeRibbon data={strip} source={source} version={version} />
    </group>
  );
}
