"use client";
// Order notification email (emailDialog.js): To with history suggestions, "Trục mới" switch that swaps
// the TRỤC MỚI / TRỤC CŨ subject prefix, editable body, the order's stored attachments (pre-ticked).
import { useActionState, useState } from "react";
import { buttonClass, checkboxClass, inputClass, textareaClass } from "@/features/portal-ui/components/styles";
import { ActionStatus } from "@/features/portal-ui/components/States";
import type { OrderType } from "@/features/admin-orders/lib/types";
import { emailSubject, MAX_ATTACHMENT_BYTES, type EmailDraft } from "../lib/email-template";
import type { AttachmentInfo } from "../server/queries";
import { sendOrderEmailAction, type EmailActionState } from "../server/actions";

const PREFIXES = ["TRỤC MỚI - ", "TRỤC CŨ - "];
const kb = (bytes: number) => `${(bytes / 1024).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} KB`;

type Props = {
  type: OrderType; id: string; draft: EmailDraft; defaultTo: string;
  attachments: AttachmentInfo[]; suggestions: string[];
};

export function OrderEmailForm({ type, id, draft, defaultTo, attachments, suggestions }: Props) {
  const [state, action, pending] = useActionState<EmailActionState, FormData>(sendOrderEmailAction, { status: "idle" });
  const [subject, setSubject] = useState(emailSubject(draft.baseSubject, draft.isNewAxis));
  const [newAxis, setNewAxis] = useState(draft.isNewAxis);
  const [picked, setPicked] = useState(() => new Set(attachments.map((a) => a.id)));
  const size = attachments.filter((a) => picked.has(a.id)).reduce((s, a) => s + a.file_size, 0);

  function switchAxis(on: boolean) {
    setNewAxis(on);
    const prefix = on ? PREFIXES[0] : PREFIXES[1];
    const old = PREFIXES.find((p) => subject.startsWith(p));
    setSubject(old ? prefix + subject.slice(old.length) : subject.trim() === "" ? emailSubject(draft.baseSubject, on) : subject);
  }

  const toggle = (attId: number) =>
    setPicked((p) => { const n = new Set(p); if (n.has(attId)) n.delete(attId); else n.add(attId); return n; });

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="id" value={id} />
      <label className="flex flex-col gap-1 text-sm font-medium">
        Gửi đến
        <input name="to" defaultValue={defaultTo} list="email-history" required maxLength={2000} className={inputClass}
          inputMode="email" autoComplete="off" aria-describedby="email-to-hint" />
        <span id="email-to-hint" className="text-xs font-normal text-pt-muted">Nhiều người nhận: cách nhau bằng dấu phẩy hoặc chấm phẩy.</span>
        <datalist id="email-history">{suggestions.map((s) => <option key={s} value={s} />)}</datalist>
      </label>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" className={checkboxClass} checked={newAxis} onChange={(e) => switchAxis(e.target.checked)} />
        Trục mới
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Tiêu đề
        <input name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required maxLength={200} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Nội dung
        <textarea name="body" defaultValue={draft.body} required maxLength={20000} rows={16} className={`${textareaClass} font-[Arial,Helvetica,sans-serif]`} />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Tệp đính kèm của đơn</legend>
        {attachments.length === 0 && <p className="text-sm text-pt-muted">Đơn chưa có tệp đính kèm.</p>}
        {attachments.map((a) => (
          <label key={a.id} className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" name="att" value={a.id} className={checkboxClass} checked={picked.has(a.id)} onChange={() => toggle(a.id)} />
            <span className="min-w-0 flex-1 break-all">{a.file_name}</span>
            <span className="shrink-0 text-pt-muted">{kb(a.file_size)}</span>
          </label>
        ))}
        {size > MAX_ATTACHMENT_BYTES && <p className="text-sm text-pt-red-ink">Tổng dung lượng vượt quá 25 MB.</p>}
      </fieldset>

      <ActionStatus state={state} />
      <button type="submit" disabled={pending || size > MAX_ATTACHMENT_BYTES} className={buttonClass("primary", "md", "self-start")}>
        {pending ? "Đang gửi..." : "📧 Gửi Email"}
      </button>
    </form>
  );
}
