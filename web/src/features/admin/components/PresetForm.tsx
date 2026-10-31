"use client";
import { useActionState } from "react";
import { getDictionary } from "@/i18n";
import type { TapePreset } from "@/lib/types";
import { savePresetAction } from "../server/actions-presets";
import { IDLE } from "../lib/schemas";
import { ActionMessage, field, primaryButton, secondaryButton } from "./ui";

const t = getDictionary();

/** Create (no preset) or edit one tape_presets row. */
export function PresetForm({ preset }: { preset?: TapePreset }) {
  const [state, action, pending] = useActionState(savePresetAction, IDLE);
  const num = "w-24 " + field;
  return (
    <form action={action} className="flex flex-col gap-2 border-t border-neutral-100 py-3 first:border-t-0">
      <input type="hidden" name="id" value={preset?.id ?? ""} />
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-neutral-600">
          {t.admin.presetLabel}
          <input name="label" required maxLength={80} defaultValue={preset?.label} className={"w-56 " + field} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-600">
          {t.admin.widthMm}
          <input name="widthMm" type="number" step="0.1" min="0.1" max="200" required defaultValue={preset?.width_mm} className={num} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-600">
          {t.admin.lengthM}
          <input name="lengthM" type="number" step="0.1" min="0.1" max="2000" required defaultValue={preset?.length_m} className={num} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-600">
          {t.admin.thicknessMic}
          <input name="thicknessMic" type="number" step="0.1" min="0.1" max="200" required defaultValue={preset?.thickness_mic} className={num} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-600">
          {t.admin.sortOrder}
          <input name="sortOrder" type="number" step="1" defaultValue={preset?.sort_order ?? 0} className={"w-20 " + field} />
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={preset?.is_active ?? true} />
          {t.admin.active}
        </label>
        <button type="submit" disabled={pending} className={preset ? secondaryButton : primaryButton}>
          {preset ? t.common.save : t.admin.addPreset}
        </button>
      </div>
      <ActionMessage state={state} />
    </form>
  );
}
