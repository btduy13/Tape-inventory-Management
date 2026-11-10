"use client";
// Order notification email (emailDialog.js): To with history suggestions, "Trục mới" switch that swaps
// the TRỤC MỚI / TRỤC CŨ subject prefix, editable body, the order's stored attachments (pre-ticked).
import { useActionState, useRef, useState, type ChangeEvent } from "react";
import { buttonClass, checkboxClass, inputClass, textareaClass } from "@/features/portal-ui/components/styles";
import { ActionStatus } from "@/features/portal-ui/components/States";
import type { OrderType } from "@/features/admin-orders/lib/types";
import { addAttachment } from "@/features/admin-orders/lib/browser-rpc";
import { emailSubject, MAX_ATTACHMENT_BYTES, MAX_EMAIL_ATTACHMENTS, type EmailDraft } from "../lib/email-template";
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
  const [to, setTo] = useState(defaultTo);
  const [body, setBody] = useState(draft.body);
  const [newAxis, setNewAxis] = useState(draft.isNewAxis);
  const [added, setAdded] = useState<AttachmentInfo[]>([]);
  const [picked, setPicked] = useState(() => new Set(attachments.map((a) => a.id)));
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const files = [...attachments, ...added.filter((file) => !attachments.some((a) => a.id === file.id))];
  const size = files.filter((a) => picked.has(a.id)).reduce((s, a) => s + (a.file_size ?? 0), 0);
  const tooMany = files.filter((a) => picked.has(a.id)).length > MAX_EMAIL_ATTACHMENTS;
  const canSend = !pending && !uploading && !tooMany && size <= MAX_ATTACHMENT_BYTES;

  async function onPickFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selected.length || uploading || pending) return;
    setUploadError("");
    if (selected.some((file) => file.size > MAX_ATTACHMENT_BYTES)) {
      setUploadError("Mỗi tệp đính kèm tối đa 25 MB.");
      return;
    }
    setUploading(true);
    const failed: string[] = [];
    for (const file of selected) {
      const idOfFile = await addAttachment(type, id, file).catch(() => null);
      if (idOfFile === null) {
        failed.push(file.name);
      } else {
        setAdded((previous) => [...previous, { id: idOfFile, file_name: file.name.slice(0, 255).trim(), file_size: file.size }]);
        setPicked((previous) => new Set(previous).add(idOfFile));
      }
    }
    setUploading(false);
    if (failed.length) setUploadError(`Không tải lên được: ${failed.join(", ")}.`);
  }

  function switchAxis(on: boolean) {
    setNewAxis(on);
    const prefix = on ? PREFIXES[0] : PREFIXES[1];
    const old = PREFIXES.find((p) => subject.startsWith(p));
    setSubject(old ? prefix + subject.slice(old.length) : subject.trim() === "" ? emailSubject(draft.baseSubject, on) : subject);
  }

  const toggle = (attId: number) =>
    setPicked((p) => { const n = new Set(p); if (n.has(attId)) n.delete(attId); else n.add(attId); return n; });

  return (
    <form action={action} onSubmit={(event) => { if (!canSend) event.preventDefault(); }} className="flex flex-col gap-4">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="id" value={id} />
      <label className="flex flex-col gap-1 text-sm font-medium">
        Gửi đến
        <input name="to" value={to} onChange={(e) => setTo(e.target.value)} list="email-history" required maxLength={2000} className={inputClass}
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
        <textarea name="body" value={body} onChange={(e) => setBody(e.target.value)} required maxLength={20000} rows={16} className={`${textareaClass} font-[Arial,Helvetica,sans-serif]`} />
      </label>

      <fieldset disabled={uploading || pending} className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Tệp đính kèm của đơn</legend>
        <input ref={fileInput} type="file" multiple className="hidden" onChange={onPickFiles} />
        <button type="button" onClick={() => fileInput.current?.click()} className={buttonClass("secondary", "sm", "self-start")}>
          {uploading ? "Đang tải tệp lên…" : "Thêm tệp đính kèm"}
        </button>
        <p className="text-xs text-pt-muted">Tệp mới được lưu vào đơn và chọn sẵn cho email này.</p>
        {uploadError && <p role="alert" className="text-sm text-pt-red-ink">{uploadError}</p>}
        {files.length === 0 && <p className="text-sm text-pt-muted">Đơn chưa có tệp đính kèm.</p>}
        {files.map((a) => (
          <label key={a.id} className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" name="att" value={a.id} className={checkboxClass} checked={picked.has(a.id)} onChange={() => toggle(a.id)} />
            <span className="min-w-0 flex-1 break-all">{a.file_name}</span>
            <span className="shrink-0 text-pt-muted">{kb(a.file_size)}</span>
          </label>
        ))}
        {size > MAX_ATTACHMENT_BYTES && <p className="text-sm text-pt-red-ink">Tổng dung lượng vượt quá 25 MB.</p>}
        {tooMany && <p className="text-sm text-pt-red-ink">Mỗi email gửi tối đa {MAX_EMAIL_ATTACHMENTS} tệp.</p>}
      </fieldset>

      <ActionStatus state={state} />
      <button type="submit" disabled={!canSend} className={buttonClass("primary", "md", "self-start")}>
        {pending ? "Đang gửi..." : "📧 Gửi Email"}
      </button>
    </form>
  );
}
