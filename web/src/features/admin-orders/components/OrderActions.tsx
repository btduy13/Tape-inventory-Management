"use client";
// Order actions, the same buttons for one order (detail page) and for a selection (list):
// Đổi trạng thái (Đã giao / Tất toán, each optional, atomic per type), Đưa vào xưởng (printed tape
// without a job), Chuyển thành đơn (quotes, with a due date) and Xóa (confirm). The RPCs re-check
// every rule (admin only, quotes untouched by status, delivered orders not sent to the workshop).
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { format } from "@/i18n";
import { ConfirmDialog } from "@/features/portal-ui/components/ConfirmDialog";
import { Toast, type ToastMessage } from "@/features/portal-ui/components/Toast";
import { buttonClass, inputClass } from "@/features/portal-ui/components/styles";
import { addDays } from "@/features/workshop/lib/dates";
import type { WorkshopUser } from "@/features/workshop/server/queries";
import { fieldLabel as f, ordersCopy as c } from "../lib/copy";
import type { OrderRef } from "../lib/types";
import {
  convertQuotesAction, deleteOrdersAction, sendToWorkshopAction, setStatusAction, type OrderActionState,
} from "../server/actions";

type Dialog = "status" | "workshop" | "convert" | "delete" | null;
type Tri = "" | "1" | "0";
const tri = (v: Tri) => (v === "" ? null : v === "1");

type Props = {
  items: readonly OrderRef[];
  workshopUsers: readonly WorkshopUser[];
  /** Vietnam today (server), for the convert date. */
  today: string;
  /** Called after a successful action (the list clears its selection). */
  onDone?: () => void;
  /** Shows the result (the list owns the toast, since these buttons go away with the selection). */
  onResult?: (toast: ToastMessage) => void;
  /** Detail page: after delete go back to the list. */
  afterDeleteHref?: string;
  size?: "sm" | "md";
  /** Buttons the user may use (orders.status / edit / create / delete); default all. */
  can?: { status: boolean; edit: boolean; create: boolean; delete: boolean };
};

const ALL = { status: true, edit: true, create: true, delete: true };

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-pt-text">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

export function OrderActions({ items, workshopUsers, today, onDone, onResult, afterDeleteHref, size = "sm", can = ALL }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState<Dialog>(null);
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [giao, setGiao] = useState<Tri>("");
  const [tatToan, setTatToan] = useState<Tri>("");
  const [assignee, setAssignee] = useState("");
  const [due, setDue] = useState(addDays(today, 1));

  const orders = items.filter((o) => !o.isQuote);
  const quotes = items.filter((o) => o.isQuote);
  const toWorkshop = orders.filter((o) => o.type === "bang_keo_in" && !o.delivered && !o.hasJob);
  const refs = (list: readonly OrderRef[]) => list.map(({ type, id }) => ({ type, id }));

  const run = (task: () => Promise<OrderActionState>, after?: () => void) => {
    setOpen(null);
    start(async () => {
      const r = await task();
      if (!r) return; // the action redirected (one converted quote opens the new order)
      const t: ToastMessage = { id: Date.now(), message: r.message ?? "", tone: r.status === "error" ? "error" : "success" };
      if (onResult) onResult(t);
      else setToast(t);
      if (r.status === "success") {
        onDone?.();
        after?.();
      }
    });
  };

  const btn = buttonClass("secondary", size);
  const count = (n: number) => ({ count: n });

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {can.status && orders.length > 0 && (
          <button type="button" disabled={pending} onClick={() => setOpen("status")} className={btn}>{c.actStatus}</button>
        )}
        {can.edit && toWorkshop.length > 0 && (
          <button type="button" disabled={pending} onClick={() => setOpen("workshop")} className={btn}>{c.actWorkshop}</button>
        )}
        {can.create && quotes.length > 0 && (
          <button type="button" disabled={pending} onClick={() => setOpen("convert")} className={buttonClass("primary", size)}>{c.actConvert}</button>
        )}
        {can.delete && items.length > 0 && (
          <button type="button" disabled={pending} onClick={() => setOpen("delete")} className={buttonClass("danger", size)}>{c.actDelete}</button>
        )}
      </div>

      <ConfirmDialog
        open={open === "status"}
        title={format(c.actStatusTitle, count(orders.length))}
        body={
          <div className="flex flex-col gap-3">
            <p>{c.actStatusBody}</p>
            <Select label={f.da_giao} value={giao} onChange={(v) => setGiao(v as Tri)} options={[["", c.keep], ["1", c.delivered], ["0", c.notDelivered]]} />
            <Select label={f.da_tat_toan} value={tatToan} onChange={(v) => setTatToan(v as Tri)} options={[["", c.keep], ["1", c.settled], ["0", c.notSettled]]} />
          </div>
        }
        confirmLabel={c.actStatus}
        onCancel={() => setOpen(null)}
        onConfirm={() => {
          if (giao === "" && tatToan === "") return setOpen(null);
          run(() => setStatusAction(refs(orders), { da_giao: tri(giao), da_tat_toan: tri(tatToan) }));
        }}
      />

      <ConfirmDialog
        open={open === "workshop"}
        title={format(c.actWorkshopTitle, count(toWorkshop.length))}
        body={
          <div className="flex flex-col gap-3">
            <p>{c.actWorkshopBody}</p>
            <Select
              label={f.workshop_user_id} value={assignee} onChange={setAssignee}
              options={[["", c.assigneeAuto], ...workshopUsers.map((u): [string, string] => [u.id, u.name])]}
            />
          </div>
        }
        confirmLabel={c.actWorkshop}
        onCancel={() => setOpen(null)}
        onConfirm={() => run(() => sendToWorkshopAction(toWorkshop.map((o) => o.id), assignee || null))}
      />

      <ConfirmDialog
        open={open === "convert"}
        title={format(c.actConvertTitle, count(quotes.length))}
        body={
          <div className="flex flex-col gap-3">
            <p>{c.actConvertBody}</p>
            <label className="flex flex-col gap-1 text-sm font-medium text-pt-text">
              {c.actConvertDate}
              <input type="date" value={due} min={today} onChange={(e) => setDue(e.target.value)} required className={inputClass} />
            </label>
          </div>
        }
        confirmLabel={c.actConvert}
        onCancel={() => setOpen(null)}
        onConfirm={() => due && run(() => convertQuotesAction(refs(quotes), due))}
      />

      <ConfirmDialog
        open={open === "delete"}
        title={format(c.actDeleteTitle, count(items.length))}
        body={c.actDeleteBody}
        tone="danger"
        confirmLabel={c.actDelete}
        onCancel={() => setOpen(null)}
        onConfirm={() => run(
          () => deleteOrdersAction(refs(items), quotes.length === items.length),
          afterDeleteHref ? () => router.push(afterDeleteHref) : undefined,
        )}
      />

      {!onResult && <Toast toast={toast} />}
    </>
  );
}
