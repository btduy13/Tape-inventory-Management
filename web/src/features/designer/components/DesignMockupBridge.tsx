"use client";
// Feeds the live designer canvas into the 3D mockup (mockup3d stays decoupled from the store).
import { useMemo } from "react";
import { TapeMockup3D, type ColorPickerBridge, type TapeMockup3DProps } from "@/features/mockup3d";
import { STRIP_LENGTH_MM } from "../lib/constants";
import { describePickedColor } from "../lib/picked-color";
import { clampLength } from "../lib/tape-spec";
import { useDesignContext } from "./DesignProvider";
import { useDesignState, useDesignTexture } from "./hooks";
import { useInks } from "./InkCounter";

/** Layout props are passed through to the 3D mockup (sizing is owned by the page layout). */
export type DesignMockupBridgeProps = Pick<TapeMockup3DProps, "className" | "aspect" | "mobileAspect" | "showTitle">;

export function DesignMockupBridge(props: DesignMockupBridgeProps) {
  const texture = useDesignTexture();
  const [s, dispatch] = useDesignState();
  const { spec } = useDesignContext();
  const inks = useInks();
  // 3D eyedropper: picked-colour facts (nearest swatch, counted ink) + "use for text / background".
  const { backgroundColor, textColor } = s;
  const colorPicker = useMemo<ColorPickerBridge>(
    () => ({
      backgroundColor,
      textColor,
      describe: (hex) => describePickedColor(hex, { backgroundColor, textColor, inks: inks.colors }),
      applyText: (hex) => dispatch({ type: "setColor", role: "textColor", color: hex }),
      applyBackground: (hex) => dispatch({ type: "setColor", role: "backgroundColor", color: hex }),
    }),
    [backgroundColor, textColor, inks.colors, dispatch],
  );
  // The roll radius follows the typed length; unfinished input is clamped into the allowed range.
  const lengthM = clampLength(spec, s.preset.length_m);
  return (
    <TapeMockup3D
      {...props}
      source={texture.canvas}
      version={texture.version}
      stripLengthMm={STRIP_LENGTH_MM}
      colorPicker={colorPicker}
      preset={{ width_mm: s.preset.width_mm, length_m: lengthM, thickness_mic: s.preset.thickness_mic }}
    />
  );
}
