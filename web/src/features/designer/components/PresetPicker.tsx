"use client";
// Tape size (quy cách): width chips from the DB list + free roll length within the admin range.
import { useId, useState } from "react";
import { format, getDictionary } from "@/i18n";
import { lengthIssue, parseLengthInput } from "../lib/tape-spec";
import { useDesignContext } from "./DesignProvider";
import { useDesignState } from "./hooks";

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
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className="mb-1 text-sm font-semibold">{t.title}</legend>
      <div className="flex min-w-0 flex-col gap-1">
        <span id={`${lengthId}-w`} className="text-sm">{t.widthLegend}</span>
        <div role="radiogroup" aria-labelledby={`${lengthId}-w`} className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {spec.widths.map((w) => {
            const selected = w === state.preset.width_mm;
            // Mini strip: height proportional to tape width (max 16px).
            const h = Math.max(2, Math.round((w / widest) * 16));
            return (
              <button
                key={w}
                type="button"
                role="radio"
                aria-checked={selected}
                data-width={w}
                onClick={() => dispatch({ type: "setWidth", widthMm: w })}
                className={`flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-md border px-1 py-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 ${
                  selected ? "border-amber-700 bg-amber-50" : "border-neutral-300 hover:border-amber-500"
                }`}
              >
                <svg width="28" height="16" viewBox="0 0 28 16" aria-hidden="true">
                  <rect x="0" y={(16 - h) / 2} width="28" height={h} rx="1" fill={selected ? "#b45309" : "#c4a77d"} />
                </svg>
                <span className="text-sm font-bold tabular-nums">{format(t.widthOption, { width: w })}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor={lengthId} className="text-sm">{t.lengthLabel}</label>
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
          className={`h-11 w-40 rounded-md border px-3 text-base tabular-nums focus:outline-none ${
            issue ? "border-red-600 focus:border-red-700" : "border-neutral-300 focus:border-amber-600"
          }`}
        />
        <p id={`${lengthId}-help`} className={`text-xs ${issue ? "text-red-700" : "text-neutral-600"}`} role={issue ? "alert" : undefined}>
          {message ?? format(t.lengthHelp, { min: spec.minLengthM, max: spec.maxLengthM })}
        </p>
      </div>
    </fieldset>
  );
}
