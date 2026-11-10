"use client";
// Actions of one quote. List row (the row itself opens the detail): compact Sửa, Chuyển đơn. Detail header: Sửa, Xóa and the
// primary "Chuyển thành đơn" (asks the delivery date, default tomorrow). Buttons follow the user's
// permissions; SQL re-checks.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { format, getDictionary } from "@/i18n";
import { ConfirmDialog } from "@/features/portal-ui/components/ConfirmDialog";
import { buttonClass, inputClass } from "@/features/portal-ui/components/styles";
import { orderHref } from "@/features/admin-orders/lib/paths";
import type { OrderType } from "@/features/admin-orders/lib/types";
import { quoteEditHref } from "../lib/paths";
import { convertQuoteAction, deleteQuoteAction } from "../server/actions";

const c = getDictionary().baoGia;

export type QuoteCan = { edit: boolean; convert: boolean; remove: boolean };
type Props = { type: string; id: string; can: QuoteCan; variant?: "row" | "detail"; afterDelete?: string };

function tomorrow(): string {
  const d = new Date(Date.now() + 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// 44px touch target on phones, 24px text action inside a 48px desktop row.
const compact = "pt-row-raise inline-flex min-h-11 items-center rounded-md px-2 text-sm font-medium text-vt-blue hover:bg-pt-blue-tint disabled:opacity-55 md:min-h-0 md:h-6";

export function QuoteRowActions({ type, id, can, variant = "row", afterDelete }: Props) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"convert" | "delete" | null>(null);
  const [due, setDue] = useState(tomorrow);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const row = variant === "row";
  const editable = can.edit && type !== "thank_you";

  const run = (action: "convert" | "delete") => {
    setDialog(null);
    setError(null);
    start(async () => {
      const r = action === "convert" ? await convertQuoteAction(type, id, due) : await deleteQuoteAction(type, id);
      if (!r.ok) return setError(r.message);
      if (action === "convert") router.push(orderHref(type as OrderType, r.id));
      else if (afterDelete) router.push(afterDelete);
      else router.refresh();
    });
  };

  return (
    <div className={row ? "-mx-2 flex flex-wrap items-center gap-1 md:flex-nowrap" : "contents"}>
      {editable && <Link href={quoteEditHref(type, id)} className={row ? compact : buttonClass("secondary")}>{c.edit}</Link>}
      {!row && can.remove && (
        <button type="button" disabled={pending} onClick={() => setDialog("delete")} className={buttonClass("ghost", "md", "text-pt-red-ink")}>{c.remove}</button>
      )}
      {can.convert && (
        <button type="button" disabled={pending} onClick={() => setDialog("convert")} className={row ? compact : buttonClass("primary", "md", "order-first basis-full! sm:order-none sm:basis-auto! sm:flex-none")}>
          {row ? c.convert : c.convertLong}
        </button>
      )}
      {error && <p role="alert" className="w-full text-xs font-medium text-pt-red-ink">{error}</p>}
      <ConfirmDialog
        open={dialog === "convert"}
        title={format(c.convertTitle, { id })}
        body={
          <label className="flex flex-col gap-1.5 font-medium text-pt-text">
            {c.dueDate}
            <input type="date" className={inputClass} value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
        }
        confirmLabel={c.convertLong}
        onCancel={() => setDialog(null)}
        onConfirm={() => run("convert")}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        title={format(c.deleteTitle, { id })}
        body={c.deleteBody}
        confirmLabel={c.remove}
        tone="danger"
        onCancel={() => setDialog(null)}
        onConfirm={() => run("delete")}
      />
    </div>
  );
}
