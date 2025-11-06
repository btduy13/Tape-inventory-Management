import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from typing import List, Tuple
import os
from src.database.database import OrderAttachment
from src.services.email_service import send_email


class EmailDialog(tk.Toplevel):
    def __init__(self, parent, session, order_type: str, order_id: str, subject: str, body: str):
        super().__init__(parent)
        self.parent = parent
        self.session = session
        self.order_type = order_type
        self.order_id = order_id
        self.title("Gửi Email")
        self.geometry("720x520")
        self.minsize(640, 480)

        self.attach_choices: List[Tuple[int, str, str, int]] = []  # (id, file_name, content_type, size)
        self.extra_files: List[Tuple[str, bytes, str]] = []  # local-picked attachments

        self._build_ui(subject, body)
        self._load_db_attachments()

    def _build_ui(self, subject: str, body: str):
        container = ttk.Frame(self, padding=10)
        container.pack(fill=tk.BOTH, expand=True)

        # Action buttons pinned to bottom to keep them always visible
        actions = ttk.Frame(container)
        actions.pack(side=tk.BOTTOM, fill=tk.X, pady=(10, 0))
        actions.columnconfigure((0, 1), weight=1)
        ttk.Button(actions, text="Gửi", command=self._send).grid(row=0, column=0, padx=5, sticky='ew')
        ttk.Button(actions, text="Hủy", command=self.destroy).grid(row=0, column=1, padx=5, sticky='ew')

        form = ttk.Frame(container)
        form.pack(fill=tk.X, pady=(0, 10))

        ttk.Label(form, text="Người nhận").grid(row=0, column=0, sticky='e', padx=5, pady=5)
        self.to_entry = ttk.Entry(form, width=50)
        self.to_entry.grid(row=0, column=1, sticky='w', padx=5, pady=5)

        ttk.Label(form, text="Tiêu đề").grid(row=1, column=0, sticky='e', padx=5, pady=5)
        self.subject_entry = ttk.Entry(form, width=50)
        self.subject_entry.insert(0, subject)
        self.subject_entry.grid(row=1, column=1, sticky='w', padx=5, pady=5)

        # Body
        ttk.Label(container, text="Nội dung").pack(anchor='w')
        # Giảm chiều cao để không đẩy nút ra khỏi màn hình nhỏ
        self.body_text = tk.Text(container, height=10)
        self.body_text.pack(fill=tk.BOTH, expand=True)
        self.body_text.insert('1.0', body)

        # Attachment area
        attach_frame = ttk.LabelFrame(container, text="Đính kèm")
        attach_frame.pack(fill=tk.BOTH, expand=False, pady=10)

        self.attach_list = ttk.Treeview(attach_frame, columns=("name", "size"), show='headings', height=6)
        self.attach_list.heading("name", text="Tên tệp")
        self.attach_list.heading("size", text="Kích thước")
        self.attach_list.column("name", width=450)
        self.attach_list.column("size", width=120)
        self.attach_list.grid(row=0, column=0, columnspan=3, sticky='nsew')
        scroll_y = ttk.Scrollbar(attach_frame, orient='vertical', command=self.attach_list.yview)
        self.attach_list.configure(yscrollcommand=scroll_y.set)
        scroll_y.grid(row=0, column=3, sticky='ns')

        attach_frame.columnconfigure(0, weight=1)
        attach_frame.rowconfigure(0, weight=1)

        ttk.Button(attach_frame, text="Thêm tệp...", command=self._add_extra_files).grid(row=1, column=0, sticky='w', pady=5)
        ttk.Button(attach_frame, text="Bỏ chọn", command=self._remove_selected_extra).grid(row=1, column=1, sticky='w', pady=5)

    def _load_db_attachments(self):
        atts = (
            self.session.query(OrderAttachment)
            .filter_by(order_type=self.order_type, order_id=self.order_id)
            .all()
        )
        for att in atts:
            self.attach_choices.append((att.id, att.file_name, att.content_type or 'application/octet-stream', att.file_size or 0))
            self.attach_list.insert('', 'end', iid=f"db:{att.id}", values=(att.file_name, att.file_size or 0))

    def _add_extra_files(self):
        paths = filedialog.askopenfilenames(title="Chọn tệp đính kèm bổ sung")
        for p in paths:
            try:
                with open(p, 'rb') as f:
                    data = f.read()
                name = os.path.basename(p)
                ext = os.path.splitext(name)[1].lower()
                content_type = {
                    '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
                    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.csv': 'text/csv', '.txt': 'text/plain'
                }.get(ext, 'application/octet-stream')
                self.extra_files.append((name, data, content_type))
                self.attach_list.insert('', 'end', iid=f"fs:{len(self.extra_files)-1}", values=(name, len(data)))
            except Exception as e:
                messagebox.showwarning("Cảnh báo", f"Không thể đọc tệp {p}: {e}")

    def _remove_selected_extra(self):
        sel = self.attach_list.selection()
        for iid in sel:
            if iid.startswith('fs:'):
                index = int(iid.split(':')[1])
                # Đánh dấu bỏ qua bằng cách đặt None
                self.extra_files[index] = None  # type: ignore
            self.attach_list.delete(iid)

    def _collect_attachments(self):
        result: List[Tuple[str, bytes, str]] = []
        # DB attachments (all listed are included)
        for iid in self.attach_list.get_children():
            if iid.startswith('db:'):
                att_id = int(iid.split(':')[1])
                att = self.session.query(OrderAttachment).get(att_id)
                if att:
                    result.append((att.file_name, att.data, att.content_type or 'application/octet-stream'))
            elif iid.startswith('fs:'):
                idx = int(iid.split(':')[1])
                item = self.extra_files[idx]
                if item is not None:
                    result.append(item)
        return result

    def _send(self):
        to_addr = self.to_entry.get().strip()
        subject = self.subject_entry.get().strip()
        body = self.body_text.get('1.0', 'end').strip()
        if not to_addr:
            messagebox.showwarning("Cảnh báo", "Vui lòng nhập địa chỉ email người nhận")
            return
        try:
            attachments = self._collect_attachments()
            send_email(to_addr, subject, body, attachments)
            messagebox.showinfo("Thành công", "Đã gửi email thành công")
            self.destroy()
        except Exception as e:
            messagebox.showerror("Lỗi", f"Không thể gửi email: {e}")


