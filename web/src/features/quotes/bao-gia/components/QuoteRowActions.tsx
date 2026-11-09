"use client";
// Actions of one quote in the tree: Sửa, Xem PDF, Chuyển đơn (asks the delivery date, default
// tomorrow), Xóa (with its attachments). Buttons follow the user's permissions; SQL re-checks.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/features/portal-ui/components/ConfirmDialog";
import { buttonClass, inputClass } from "@/features/portal-ui/components/styles";
import { orderHref } from "@/features/admin-orders/lib/paths";
import type { OrderType } from "@/features/admin-orders/lib/types";
import { quoteEditHref, quotePrintHref } from "../lib/paths";
import { convertQuoteAction, deleteQuoteAction } from "../server/actions";

export type QuoteCan = { edit: boolean; convert: boolean; remove: boolean };
type Props = { type: string; id: string; can: QuoteCan };

function tomorrow(): string {
  const d = new Date(Date.now() + 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function QuoteRowActions({ type, id, can }: Props) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"convert" | "delete" | null>(null);
  const [due, setDue] = useState(tomorrow);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const btn = buttonClass("ghost", "sm", "px-2");

  const run = (action: "convert" | "delete") => {
    setDialog(null);
    setError(null);
    start(async () => {
      const r = action === "convert" ? await convertQuoteAction(type, id, due) : await deleteQuoteAction(type, id);
      if (!r.ok) return setError(r.message);
      if (action === "convert") router.push(orderHref(type as OrderType, r.id));
      else router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {can.edit && type !== "thank_you" && <Link href={quoteEditHref(type, id)} className={btn}>Sửa</Link>}
      <Link href={quotePrintHref(type, id)} className={btn}>Xem PDF</Link>
      {can.convert && <button type="button" disabled={pending} onClick={() => setDialog("convert")} className={btn}>Chuyển đơn</button>}
      {can.remove && <button type="button" disabled={pending} onClick={() => setDialog("delete")} className={`${btn} text-pt-red-ink`}>Xóa</button>}
      {error && <p role="alert" className="w-full text-right text-xs font-medium text-pt-red-ink">{error}</p>}
      <ConfirmDialog
        open={dialog === "convert"}
        title={`Chuyển báo giá ${id} thành đơn hàng?`}
        body={
          <label className="flex flex-col gap-1.5 font-medium text-pt-text">
            Ngày giao dự kiến
            <input type="date" className={inputClass} value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
        }
        confirmLabel="Chuyển đơn"
        onCancel={() => setDialog(null)}
        onConfirm={() => run("convert")}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        title={`Xóa báo giá ${id}?`}
        body="Tệp đính kèm của báo giá cũng sẽ bị xóa. Không thể hoàn tác."
        confirmLabel="Xóa"
        tone="danger"
        onCancel={() => setDialog(null)}
        onConfirm={() => run("delete")}
      />
    </div>
  );
}
