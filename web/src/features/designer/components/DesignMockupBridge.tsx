"use client";
// Feeds the live designer canvas into the 3D mockup (mockup3d stays decoupled from the store).
import { TapeMockup3D } from "@/features/mockup3d";
import { STRIP_LENGTH_MM } from "../lib/constants";
import { useDesignState, useDesignTexture } from "./hooks";

export function DesignMockupBridge() {
  const texture = useDesignTexture();
  const [s] = useDesignState();
  return (
    <TapeMockup3D
      source={texture.canvas}
      version={texture.version}
      stripLengthMm={STRIP_LENGTH_MM}
      preset={{ width_mm: s.preset.width_mm, length_m: s.preset.length_m, thickness_mic: s.preset.thickness_mic }}
    />
  );
}
