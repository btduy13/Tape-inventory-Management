"use client";
// Row actions: edit in a dialog, quick show / hide (same savePresetAction with the row's values).
import { useActionState, useState } from "react";
import { getDictionary } from "@/i18n";
import type { TapePreset } from "@/lib/types";
import { InlineStatus } from "@/features/portal-ui/components/States";
import { Toast, type ToastMessage } from "@/features/portal-ui/components/Toast";
import { buttonClass } from "@/features/portal-ui/components/styles";
import { IDLE } from "../../lib/schemas";
import { savePresetAction } from "../../server/actions-presets";
import { nextToast, useOnSuccess } from "../useOnSuccess";
import { EditPresetDialog } from "./PresetForm";

const a = getDictionary().adminUi;

export function PresetActions({ preset }: { preset: TapePreset }) {
  const [state, action, pending] = useActionState(savePresetAction, IDLE);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  useOnSuccess(state, (message) => message && setToast(nextToast(message)));
  return (
    <div className="pt-row-raise flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <EditPresetDialog preset={preset} />
        <form action={action}>
          <input type="hidden" name="id" value={preset.id} />
          <input type="hidden" name="label" value={preset.label} />
          <input type="hidden" name="widthMm" value={String(preset.width_mm)} />
          <input type="hidden" name="lengthM" value={String(preset.length_m)} />
          <input type="hidden" name="thicknessMic" value={String(preset.thickness_mic)} />
          <input type="hidden" name="sortOrder" value={String(preset.sort_order)} />
          <input type="hidden" name="isActive" value={preset.is_active ? "false" : "true"} />
          <button type="submit" disabled={pending} className={buttonClass("ghost", "sm")}>
            {preset.is_active ? a.hide : a.show}
          </button>
        </form>
      </div>
      {state.status === "error" && state.message && <InlineStatus tone="error">{state.message}</InlineStatus>}
      <Toast toast={toast} />
    </div>
  );
}
