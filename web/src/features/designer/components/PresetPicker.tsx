"use client";
// Tape size (quy cách): width chips from the DB list + free roll length within the admin range.
import { useId, useState } from "react";
import { format, getDictionary } from "@/i18n";
import { lengthIssue, parseLengthInput } from "../lib/tape-spec";
import { useDesignContext } from "./DesignProvider";
import { useDesignState } from "./hooks";
import { chip, chipOff, chipOn, groupLabel, hint, input } from "./ui";

export function PresetPicker() {
  const t = getDictionary().tapeSpec;
  const { spec } = useDesignContext();
  const [state, dispatch] = useDesignState();
  const lengthId = useId();
  const widest = Math.max(...spec.widths);
  // Raw text so the customer can type freely; the store gets the parsed value (NaN while invalid).
  const [lengthText, setLengthText] = useState(() => String(state.preset.length_m));
  const issue = lengthIssue(spec, parseLengthInput(lengthText));
  const message =
    issue === "tooShort"
      ? format(t.lengthTooShort, { min: spec.minLengthM })
      : issue === "tooLong"
        ? format(t.lengthTooLong, { max: spec.maxLengthM })
        : issue === "invalid"
          ? t.lengthInvalid
          : null;

  return (
    <fieldset className="flex min-w-0 flex-col gap-5">
      <legend className="sr-only">{t.title}</legend>
      <div className="flex min-w-0 flex-col gap-2">
        <span id={`${lengthId}-w`} className={groupLabel}>{t.widthLegend}</span>
        <div role="radiogroup" aria-labelledby={`${lengthId}-w`} className="grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5">
          {spec.widths.map((w) => {
            const selected = w === state.preset.width_mm;
            // Mini strip: height proportional to tape width (max 14px).
            const h = Math.max(2, Math.round((w / widest) * 14));
            return (
              <button
                key={w}
                type="button"
                role="radio"
                aria-checked={selected}
                data-width={w}
                onClick={() => dispatch({ type: "setWidth", widthMm: w })}
                className={`${chip} h-14 flex-col gap-1.5 px-1 ${selected ? chipOn : chipOff}`}
              >
                <svg width="28" height="14" viewBox="0 0 28 14" aria-hidden="true">
                  <rect x="0" y={(14 - h) / 2} width="28" height={h} rx="1" fill={selected ? "#fbbf24" : "#c4a77d"} />
                </svg>
                <span className="text-sm font-semibold tabular-nums">{format(t.widthOption, { width: w })}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <label htmlFor={lengthId} className={groupLabel}>{t.lengthLabel}</label>
        <input
          id={lengthId}
          name="tapeLengthM"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={lengthText}
          aria-invalid={issue !== null}
          aria-describedby={`${lengthId}-help`}
          onChange={(e) => {
            setLengthText(e.target.value);
            dispatch({ type: "setLength", lengthM: parseLengthInput(e.target.value) });
          }}
          className={`${input} max-w-40 tabular-nums ${issue ? "border-red-600 focus:border-red-700 focus:ring-red-600/15" : ""}`}
        />
        <p id={`${lengthId}-help`} className={issue ? "text-xs leading-5 font-medium text-red-700" : hint} role={issue ? "alert" : undefined}>
          {message ?? format(t.lengthHelp, { min: spec.minLengthM, max: spec.maxLengthM })}
        </p>
      </div>
    </fieldset>
  );
}
