"use client";
// One width row's actions: move up / down, show / hide, delete (confirmed). Each is its own
// form; actions-tape-specs.ts re-checks admin + zod, RLS allows admin writes only.
import { useActionState, useState } from "react";
import { format, getDictionary } from "@/i18n";
import type { TapeWidth } from "@/lib/types";
import { ConfirmSubmit } from "@/features/portal-ui/components/ConfirmDialog";
import { Icon } from "@/features/portal-ui/components/Icon";
import { InlineStatus } from "@/features/portal-ui/components/States";
import { Toast, type ToastMessage } from "@/features/portal-ui/components/Toast";
import { buttonClass } from "@/features/portal-ui/components/styles";
import { IDLE } from "../../lib/schemas";
import { deleteWidthAction, moveWidthAction, toggleWidthAction } from "../../server/actions-tape-specs";
import { nextToast, useOnSuccess } from "../useOnSuccess";

const t = getDictionary();
const a = t.adminUi;

type Props = { width: TapeWidth; reorder: { isFirst: boolean; isLast: boolean } | null };

export function WidthActions({ width, reorder }: Props) {
  const [moveState, move, moving] = useActionState(moveWidthAction, IDLE);
  const [toggleState, toggle, toggling] = useActionState(toggleWidthAction, IDLE);
  const [deleteState, remove, removing] = useActionState(deleteWidthAction, IDLE);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const show = (message?: string) => message && setToast(nextToast(message));
  useOnSuccess(toggleState, show);
  useOnSuccess(deleteState, show);
  const busy = moving || toggling || removing;
  const error = [moveState, toggleState, deleteState].find((s) => s.status === "error");
  const mm = width.width_mm;

  return (
    <div className="pt-row-raise flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1">
        {reorder && (
          <>
            <form action={move}>
              <input type="hidden" name="id" value={width.id} />
              <input type="hidden" name="direction" value="up" />
              <button type="submit" disabled={busy || reorder.isFirst} aria-label={format(a.moveUpLabel, { width: mm })} className={buttonClass("ghost", "sm", "w-11 px-0")}>
                <Icon name="sortAsc" className="size-5" />
              </button>
            </form>
            <form action={move}>
              <input type="hidden" name="id" value={width.id} />
              <input type="hidden" name="direction" value="down" />
              <button type="submit" disabled={busy || reorder.isLast} aria-label={format(a.moveDownLabel, { width: mm })} className={buttonClass("ghost", "sm", "w-11 px-0")}>
                <Icon name="sortDesc" className="size-5" />
              </button>
            </form>
          </>
        )}
        <form action={toggle}>
          <input type="hidden" name="id" value={width.id} />
          <input type="hidden" name="isActive" value={width.is_active ? "false" : "true"} />
          <button type="submit" disabled={busy} className={buttonClass("secondary", "sm")}>
            {width.is_active ? t.tapeSpec.disable : t.tapeSpec.enable}
          </button>
        </form>
        <form action={remove}>
          <input type="hidden" name="id" value={width.id} />
          <ConfirmSubmit
            label={t.tapeSpec.remove}
            tone="danger"
            title={format(a.removeTitle, { width: mm })}
            body={a.removeBody}
            disabled={busy}
            className={buttonClass("ghost", "sm", "text-pt-red-ink")}
          />
        </form>
      </div>
      {error?.message && <InlineStatus tone="error">{error.message}</InlineStatus>}
      <Toast toast={toast} />
    </div>
  );
}
