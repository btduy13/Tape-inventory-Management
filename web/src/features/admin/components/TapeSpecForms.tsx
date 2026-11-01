"use client";
// Tape size admin forms (widths list + length range). Server Actions re-check admin + zod.
import { useActionState } from "react";
import { format, getDictionary } from "@/i18n";
import type { TapeSpecSettings, TapeWidth } from "@/lib/types";
import { IDLE } from "../lib/schemas";
import {
  addWidthAction, deleteWidthAction, moveWidthAction, saveLengthLimitsAction, toggleWidthAction,
} from "../server/actions-tape-specs";
import { ActionMessage, field, primaryButton, secondaryButton } from "./ui";

const t = getDictionary();
const small = "rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-100 disabled:opacity-40";

export function AddWidthForm() {
  const [state, action, pending] = useActionState(addWidthAction, IDLE);
  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-neutral-600">
          {t.tapeSpec.widthMm}
          <input name="widthMm" type="number" step="1" min="1" max="200" required className={"w-28 " + field} />
        </label>
        <button type="submit" disabled={pending} className={primaryButton}>{t.tapeSpec.addWidth}</button>
      </div>
      <ActionMessage state={state} />
    </form>
  );
}

type RowProps = { width: TapeWidth; isFirst: boolean; isLast: boolean };

/** One width: enable/disable, move up/down, delete. Each button is its own small form. */
export function WidthRow({ width, isFirst, isLast }: RowProps) {
  const [toggleState, toggle, toggling] = useActionState(toggleWidthAction, IDLE);
  const [moveState, move, moving] = useActionState(moveWidthAction, IDLE);
  const [deleteState, remove, removing] = useActionState(deleteWidthAction, IDLE);
  const busy = toggling || moving || removing;
  const errorState = [toggleState, moveState, deleteState].find((s) => s.status === "error") ?? IDLE;
  return (
    <li className="flex flex-col gap-1 border-t border-neutral-100 py-2 first:border-t-0" data-width={width.width_mm}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`w-20 font-semibold tabular-nums ${width.is_active ? "" : "text-neutral-400 line-through"}`}>
          {format(t.tapeSpec.widthOption, { width: width.width_mm })}
        </span>
        {!width.is_active && <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">{t.tapeSpec.disabled}</span>}
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <form action={move}>
            <input type="hidden" name="id" value={width.id} />
            <input type="hidden" name="direction" value="up" />
            <button type="submit" disabled={busy || isFirst} className={small} aria-label={`${t.tapeSpec.moveUp} ${width.width_mm} mm`}>
              ↑ {t.tapeSpec.moveUp}
            </button>
          </form>
          <form action={move}>
            <input type="hidden" name="id" value={width.id} />
            <input type="hidden" name="direction" value="down" />
            <button type="submit" disabled={busy || isLast} className={small} aria-label={`${t.tapeSpec.moveDown} ${width.width_mm} mm`}>
              ↓ {t.tapeSpec.moveDown}
            </button>
          </form>
          <form action={toggle}>
            <input type="hidden" name="id" value={width.id} />
            <input type="hidden" name="isActive" value={width.is_active ? "false" : "true"} />
            <button type="submit" disabled={busy} className={small}>
              {width.is_active ? t.tapeSpec.disable : t.tapeSpec.enable}
            </button>
          </form>
          <form
            action={remove}
            onSubmit={(e) => {
              if (!window.confirm(format(t.tapeSpec.removeConfirm, { width: width.width_mm }))) e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={width.id} />
            <button type="submit" disabled={busy} className={small + " text-red-700"}>{t.tapeSpec.remove}</button>
          </form>
        </div>
      </div>
      <ActionMessage state={errorState} />
    </li>
  );
}

export function LengthLimitsForm({ settings }: { settings: TapeSpecSettings | null }) {
  const [state, action, pending] = useActionState(saveLengthLimitsAction, IDLE);
  const num = "w-28 " + field;
  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-neutral-600">
          {t.tapeSpec.minLength}
          <input name="minLengthM" type="number" step="0.1" min="0.1" max="10000" required defaultValue={settings?.min_length_m} className={num} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-600">
          {t.tapeSpec.maxLength}
          <input name="maxLengthM" type="number" step="0.1" min="0.1" max="10000" required defaultValue={settings?.max_length_m} className={num} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-600">
          {t.tapeSpec.thickness}
          <input name="thicknessMic" type="number" step="0.1" min="0.1" max="200" required defaultValue={settings?.thickness_mic ?? 45} className={num} />
        </label>
        <button type="submit" disabled={pending} className={secondaryButton}>{t.common.save}</button>
      </div>
      <ActionMessage state={state} />
    </form>
  );
}
