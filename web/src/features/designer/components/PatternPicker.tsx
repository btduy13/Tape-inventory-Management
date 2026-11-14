"use client";
// Repeat pattern (pattern.ts), border lines (border.ts) and repeat gap. Options are radio tiles
// with a mini tape drawn in SVG attributes (CSP-safe), so the customer sees the layout first.
// Tapes under MIN_PATTERN_WIDTH_MM only print the straight pattern: the others are disabled.
import { useId } from "react";
import { format, getDictionary } from "@/i18n";
import { DESIGN_BORDER_STYLES, DESIGN_PATTERNS, type DesignBorderStyle, type DesignPattern } from "@/lib/types";
import { borderAllowed, maxBorderMm } from "../lib/border";
import { BORDER_MIN_MM, MAX_REPEAT_GAP_PX, MIN_PATTERN_WIDTH_MM } from "../lib/constants";
import { DIAGONAL_ANGLE, isAllOverPattern } from "../lib/pattern";
import { patternsAllowed } from "../lib/state";
import { useDesignState } from "./hooks";
import { RangeField } from "./RangeField";
import { chip, chipOff, chipOn, groupLabel, hint } from "./ui";

const px = (v: number) => `${Math.round(v)}px`;
const mm = (v: number) => `${v}mm`;

/** Glyphs (x, y, rotation) of each mini tape in a 64 x 24 viewBox; `cells` are filled blocks. */
type Mini = { glyphs: readonly (readonly [number, number, number])[]; cells?: readonly number[]; small?: boolean };
const A = DIAGONAL_ANGLE * 2;
const MINI: Record<DesignPattern, Mini> = {
  straight: { glyphs: [[12, 12, 0], [32, 12, 0], [52, 12, 0]] },
  flip: { glyphs: [[12, 12, 0], [32, 12, 180], [52, 12, 0]] },
  blocks: { glyphs: [[11, 12, 0], [32, 12, 0], [53, 12, 0]], cells: [0, 42] },
  brick: { small: true, glyphs: [[8, 3, 0], [28, 3, 0], [48, 3, 0], [18, 12, 0], [38, 12, 0], [58, 12, 0], [8, 21, 0], [28, 21, 0], [48, 21, 0]] },
  grid: { small: true, glyphs: [[10, 3, 0], [32, 3, 0], [54, 3, 0], [10, 12, 0], [32, 12, 0], [54, 12, 0], [10, 21, 0], [32, 21, 0], [54, 21, 0]] },
  diagonal: { small: true, glyphs: [[8, 4, A], [28, 4, A], [48, 4, A], [18, 14, A], [38, 14, A], [58, 14, A], [8, 23, A], [28, 23, A], [48, 23, A]] },
};

function PatternIcon({ pattern }: { pattern: DesignPattern }) {
  const m = MINI[pattern];
  return (
    <svg width="64" height="24" viewBox="0 0 64 24" aria-hidden="true">
      <defs>
        <clipPath id={`mini-${pattern}`}>
          <rect x="0" y="1" width="64" height="22" rx="2" />
        </clipPath>
      </defs>
      <g clipPath={`url(#mini-${pattern})`}>
        <rect x="0" y="1" width="64" height="22" fill="currentColor" opacity="0.12" />
        {m.cells?.map((x) => <rect key={x} x={x} y="1" width="22" height="22" fill="currentColor" opacity="0.85" />)}
        {m.glyphs.map(([x, y, r], i) => {
          const filled = m.cells?.some((c) => x >= c && x < c + 22);
          return (
            <text
              key={i}
              x={x}
              y={y}
              transform={r ? `rotate(${r} ${x} ${y})` : undefined}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={m.small ? 9 : 14}
              fontWeight="bold"
              fontFamily="Arial"
              fill="currentColor"
              opacity={filled ? 0.25 : 1}
            >
              A
            </text>
          );
        })}
      </g>
    </svg>
  );
}

function BorderIcon({ style }: { style: DesignBorderStyle }) {
  return (
    <svg width="40" height="20" viewBox="0 0 40 20" aria-hidden="true">
      <rect x="0" y="0" width="40" height="20" rx="2" fill="currentColor" opacity="0.12" />
      {style === "solid" && (
        <>
          <rect x="0" y="0" width="40" height="4" fill="currentColor" />
          <rect x="0" y="16" width="40" height="4" fill="currentColor" />
        </>
      )}
      {style === "stripes" &&
        [0, 16].map((y) => [-4, 4, 12, 20, 28, 36].map((x) => (
          <polygon key={`${y}-${x}`} points={`${x + 4},${y} ${x + 8},${y} ${x + 4},${y + 4} ${x},${y + 4}`} fill="currentColor" />
        )))}
    </svg>
  );
}

export function PatternPicker() {
  const t = getDictionary();
  const d = t.designer;
  const id = useId();
  const [s, dispatch] = useDesignState();
  const widthMm = s.preset.width_mm;
  const canPattern = patternsAllowed(widthMm);
  const canBorder = borderAllowed(widthMm);
  const maxBorder = maxBorderMm(widthMm);

  return (
    <div className="flex min-w-0 flex-col gap-5">
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
            const disabled = !canPattern && p !== "straight";
            return (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={disabled}
                data-pattern={p}
                onClick={() => dispatch({ type: "setPattern", pattern: p })}
                className={`${chip} h-16 flex-col gap-1 px-1 disabled:cursor-not-allowed disabled:opacity-40 ${on ? chipOn : chipOff}`}
              >
                <PatternIcon pattern={p} />
                <span className="w-full truncate text-center text-xs leading-4">{t.designPattern[p]}</span>
              </button>
            );
          })}
        </div>
        <p id={`${id}-help`} className={hint}>
          {canPattern ? d.patternHelp[s.pattern] : format(d.patternNarrow, { min: MIN_PATTERN_WIDTH_MM })}
          {canPattern && isAllOverPattern(s.pattern) && ` ${d.patternAllOverNote}`}
        </p>
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <span id={`${id}-border`} className={groupLabel}>{d.border}</span>
        <div role="radiogroup" aria-labelledby={`${id}-border`} aria-describedby={`${id}-border-help`} className="grid grid-cols-3 gap-2">
          {DESIGN_BORDER_STYLES.map((b) => {
            const on = s.border.style === b;
            return (
              <button
                key={b}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={!canBorder && b !== "none"}
                data-border={b}
                onClick={() => dispatch({ type: "setBorder", style: b })}
                className={`${chip} h-14 flex-col gap-1 px-1 disabled:cursor-not-allowed disabled:opacity-40 ${on ? chipOn : chipOff}`}
              >
                <BorderIcon style={b} />
                <span className="w-full truncate text-center text-xs leading-4">{t.designBorder[b]}</span>
              </button>
            );
          })}
        </div>
        <p id={`${id}-border-help`} className={hint}>
          {canBorder ? d.borderHelp : format(d.borderNarrow, { min: BORDER_MIN_MM })}
        </p>
        {canBorder && s.border.style !== "none" && maxBorder > BORDER_MIN_MM && (
          <RangeField
            label={d.borderWidth}
            value={s.border.widthMm}
            min={BORDER_MIN_MM}
            max={maxBorder}
            step={0.5}
            display={mm}
            onChange={(v) => dispatch({ type: "setBorder", widthMm: v })}
          />
        )}
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
