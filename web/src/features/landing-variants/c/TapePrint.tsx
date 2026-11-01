// Repeating print run for one tape strip, drawn in local strip coordinates:
// x = along the tape (0..length), y = across the tape (0..thick). Callers place it with
// an SVG transform and clip it to the strip. Colours are SVG fill attributes (CSP-safe).
import { TAPE_FONT } from "./tape";

type Props = {
  text: string;
  length: number;
  thick: number;
  fg: string;
  accent: string;
  /** shift the run so the strip does not always start on a word */
  offset?: number;
};

export function TapePrint({ text, length, thick, fg, accent, offset = 0 }: Props) {
  const fs = thick * 0.5;
  const itemW = Math.max(text.length, 2) * fs * 0.64;
  const gap = fs * 1.5;
  const step = itemW + gap;
  const count = Math.ceil((length + Math.abs(offset)) / step) + 1;
  const baseline = thick / 2 + fs * 0.36;
  const d = fs * 0.22;
  const items = [];
  for (let i = 0; i < count; i++) {
    const x = i * step - offset;
    const cx = x + itemW + gap / 2;
    const cy = thick / 2;
    items.push(
      <g key={i}>
        <text
          x={x}
          y={baseline}
          fontSize={fs}
          fontWeight={900}
          fontFamily={TAPE_FONT}
          fill={fg}
          textLength={itemW}
          lengthAdjust="spacingAndGlyphs"
        >
          {text}
        </text>
        <path d={`M${cx} ${cy - d}L${cx + d} ${cy}L${cx} ${cy + d}L${cx - d} ${cy}Z`} fill={accent} />
      </g>,
    );
  }
  return <g>{items}</g>;
}
