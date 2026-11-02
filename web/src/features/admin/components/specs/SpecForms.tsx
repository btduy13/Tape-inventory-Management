"use client";
// Add-width form and length-range form for /admin/quy-cach. Server actions re-check admin + zod.
import { useActionState } from "react";
import { getDictionary } from "@/i18n";
import type { TapeSpecSettings } from "@/lib/types";
import { TextField } from "@/features/portal-ui/components/Field";
import { Icon } from "@/features/portal-ui/components/Icon";
import { ActionStatus } from "@/features/portal-ui/components/States";
import { buttonClass } from "@/features/portal-ui/components/styles";
import { IDLE } from "../../lib/schemas";
import { addWidthAction, saveLengthLimitsAction } from "../../server/actions-tape-specs";

const t = getDictionary();
const a = t.adminUi;

export function AddWidthForm() {
  const [state, action, pending] = useActionState(addWidthAction, IDLE);
  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <TextField label={t.tapeSpec.widthMm} name="widthMm" type="number" inputMode="numeric" step="1" min="1" max="200" required className="w-36" />
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          <Icon name="plus" className="size-4" />
          {t.tapeSpec.addWidth}
        </button>
      </div>
      <ActionStatus state={state} />
    </form>
  );
}

export function LengthLimitsForm({ settings }: { settings: TapeSpecSettings | null }) {
  const [state, action, pending] = useActionState(saveLengthLimitsAction, IDLE);
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <TextField label={t.tapeSpec.minLength} name="minLengthM" type="number" inputMode="decimal" step="0.1" min="0.1" max="10000" required defaultValue={settings?.min_length_m} />
        <TextField label={t.tapeSpec.maxLength} name="maxLengthM" type="number" inputMode="decimal" step="0.1" min="0.1" max="10000" required defaultValue={settings?.max_length_m} />
      </div>
      <p className="-mt-2 text-xs text-pt-muted">{a.lengthHint}</p>
      <TextField label={t.tapeSpec.thickness} name="thicknessMic" type="number" inputMode="decimal" step="0.1" min="0.1" max="200" required defaultValue={settings?.thickness_mic ?? 45} />
      <ActionStatus state={state} />
      <button type="submit" disabled={pending} className={buttonClass("primary", "md", "self-start")}>{t.common.save}</button>
    </form>
  );
}
