"use client";
// Dev-only: shows ConfirmDialog, ConfirmSubmit and Toast behaviour on /admin/_kit.
import { useState } from "react";
import { ConfirmDialog, ConfirmSubmit } from "../components/ConfirmDialog";
import { Toast, type ToastMessage } from "../components/Toast";
import { buttonClass } from "../components/styles";

export function KitInteractive() {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const say = (message: string) => setToast({ id: Date.now(), message });
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={buttonClass("danger")} onClick={() => setOpen(true)}>Hủy đơn</button>
      <ConfirmDialog
        open={open}
        tone="danger"
        title="Hủy đơn L-2611-004?"
        body="Đơn chuyển sang Đã hủy. Người phụ trách và xưởng không làm tiếp đơn này."
        confirmLabel="Hủy đơn"
        cancelLabel="Giữ đơn"
        onCancel={() => setOpen(false)}
        onConfirm={() => { setOpen(false); say("Đã hủy đơn."); }}
      />
      <form onSubmit={(e) => { e.preventDefault(); say("Đã gửi báo giá."); }}>
        <ConfirmSubmit label="Gửi báo giá" title="Gửi báo giá cho khách?" body="Khách nhận email có đường link xem và phản hồi báo giá." />
      </form>
      <button type="button" className={buttonClass("secondary")} onClick={() => say("Đã lưu.")}>Lưu</button>
      <Toast toast={toast} />
    </div>
  );
}
