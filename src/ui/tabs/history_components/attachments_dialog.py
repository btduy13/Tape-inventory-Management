import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import os
import tempfile
from datetime import datetime
from src.database.database import OrderAttachment


class AttachmentsDialog(tk.Toplevel):
    def __init__(self, parent, session, order_type: str, order_id: str):
        super().__init__(parent)
        self.parent = parent
        self.session = session
        self.order_type = order_type
        self.order_id = order_id

        self.title(f"Tệp đính kèm - {order_type} | {order_id}")
        self.geometry("700x400")
        self.minsize(600, 360)
        self.transient(parent)
        self.grab_set()

        self._build_ui()
        self._load_data()

    def _build_ui(self):
        container = ttk.Frame(self, padding=10)
        container.pack(fill=tk.BOTH, expand=True)

        # Treeview
        columns = ("file_name", "content_type", "file_size", "created_at")
        self.tree = ttk.Treeview(container, columns=columns, show='headings')
        self.tree.heading("file_name", text="Tên tệp")
        self.tree.heading("content_type", text="Loại")
        self.tree.heading("file_size", text="Dung lượng (bytes)")
        self.tree.heading("created_at", text="Ngày tạo")

        self.tree.column("file_name", width=260, minwidth=160)
        self.tree.column("content_type", width=140, minwidth=120)
        self.tree.column("file_size", width=120, minwidth=100)
        self.tree.column("created_at", width=140, minwidth=120)

        self.tree.grid(row=0, column=0, sticky='nsew')
        scroll_y = ttk.Scrollbar(container, orient='vertical', command=self.tree.yview)
        self.tree.configure(yscrollcommand=scroll_y.set)
        scroll_y.grid(row=0, column=1, sticky='ns')

        container.rowconfigure(0, weight=1)
        container.columnconfigure(0, weight=1)

        # Buttons
        btns = ttk.Frame(container)
        btns.grid(row=1, column=0, columnspan=2, sticky='ew', pady=(10, 0))
        for i in range(4):
            btns.columnconfigure(i, weight=1)

        ttk.Button(btns, text="Xem", command=self._open_selected).grid(row=0, column=0, padx=5, sticky='ew')
        ttk.Button(btns, text="Tải về", command=self._download_selected).grid(row=0, column=1, padx=5, sticky='ew')
        ttk.Button(btns, text="Xóa", command=self._delete_selected).grid(row=0, column=2, padx=5, sticky='ew')
        ttk.Button(btns, text="Đóng", command=self.destroy).grid(row=0, column=3, padx=5, sticky='ew')

    def _load_data(self):
        self.tree.delete(*self.tree.get_children())
        atts = (
            self.session.query(OrderAttachment)
            .filter_by(order_type=self.order_type, order_id=self.order_id)
            .order_by(OrderAttachment.created_at.desc())
            .all()
        )
        for att in atts:
            created = att.created_at.strftime('%d/%m/%Y %H:%M') if att.created_at else ''
            self.tree.insert('', 'end', iid=str(att.id), values=(att.file_name, att.content_type, att.file_size or 0, created))

    def _get_selected_id(self):
        sel = self.tree.selection()
        if not sel:
            messagebox.showwarning("Cảnh báo", "Vui lòng chọn một tệp")
            return None
        return int(sel[0])

    def _open_selected(self):
        att_id = self._get_selected_id()
        if not att_id:
            return
        att = self.session.query(OrderAttachment).get(att_id)
        if not att:
            messagebox.showerror("Lỗi", "Không tìm thấy tệp đính kèm")
            return
        try:
            suffix = os.path.splitext(att.file_name)[1] or ''
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(att.data)
                tmp_path = tmp.name
            os.startfile(tmp_path)
        except Exception as e:
            messagebox.showerror("Lỗi", f"Không thể mở tệp: {e}")

    def _download_selected(self):
        att_id = self._get_selected_id()
        if not att_id:
            return
        att = self.session.query(OrderAttachment).get(att_id)
        if not att:
            messagebox.showerror("Lỗi", "Không tìm thấy tệp đính kèm")
            return
        try:
            initial = att.file_name or f"attachment_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            save_path = filedialog.asksaveasfilename(initialfile=initial)
            if not save_path:
                return
            with open(save_path, 'wb') as f:
                f.write(att.data)
            messagebox.showinfo("Thành công", f"Đã lưu tệp: {save_path}")
        except Exception as e:
            messagebox.showerror("Lỗi", f"Không thể lưu tệp: {e}")

    def _delete_selected(self):
        att_id = self._get_selected_id()
        if not att_id:
            return
        if not messagebox.askyesno("Xác nhận", "Xóa tệp đính kèm đã chọn?"):
            return
        try:
            att = self.session.query(OrderAttachment).get(att_id)
            if att:
                self.session.delete(att)
                self.session.commit()
            self._load_data()
            messagebox.showinfo("Thành công", "Đã xóa tệp đính kèm")
        except Exception as e:
            self.session.rollback()
            messagebox.showerror("Lỗi", f"Không thể xóa tệp: {e}")


