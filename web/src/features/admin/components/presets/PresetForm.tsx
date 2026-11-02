"use client";
// Create (no preset) or edit one tape_presets row, shown inside FormDialog.
// savePresetAction re-checks admin + zod; RLS allows admin writes only.
import { useActionState } from "react";
import { format, getDictionary } from "@/i18n";
import type { TapePreset } from "@/lib/types";
import { CheckboxField, TextField } from "@/features/portal-ui/components/Field";
import { ActionStatus } from "@/features/portal-ui/components/States";
import { buttonClass } from "@/features/portal-ui/components/styles";
import { IDLE } from "../../lib/schemas";
import { savePresetAction } from "../../server/actions-presets";
import { FormDialog } from "../FormDialog";
import { useOnSuccess } from "../useOnSuccess";

const t = getDictionary();
const a = t.adminUi;

export function PresetForm({ preset, onDone }: { preset?: TapePreset; onDone: (message?: string) => void }) {
  const [state, action, pending] = useActionState(savePresetAction, IDLE);
  useOnSuccess(state, onDone);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={preset?.id ?? ""} />
      <TextField label={t.admin.presetLabel} name="label" required maxLength={80} defaultValue={preset?.label} />
      <div className="grid grid-cols-3 gap-3">
        <TextField label={t.admin.widthMm} name="widthMm" type="number" inputMode="decimal" step="0.1" min="0.1" max="200" required defaultValue={preset?.width_mm} />
        <TextField label={t.admin.lengthM} name="lengthM" type="number" inputMode="decimal" step="0.1" min="0.1" max="2000" required defaultValue={preset?.length_m} />
        <TextField label={t.admin.thicknessMic} name="thicknessMic" type="number" inputMode="decimal" step="0.1" min="0.1" max="200" required defaultValue={preset?.thickness_mic ?? 45} />
      </div>
      <TextField label={t.admin.sortOrder} name="sortOrder" type="number" step="1" min="-10000" max="10000" defaultValue={preset?.sort_order ?? 0} hint={a.sortOrderHint} className="w-40" />
      <CheckboxField label={a.presetShown} name="isActive" defaultChecked={preset?.is_active ?? true} />
      <ActionStatus state={state.status === "error" ? state : IDLE} />
      <button type="submit" disabled={pending} className={buttonClass("primary", "md", "sm:self-end")}>
        {preset ? t.common.save : a.addPreset}
      </button>
    </form>
  );
}

export function AddPresetDialog() {
  return (
    <FormDialog label={a.addPreset} title={a.addPreset} icon="plus">
      {(done) => <PresetForm onDone={done} />}
    </FormDialog>
  );
}

export function EditPresetDialog({ preset }: { preset: TapePreset }) {
  const title = format(a.editPreset, { label: preset.label });
  return (
    <FormDialog label={t.common.edit} title={title} triggerClassName={buttonClass("secondary", "sm")}>
      {(done) => <PresetForm key={preset.updated_at} preset={preset} onDone={done} />}
    </FormDialog>
  );
}
