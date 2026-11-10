"use client";
// "Quản lý tệp đính kèm" of one order (app thongke.js:1116-1309): list newest first, Tải, Xóa, add one
// file (<= 25 MB). Files go browser -> Supabase RPC (lib/browser-rpc.ts); SQL checks orders.view /
// orders.edit. Native <dialog> like ConfirmDialog.
import { useEffect, useRef, useState } from "react";
import { format } from "@/i18n";
import { ConfirmDialog } from "@/features/portal-ui/components/ConfirmDialog";
import { buttonClass } from "@/features/portal-ui/components/styles";
import {
  MAX_FILE_BYTES, addAttachment, deleteAttachment, downloadAttachment, listAttachments, type Attachment,
} from "../lib/browser-rpc";
import { listCopy as l } from "../lib/list-copy";
import type { OrderType } from "../lib/types";

type Props = { order: { type: OrderType; id: string } | null; canEdit: boolean; onClose: () => void };

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;

export function OrderAttachmentsButton({ type, id, canEdit }: { type: OrderType; id: string; canEdit: boolean }) {
  const [order, setOrder] = useState<Props["order"]>(null);
  return (
    <>
      <button type="button" onClick={() => setOrder({ type, id })} className={buttonClass("secondary")}>Tệp đính kèm</button>
      <AttachmentsDialog order={order} canEdit={canEdit} onClose={() => setOrder(null)} />
    </>
  );
}

export function AttachmentsDialog({ order, canEdit, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<Attachment[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Attachment | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (order && !d.open) d.showModal();
    if (!order && d.open) d.close();
  }, [order]);

  const reload = async (o: { type: OrderType; id: string }) => {
    const list = await listAttachments(o.type, o.id);
    setFiles(list ?? []);
    if (!list) setError(l.filesError);
  };

  useEffect(() => {
    if (!order) return;
    let live = true;
    listAttachments(order.type, order.id).then((list) => {
      if (!live) return;
      setFiles(list ?? []);
      setError(list ? null : l.filesError);
    });
    return () => {
      live = false;
      setFiles(null);
    };
  }, [order]);

  const run = async (task: () => Promise<boolean>, reloadAfter: boolean) => {
    if (!order) return;
    setBusy(true);
    setError(null);
    const ok = await task().catch(() => false);
    if (!ok) setError(l.filesError);
    if (reloadAfter) await reload(order);
    setBusy(false);
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !order) return;
    if (file.size > MAX_FILE_BYTES) return setError(l.filesTooBig);
    void run(async () => (await addAttachment(order.type, order.id, file)) !== null, true);
  };

  return (
    <dialog
      ref={ref}
      aria-label={l.filesTitle}
      onClose={onClose}
      className="pt-dialog m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border border-pt-line bg-pt-surface p-0 text-pt-text"
    >
      <div className="flex flex-col gap-3 p-5">
        <h2 className="text-lg font-semibold">{l.filesTitle}</h2>
        {order && <p className="text-sm text-pt-muted">{format(l.filesOrder, { id: order.id })}</p>}
        {canEdit && (
          <>
            <input ref={fileRef} type="file" className="sr-only" tabIndex={-1} aria-hidden onChange={onPick} />
            <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className={buttonClass("secondary", "sm", "self-start")}>
              {l.filesAdd}
            </button>
          </>
        )}
        {error && <p role="alert" className="text-sm text-pt-red-ink">{error}</p>}
        {files === null ? (
          <p className="text-sm text-pt-muted">{l.filesLoading}</p>
        ) : files.length === 0 ? (
          <p className="text-sm text-pt-muted">{l.filesNone}</p>
        ) : (
          <ul aria-busy={busy} className="flex max-h-80 flex-col divide-y divide-pt-line overflow-y-auto">
            {files.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <span className="min-w-0 flex-1 break-all">{f.file_name}</span>
                <span className="tabular-nums text-pt-muted">{kb(f.file_size)}</span>
                <button type="button" disabled={busy} onClick={() => run(() => downloadAttachment(f.id), false)} className={buttonClass("ghost", "sm")}>
                  {l.filesDownload}
                </button>
                {canEdit && (
                  <button type="button" disabled={busy} onClick={() => setToDelete(f)} className={buttonClass("ghost", "sm", "text-pt-red-ink")}>
                    {l.filesDelete}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <button type="button" onClick={onClose} className={buttonClass("secondary", "md", "sm:self-end")}>{l.filesClose}</button>
      </div>
      <ConfirmDialog
        open={!!toDelete}
        title={format(l.filesDeleteConfirm, { name: toDelete?.file_name ?? "" })}
        tone="danger"
        confirmLabel={l.filesDelete}
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          const f = toDelete;
          setToDelete(null);
          if (f) void run(() => deleteAttachment(f.id), true);
        }}
      />
    </dialog>
  );
}
