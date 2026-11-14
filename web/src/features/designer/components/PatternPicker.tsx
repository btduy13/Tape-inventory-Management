"use client";
// Repeat pattern picker (pattern.ts) + repeat gap. Each option is a radio tile with a mini tape
// drawn in SVG attributes (CSP-safe), so the customer sees the layout before picking it.
import { useId } from "react";
import { getDictionary } from "@/i18n";
import { DESIGN_PATTERNS, type DesignPattern } from "@/lib/types";
import { MAX_REPEAT_GAP_PX } from "../lib/constants";
import { DIAGONAL_ANGLE, isTwoRowPattern } from "../lib/pattern";
import { useDesignState } from "./hooks";
import { RangeField } from "./RangeField";
import { chip, chipOff, chipOn, groupLabel, hint } from "./ui";

const px = (v: number) => `${Math.round(v)}px`;

/** Glyph positions (x, y, rotation) of each mini tape, in a 64 x 24 viewBox. */
const GLYPHS: Record<DesignPattern, readonly (readonly [number, number, number])[]> = {
  straight: [[12, 12, 0], [32, 12, 0], [52, 12, 0]],
  flip: [[12, 12, 0], [32, 12, 180], [52, 12, 0]],
  stagger: [[8, 7, 0], [28, 7, 0], [48, 7, 0], [18, 17, 0], [38, 17, 0], [58, 17, 0]],
  twoRows: [[12, 7, 0], [32, 7, 0], [52, 7, 0], [12, 17, 0], [32, 17, 0], [52, 17, 0]],
  diagonal: [[12, 12, DIAGONAL_ANGLE * 2], [32, 12, DIAGONAL_ANGLE * 2], [52, 12, DIAGONAL_ANGLE * 2]],
};

function PatternIcon({ pattern }: { pattern: DesignPattern }) {
  const small = isTwoRowPattern(pattern);
  return (
    <svg width="64" height="24" viewBox="0 0 64 24" aria-hidden="true">
      <rect x="0" y="1" width="64" height="22" rx="2" fill="currentColor" opacity="0.12" />
      {GLYPHS[pattern].map(([x, y, r], i) => (
        <text
          key={i}
          x={x}
          y={y}
          transform={r ? `rotate(${r} ${x} ${y})` : undefined}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={small ? 9 : 14}
          fontWeight="bold"
          fontFamily="Arial"
          fill="currentColor"
        >
          A
        </text>
      ))}
    </svg>
  );
}

export function PatternPicker() {
  const t = getDictionary();
  const d = t.designer;
  const id = useId();
  const [s, dispatch] = useDesignState();

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-2">
        <span id={`${id}-label`} className={groupLabel}>{d.pattern}</span>
        <div
          role="radiogroup"
          aria-labelledby={`${id}-label`}
          aria-describedby={`${id}-help`}
          className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3"
        >
          {DESIGN_PATTERNS.map((p) => {
            const on = s.pattern === p;
            return (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={on}
                data-pattern={p}
                onClick={() => dispatch({ type: "setPattern", pattern: p })}
                className={`${chip} h-16 flex-col gap-1 px-1 ${on ? chipOn : chipOff}`}
              >
                <PatternIcon pattern={p} />
                <span className="w-full truncate text-center text-xs leading-4">{t.designPattern[p]}</span>
              </button>
            );
          })}
        </div>
        <p id={`${id}-help`} className={hint}>
          {d.patternHelp[s.pattern]}
          {isTwoRowPattern(s.pattern) && ` ${d.patternTwoRowNote}`}
        </p>
      </div>
      <RangeField
        label={d.repeatGap}
        value={s.repeatGapPx}
        min={0}
        max={MAX_REPEAT_GAP_PX}
        display={px}
        onChange={(v) => dispatch({ type: "setRepeatGap", px: v })}
      />
    </div>
  );
}
