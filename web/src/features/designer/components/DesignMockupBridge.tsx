"use client";
// Feeds the live designer canvas into the 3D mockup (mockup3d stays decoupled from the store).
import { TapeMockup3D, type TapeMockup3DProps } from "@/features/mockup3d";
import { STRIP_LENGTH_MM } from "../lib/constants";
import { clampLength } from "../lib/tape-spec";
import { useDesignContext } from "./DesignProvider";
import { useDesignState, useDesignTexture } from "./hooks";

/** Layout props are passed through to the 3D mockup (sizing is owned by the page layout). */
export type DesignMockupBridgeProps = Pick<TapeMockup3DProps, "className" | "aspect" | "mobileAspect" | "showTitle">;

export function DesignMockupBridge(props: DesignMockupBridgeProps) {
  const texture = useDesignTexture();
  const [s] = useDesignState();
  const { spec } = useDesignContext();
  // The roll radius follows the typed length; unfinished input is clamped into the allowed range.
  const lengthM = clampLength(spec, s.preset.length_m);
  return (
    <TapeMockup3D
      {...props}
      source={texture.canvas}
      version={texture.version}
      stripLengthMm={STRIP_LENGTH_MM}
      preset={{ width_mm: s.preset.width_mm, length_m: lengthM, thickness_mic: s.preset.thickness_mic }}
    />
  );
}
