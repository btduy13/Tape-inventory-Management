import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from typing import List, Tuple
import os
from datetime import datetime
from src.database.database import OrderAttachment, EmailHistory
from src.services.email_service import send_email


class EmailDialog(tk.Toplevel):
    def __init__(self, parent, session, order_type: str, order_id: str, subject: str, body: str):
        super().__init__(parent)
        self.parent = parent
        self.session = session
        self.order_type = order_type
        self.order_id = order_id
        self.title("Gửi Email")
        self.geometry("720x820")
        self.minsize(640, 480)
        
        # Configure window to be resizable
        self.columnconfigure(0, weight=1)
        self.rowconfigure(0, weight=1)

        self.attach_choices: List[Tuple[int, str, str, int]] = []  # (id, file_name, content_type, size)
        self.extra_files: List[Tuple[str, bytes, str]] = []  # local-picked attachments
        self.email_suggestions: List[str] = []  # List of email addresses from history

        self._build_ui(subject, body)
        self._ensure_email_history_table()
        self._load_db_attachments()
        self._load_email_suggestions()

    def _build_ui(self, subject: str, body: str):
        # Main container with better padding - use grid for proper docking
        container = ttk.Frame(self, padding=15)
        container.grid(row=0, column=0, sticky='nsew')
        container.columnconfigure(0, weight=1)
        container.rowconfigure(1, weight=1)  # Body section expands
        container.rowconfigure(3, weight=0)  # Attachment area fixed

        # Form section with better layout - docked at top
        form_frame = ttk.LabelFrame(container, text="Thông tin email", padding=10)
        form_frame.grid(row=0, column=0, sticky='ew', pady=(0, 10))
        form_frame.columnconfigure(1, weight=1)

        # Recipient field with autocomplete
        ttk.Label(form_frame, text="Người nhận:", font=('Segoe UI', 9)).grid(row=0, column=0, sticky='w', padx=(0, 10), pady=8)
        self.to_entry = ttk.Combobox(form_frame, font=('Segoe UI', 10), width=40)
        self.to_entry.grid(row=0, column=1, sticky='ew', padx=(0, 0), pady=8)
        self.to_entry.bind('<KeyRelease>', self._on_email_key_release)
        self.to_entry.bind('<<ComboboxSelected>>', self._on_email_selected)

        # Subject field
        ttk.Label(form_frame, text="Tiêu đề:", font=('Segoe UI', 9)).grid(row=1, column=0, sticky='w', padx=(0, 10), pady=8)
        self.subject_entry = ttk.Entry(form_frame, font=('Segoe UI', 10))
        self.subject_entry.insert(0, subject)
        self.subject_entry.grid(row=1, column=1, sticky='ew', padx=(0, 0), pady=8)
        self.subject_entry.bind('<FocusIn>', lambda e: self.subject_entry.select_range(0, tk.END))

        # Body section with formatting toolbar - expands to fill space
        body_frame = ttk.LabelFrame(container, text="Nội dung", padding=10)
        body_frame.grid(row=1, column=0, sticky='nsew', pady=(0, 10))
        body_frame.columnconfigure(0, weight=1)
        body_frame.rowconfigure(1, weight=1)  # Text area expands
        
        # Formatting toolbar - compact and organized - docked at top
        toolbar = ttk.Frame(body_frame)
        toolbar.grid(row=0, column=0, sticky='ew', pady=(0, 8))
        
        # Group 1: Font controls
        font_group = ttk.Frame(toolbar)
        font_group.pack(side=tk.LEFT, padx=(0, 15))
        
        ttk.Label(font_group, text="Cỡ chữ:", font=('Segoe UI', 9)).pack(side=tk.LEFT, padx=(0, 5))
        self.font_size_var = tk.StringVar(value="14")
        font_size_combo = ttk.Combobox(font_group, textvariable=self.font_size_var, width=4, 
                                       values=["8", "9", "10", "11", "12", "14", "16", "18", "20", "24"],
                                       state="readonly", font=('Segoe UI', 9))
        font_size_combo.pack(side=tk.LEFT, padx=(0, 10))
        font_size_combo.bind("<<ComboboxSelected>>", lambda e: self._apply_font_size())
        
        ttk.Label(font_group, text="Font:", font=('Segoe UI', 9)).pack(side=tk.LEFT, padx=(0, 5))
        self.font_family_var = tk.StringVar(value="Arial")
        font_combo = ttk.Combobox(font_group, textvariable=self.font_family_var, width=10,
                                  values=["Arial", "Times New Roman", "Courier New", "Verdana", "Tahoma", "Calibri"],
                                  state="readonly", font=('Segoe UI', 9))
        font_combo.pack(side=tk.LEFT)
        font_combo.bind("<<ComboboxSelected>>", lambda e: self._apply_font_family())
        
        # Group 2: Format buttons
        format_group = ttk.Frame(toolbar)
        format_group.pack(side=tk.LEFT, padx=(0, 15))
        
        ttk.Label(format_group, text="Màu:", font=('Segoe UI', 9)).pack(side=tk.LEFT, padx=(0, 5))
        self.color_var = tk.StringVar(value="#000000")
        color_btn = ttk.Button(format_group, text="●", width=2, command=self._choose_color)
        color_btn.pack(side=tk.LEFT, padx=(0, 10))
        
        bold_btn = ttk.Button(format_group, text="B", width=3, command=self._toggle_bold)
        bold_btn.pack(side=tk.LEFT, padx=2)
        italic_btn = ttk.Button(format_group, text="I", width=3, command=self._toggle_italic)
        italic_btn.pack(side=tk.LEFT, padx=2)
        
        # Text widget with formatting - use grid for proper docking
        text_frame = ttk.Frame(body_frame)
        text_frame.grid(row=1, column=0, sticky='nsew')
        text_frame.columnconfigure(0, weight=1)
        text_frame.rowconfigure(0, weight=1)
        
        self.body_text = tk.Text(text_frame, height=12, wrap=tk.WORD, font=("Arial", 14),
                                relief=tk.FLAT, borderwidth=1, padx=8, pady=8)
        self.body_text.grid(row=0, column=0, sticky='nsew')
        
        # Scrollbar for text
        text_scroll = ttk.Scrollbar(text_frame, orient='vertical', command=self.body_text.yview)
        text_scroll.grid(row=0, column=1, sticky='ns')
        self.body_text.configure(yscrollcommand=text_scroll.set)
        
        self.body_text.insert('1.0', body)
        
        # Configure default formatting
        self.body_text.tag_configure("bold", font=("Arial", 14, "bold"))
        self.body_text.tag_configure("italic", font=("Arial", 14, "italic"))
        self.body_text.tag_configure("bold_italic", font=("Arial", 14, "bold italic"))
        
        # Store current formatting state
        self.current_font_size = 14
        self.current_font_family = "Arial"
        self.current_color = "#000000"

        # Attachment area - more compact - docked above buttons
        attach_frame = ttk.LabelFrame(container, text="Đính kèm", padding=8)
        attach_frame.grid(row=2, column=0, sticky='ew', pady=(0, 10))
        attach_frame.columnconfigure(0, weight=1)
        attach_frame.rowconfigure(0, weight=1)

        # Attachment list with scrollbar - use grid for proper docking
        attach_list_frame = ttk.Frame(attach_frame)
        attach_list_frame.grid(row=0, column=0, sticky='nsew', pady=(0, 8))
        attach_list_frame.columnconfigure(0, weight=1)
        attach_list_frame.rowconfigure(0, weight=1)
        
        self.attach_list = ttk.Treeview(attach_list_frame, columns=("name", "size"), show='headings', height=4)
        self.attach_list.heading("name", text="Tên tệp")
        self.attach_list.heading("size", text="Kích thước")
        self.attach_list.column("name", width=400, minwidth=200, stretch=True)
        self.attach_list.column("size", width=100, minwidth=80)
        
        attach_scroll_y = ttk.Scrollbar(attach_list_frame, orient='vertical', command=self.attach_list.yview)
        self.attach_list.configure(yscrollcommand=attach_scroll_y.set)
        
        self.attach_list.grid(row=0, column=0, sticky='nsew')
        attach_scroll_y.grid(row=0, column=1, sticky='ns')

        # Attachment buttons - better layout, docked at bottom
        attach_btn_frame = ttk.Frame(attach_frame)
        attach_btn_frame.grid(row=1, column=0, sticky='ew')
        
        ttk.Button(attach_btn_frame, text="Thêm tệp...", command=self._add_extra_files).grid(row=0, column=0, padx=(0, 5), sticky='w')
        ttk.Button(attach_btn_frame, text="Bỏ chọn", command=self._remove_selected_extra).grid(row=0, column=1, sticky='w')

        # Action buttons - styled and docked at bottom
        actions = ttk.Frame(container)
        actions.grid(row=3, column=0, sticky='ew', pady=(5, 0))
        actions.columnconfigure(0, weight=1)
        
        # Style buttons
        style = ttk.Style()
        style.configure('Send.TButton', font=('Segoe UI', 10, 'bold'), padding=(10, 5))
        style.configure('Cancel.TButton', font=('Segoe UI', 10), padding=(10, 5))
        
        # Center buttons container
        btn_container = ttk.Frame(actions)
        btn_container.grid(row=0, column=0)
        
        send_btn = ttk.Button(btn_container, text="Gửi Email", command=self._send, 
                            style='Send.TButton', width=15)
        send_btn.grid(row=0, column=0, padx=5)
        
        cancel_btn = ttk.Button(btn_container, text="Hủy", command=self.destroy,
                               style='Cancel.TButton', width=15)
        cancel_btn.grid(row=0, column=1, padx=5)

    def _load_db_attachments(self):
        # Chỉ load attachments nếu order_id hợp lệ (không phải 'temp')
        if self.order_id == 'temp':
            return
        
        try:
            import logging
            order_id_str = str(self.order_id)
            logging.info(f"Loading attachments for order_type={self.order_type}, order_id={order_id_str}")
            
            # Ensure transaction is clean before querying
            if self.session.is_active:
                try:
                    self.session.rollback()
                except:
                    pass
            
            atts = (
                self.session.query(OrderAttachment)
                .filter_by(order_type=self.order_type, order_id=order_id_str)
                .all()
            )
            
            logging.info(f"Found {len(atts)} attachments")
            
            if not atts:
                return  # Không có attachments
            
            for att in atts:
                self.attach_choices.append((att.id, att.file_name, att.content_type or 'application/octet-stream', att.file_size or 0))
                # Format file size for display
                size_str = self._format_file_size(att.file_size or 0)
                self.attach_list.insert('', 'end', iid=f"db:{att.id}", values=(att.file_name, size_str))
                logging.info(f"Loaded attachment: {att.file_name} ({size_str})")
        except Exception as e:
            import logging
            logging.error(f"Error loading attachments: {e}", exc_info=True)
            # Rollback transaction on error
            try:
                self.session.rollback()
            except:
                pass
            messagebox.showwarning("Cảnh báo", f"Không thể tải tệp đính kèm: {e}")
    
    def _format_file_size(self, size_bytes):
        """Format file size in human-readable format"""
        if size_bytes == 0:
            return "0 B"
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} TB"
    
    def _ensure_email_history_table(self):
        """Ensure email_history table exists in database with correct structure"""
        import logging
        from sqlalchemy import inspect, text
        from src.database.database import EmailHistory, Base
        
        try:
            engine = self.session.bind
            inspector = inspect(engine)
            tables = inspector.get_table_names()
            
            if 'email_history' not in tables:
                logging.info("email_history table does not exist. Creating it...")
                Base.metadata.create_all(engine, tables=[EmailHistory.__table__], checkfirst=True)
                logging.info("email_history table created successfully")
            else:
                # Check if table has correct structure
                try:
                    columns = [col['name'] for col in inspector.get_columns('email_history')]
                    required_columns = ['id', 'email_address', 'last_sent_at', 'sent_count']
                    
                    if not all(col in columns for col in required_columns):
                        logging.warning(f"email_history table exists but has wrong structure. Columns: {columns}. Recreating...")
                        # Drop and recreate table
                        with engine.connect() as conn:
                            conn.execute(text("DROP TABLE IF EXISTS email_history CASCADE"))
                            conn.commit()
                        Base.metadata.create_all(engine, tables=[EmailHistory.__table__], checkfirst=True)
                        logging.info("email_history table recreated with correct structure")
                    else:
                        logging.debug("email_history table exists with correct structure")
                except Exception as check_error:
                    logging.warning(f"Could not verify table structure: {check_error}. Attempting to recreate...")
                    try:
                        with engine.connect() as conn:
                            conn.execute(text("DROP TABLE IF EXISTS email_history CASCADE"))
                            conn.commit()
                        Base.metadata.create_all(engine, tables=[EmailHistory.__table__], checkfirst=True)
                        logging.info("email_history table recreated")
                    except Exception as recreate_error:
                        logging.error(f"Failed to recreate table: {recreate_error}")
        except Exception as e:
            logging.error(f"Error ensuring email_history table exists: {e}", exc_info=True)
    
    def _load_email_suggestions(self):
        """Load email addresses from history for autocomplete"""
        import logging
        try:
            # First check if table exists
            from sqlalchemy import inspect
            try:
                inspector = inspect(self.session.bind)
                tables = inspector.get_table_names()
                if 'email_history' not in tables:
                    logging.warning("email_history table does not exist yet")
                    self.email_suggestions = []
                    self.to_entry['values'] = []
                    return
            except Exception as check_error:
                logging.warning(f"Could not check table existence: {check_error}")
                # Continue anyway
            
            # Ensure transaction is clean before querying
            if self.session.is_active:
                try:
                    self.session.rollback()
                except:
                    pass
            
            # Query with proper error handling
            try:
                email_records = (
                    self.session.query(EmailHistory)
                    .order_by(EmailHistory.last_sent_at.desc(), EmailHistory.sent_count.desc())
                    .limit(50)  # Limit to 50 most recent/frequent
                    .all()
                )
                
                self.email_suggestions = [record.email_address for record in email_records]
                self.to_entry['values'] = self.email_suggestions
                
                logging.info(f"Loaded {len(self.email_suggestions)} email suggestions")
                if self.email_suggestions:
                    logging.info(f"Sample suggestions: {self.email_suggestions[:3]}")
                else:
                    logging.info("No email suggestions found in history")
            except Exception as query_error:
                # If query fails, it might be a table structure issue
                logging.error(f"Error querying email_history: {query_error}", exc_info=True)
                # Try to recreate table and retry
                try:
                    from sqlalchemy import text
                    from src.database.database import Base
                    
                    # Drop and recreate table
                    with self.session.bind.connect() as conn:
                        conn.execute(text("DROP TABLE IF EXISTS email_history CASCADE"))
                        conn.commit()
                    
                    Base.metadata.create_all(self.session.bind, tables=[EmailHistory.__table__], checkfirst=True)
                    logging.info("Recreated email_history table, retrying query...")
                    
                    # Retry query
                    email_records = (
                        self.session.query(EmailHistory)
                        .order_by(EmailHistory.last_sent_at.desc(), EmailHistory.sent_count.desc())
                        .limit(50)
                        .all()
                    )
                    self.email_suggestions = [record.email_address for record in email_records]
                    self.to_entry['values'] = self.email_suggestions
                except Exception as retry_error:
                    logging.error(f"Retry also failed: {retry_error}", exc_info=True)
                    self.email_suggestions = []
                    self.to_entry['values'] = []
        except Exception as e:
            logging.error(f"Error loading email suggestions: {e}", exc_info=True)
            # Rollback transaction on error
            try:
                self.session.rollback()
            except:
                pass
            self.email_suggestions = []
            self.to_entry['values'] = []
    
    def _on_email_key_release(self, event):
        """Filter suggestions as user types"""
        # Skip special keys
        if event.keysym in ['Return', 'Tab', 'Up', 'Down', 'Escape', 'Shift_L', 'Shift_R', 'Control_L', 'Control_R']:
            return
        
        current_text = self.to_entry.get()
        if not current_text:
            self.to_entry['values'] = self.email_suggestions
            return
        
        # Filter suggestions that contain the typed text (case-insensitive)
        current_lower = current_text.lower()
        filtered = [
            email for email in self.email_suggestions 
            if current_lower in email.lower()
        ]
        self.to_entry['values'] = filtered
        
        # Auto-show dropdown if there are matches and user is typing
        if filtered and len(current_text) > 0:
            # Use after_idle to avoid conflicts with Combobox internal handling
            self.after_idle(lambda: self._show_dropdown_if_needed())
    
    def _show_dropdown_if_needed(self):
        """Show dropdown if there are filtered results"""
        try:
            # Check if combobox has focus and values
            if self.to_entry.focus_get() == self.to_entry and self.to_entry['values']:
                # Trigger dropdown (this is a workaround since ttk.Combobox doesn't have direct method)
                # User can click the dropdown arrow or use Down arrow key
                pass
        except:
            pass
    
    def _on_email_selected(self, event=None):
        """Handle email selection from dropdown"""
        pass  # Combobox handles selection automatically
    
    def _save_email_to_history(self, email_address: str):
        """Save or update email address in history"""
        try:
            email_lower = email_address.lower().strip()
            if not email_lower:
                return
            
            # Ensure transaction is clean before querying
            if self.session.is_active:
                try:
                    self.session.rollback()
                except:
                    pass
            
            # Check if email already exists
            existing = (
                self.session.query(EmailHistory)
                .filter_by(email_address=email_lower)
                .first()
            )
            
            if existing:
                # Update existing record
                existing.last_sent_at = datetime.now()
                existing.sent_count += 1
            else:
                # Create new record
                new_record = EmailHistory(
                    email_address=email_lower,
                    last_sent_at=datetime.now(),
                    sent_count=1
                )
                self.session.add(new_record)
            
            self.session.commit()
            
            # Reload suggestions to include new email
            self._load_email_suggestions()
        except Exception as e:
            import logging
            logging.error(f"Error saving email to history: {e}", exc_info=True)
            try:
                self.session.rollback()
            except:
                pass

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
                size_str = self._format_file_size(len(data))
                self.attach_list.insert('', 'end', iid=f"fs:{len(self.extra_files)-1}", values=(name, size_str))
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
        try:
            # Ensure transaction is clean before querying
            if self.session.is_active:
                try:
                    self.session.rollback()
                except:
                    pass
            
            # DB attachments (all listed are included)
            for iid in self.attach_list.get_children():
                if iid.startswith('db:'):
                    try:
                        att_id = int(iid.split(':')[1])
                        att = self.session.query(OrderAttachment).get(att_id)
                        if att:
                            result.append((att.file_name, att.data, att.content_type or 'application/octet-stream'))
                    except Exception as e:
                        import logging
                        att_id_str = iid.split(':')[1] if ':' in iid else 'unknown'
                        logging.error(f"Error loading attachment {att_id_str}: {e}", exc_info=True)
                        # Rollback and continue with next attachment
                        try:
                            self.session.rollback()
                        except:
                            pass
                        continue
                elif iid.startswith('fs:'):
                    idx = int(iid.split(':')[1])
                    item = self.extra_files[idx]
                    if item is not None:
                        result.append(item)
        except Exception as e:
            import logging
            logging.error(f"Error collecting attachments: {e}", exc_info=True)
            try:
                self.session.rollback()
            except:
                pass
        return result

    def _apply_font_size(self):
        size = int(self.font_size_var.get())
        self.current_font_size = size
        try:
            sel_start = self.body_text.index(tk.SEL_FIRST)
            sel_end = self.body_text.index(tk.SEL_LAST)
            tag_name = f"size_{size}"
            self.body_text.tag_configure(tag_name, font=(self.current_font_family, size))
            self.body_text.tag_add(tag_name, sel_start, sel_end)
        except tk.TclError:
            # No selection, apply to current position
            pass
    
    def _apply_font_family(self):
        family = self.font_family_var.get()
        self.current_font_family = family
        try:
            sel_start = self.body_text.index(tk.SEL_FIRST)
            sel_end = self.body_text.index(tk.SEL_LAST)
            tag_name = f"font_{family}"
            self.body_text.tag_configure(tag_name, font=(family, self.current_font_size))
            self.body_text.tag_add(tag_name, sel_start, sel_end)
        except tk.TclError:
            pass
    
    def _choose_color(self):
        from tkinter import colorchooser
        color = colorchooser.askcolor(title="Chọn màu chữ", initialcolor=self.current_color)
        if color[1]:  # color[1] is hex string
            self.current_color = color[1]
            try:
                sel_start = self.body_text.index(tk.SEL_FIRST)
                sel_end = self.body_text.index(tk.SEL_LAST)
                tag_name = f"color_{color[1]}"
                self.body_text.tag_configure(tag_name, foreground=color[1])
                self.body_text.tag_add(tag_name, sel_start, sel_end)
            except tk.TclError:
                pass
    
    def _toggle_bold(self):
        try:
            sel_start = self.body_text.index(tk.SEL_FIRST)
            sel_end = self.body_text.index(tk.SEL_LAST)
            if "bold" in self.body_text.tag_names(sel_start):
                self.body_text.tag_remove("bold", sel_start, sel_end)
            else:
                self.body_text.tag_add("bold", sel_start, sel_end)
        except tk.TclError:
            pass
    
    def _toggle_italic(self):
        try:
            sel_start = self.body_text.index(tk.SEL_FIRST)
            sel_end = self.body_text.index(tk.SEL_LAST)
            if "italic" in self.body_text.tag_names(sel_start):
                self.body_text.tag_remove("italic", sel_start, sel_end)
            else:
                self.body_text.tag_add("italic", sel_start, sel_end)
        except tk.TclError:
            pass
    
    def _convert_to_html(self):
        """Convert Text widget content with tags to HTML"""
        content = self.body_text.get('1.0', 'end-1c')
        if not content.strip():
            return ""
        
        # Get all tags and their ranges
        html_parts = []
        lines = content.split('\n')
        
        for line in lines:
            if not line:
                html_parts.append('<br>')
                continue
                
            # Simple conversion: preserve line breaks and basic formatting
            # For full HTML conversion, would need to parse all tags
            html_line = line.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            html_parts.append(html_line + '<br>')
        
        # Wrap in basic HTML structure
        html = f"""<html>
<body style="font-family: {self.current_font_family}; font-size: {self.current_font_size}pt;">
{''.join(html_parts)}
</body>
</html>"""
        return html
    
    def _send(self):
        to_addr = self.to_entry.get().strip()
        subject = self.subject_entry.get().strip()
        # Get plain text body
        body = self.body_text.get('1.0', 'end').strip()
        # Also get HTML version for rich email
        html_body = self._convert_to_html()
        
        if not to_addr:
            messagebox.showwarning("Cảnh báo", "Vui lòng nhập địa chỉ email người nhận")
            return
        
        # Validate email format (basic check)
        if '@' not in to_addr or '.' not in to_addr.split('@')[-1]:
            messagebox.showwarning("Cảnh báo", "Vui lòng nhập địa chỉ email hợp lệ")
            return
        
        try:
            attachments = self._collect_attachments()
            send_email(to_addr, subject, body, attachments, html_body=html_body if html_body else None)
            
            # Save email to history after successful send
            self._save_email_to_history(to_addr)
            
            messagebox.showinfo("Thành công", "Đã gửi email thành công")
            self.destroy()
        except Exception as e:
            messagebox.showerror("Lỗi", f"Không thể gửi email: {e}")


