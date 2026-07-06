import tkinter as tk
from tkinter import ttk, messagebox
from datetime import datetime
from src.database.database import BangKeoInOrder, TrucInOrder, BangKeoOrder
from src.utils.helpers import apply_settlement_debt
import logging
from src.ui.tabs.tab_base import TabBase
from src.services.report_gen import OrderSelectionDialog
from src.database.database import get_session
from src.utils.ui_utils import set_window_icon, center_window

class ThongKeTab(TabBase):
    def __init__(self, container, parent):
        super().__init__(parent)
        self.container = container
        self.parent_form = parent
        self.COLORS = parent.COLORS
        self.FONTS = parent.FONTS
        
        # Add sort tracking variables
        self.bang_keo_in_sort = {'column': None, 'reverse': False}
        self.truc_in_sort = {'column': None, 'reverse': False}
        self.bang_keo_sort = {'column': None, 'reverse': False}
        
        # Initialize counters
        self.reset_counters()
        
        # Create dashboard frame
        self.create_dashboard()
        
        # Create order list frames
        self.create_order_tabs()
        
        # Load data into the interface
        self.load_data()

    def reset_counters(self):
        """Initialize/reset all counters to zero."""
        self.sap_den_han_count = 0
        self.qua_han_count = 0
        self.chua_tat_toan_count = 0
        self.hoan_thanh_count = 0
        self.tong_cong_no = 0
        self.tong_doanh_thu = 0
        self.tong_loi_nhuan_rong = 0

    def create_dashboard(self):
        """Create the dashboard displaying summary information with modern cards."""
        from src.ui.components.modern_card import ModernCard
        
        dashboard_frame = tk.Frame(self.container, background=self.COLORS['background'])
        dashboard_frame.pack(fill=tk.X, pady=(0, 20))
        
        # Header for this section
        tk.Label(
            dashboard_frame, text="Tổng quan thống kê", 
            font=self.FONTS['subheader'],
            background=self.COLORS['background']
        ).pack(anchor='w', pady=(0, 15))
        
        # Grid for cards
        cards_grid = tk.Frame(dashboard_frame, background=self.COLORS['background'])
        cards_grid.pack(fill=tk.X)
        cards_grid.columnconfigure((0, 1, 2, 3), weight=1)
        
        # Warning Cards
        self.card_warning = ModernCard(cards_grid, "Cảnh báo", "0", "⚠️", "Sắp đến hạn / Quá hạn", accent_color=self.COLORS['danger'])
        self.card_warning.grid(row=0, column=0, sticky='nsew', padx=(0, 10))
        
        self.card_status = ModernCard(cards_grid, "Trạng thái", "0", "🔄", "Chưa tất toán", accent_color=self.COLORS['warning'])
        self.card_status.grid(row=0, column=1, sticky='nsew', padx=10)
        
        self.card_debt = ModernCard(cards_grid, "Công nợ", "0đ", "💳", "Tổng cộng nợ", accent_color=self.COLORS['accent_purple'])
        self.card_debt.grid(row=0, column=2, sticky='nsew', padx=10)
        
        self.card_profit = ModernCard(cards_grid, "Lợi nhuận ròng", "0đ", "💎", "Ước tính", accent_color=self.COLORS['success'])
        self.card_profit.grid(row=0, column=3, sticky='nsew', padx=(10, 0))

        # Action Button Frame
        actions_frame = tk.Frame(dashboard_frame, background=self.COLORS['background'])
        actions_frame.pack(fill=tk.X, pady=(15, 0))
        
        # Export Order button with modern styling using tk.Button for visibility
        self.export_btn = tk.Button(
            actions_frame, 
            text="➕ Xuất Đơn Đặt Hàng / Phiếu Giao Hàng", 
            command=self.open_order_export,
            background=self.COLORS['primary'],
            foreground='white',
            font=self.FONTS['bold'],
            relief='flat',
            padx=20,
            pady=8,
            cursor='hand2',
            activebackground='#0d9488',
            activeforeground='white'
        )
        self.export_btn.pack(side='left')
        
        # Add manual hover effect
        self.export_btn.bind("<Enter>", lambda e: self.export_btn.configure(background='#0d9488'))
        self.export_btn.bind("<Leave>", lambda e: self.export_btn.configure(background=self.COLORS['primary']))

    def update_dashboard_labels(self):
        """Update all labels/cards in the dashboard with the latest counts and sums."""
        warning_text = f"{self.sap_den_han_count} sắp hạn, {self.qua_han_count} quá hạn"
        self.card_warning.set_value(str(self.sap_den_han_count + self.qua_han_count))
        self.card_warning.set_subtitle(warning_text)
        
        self.card_status.set_value(str(self.chua_tat_toan_count))
        self.card_status.set_subtitle(f"{self.hoan_thanh_count} đã hoàn thành")
        
        self.card_debt.set_value(f"{self.tong_cong_no:,.0f}đ")
        self.card_profit.set_value(f"{self.tong_loi_nhuan_rong:,.0f}đ")
        
    def create_order_tabs(self):
        # Create notebook for order lists
        self.order_notebook = ttk.Notebook(self.container)
        self.order_notebook.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Create frames for each order type
        self.bang_keo_in_frame = ttk.Frame(self.order_notebook)
        self.truc_in_frame = ttk.Frame(self.order_notebook)
        self.bang_keo_frame = ttk.Frame(self.order_notebook)
        
        # Add frames to notebook
        self.order_notebook.add(self.bang_keo_in_frame, text="Băng Keo In")
        self.order_notebook.add(self.truc_in_frame, text="Trục In")
        self.order_notebook.add(self.bang_keo_frame, text="Băng Keo")
        
        # Create order lists
        self.create_order_list(self.bang_keo_in_frame, "Băng Keo In")
        self.create_order_list(self.truc_in_frame, "Trục In")
        self.create_order_list(self.bang_keo_frame, "Băng Keo")
        
    def create_order_list(self, parent, order_type):
        """Create the section displaying the list of orders for a specific type."""
        list_frame = ttk.LabelFrame(parent, text=f"Danh sách đơn hàng - {order_type}")
        list_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Control Frame containing filter options and refresh button
        control_frame = ttk.Frame(list_frame)
        control_frame.pack(fill=tk.X, padx=5, pady=5)
        
        # Search by order name
        ttk.Label(control_frame, text="Tìm theo tên:").pack(side=tk.LEFT, padx=5)
        search_var = tk.StringVar()
        search_entry = ttk.Entry(control_frame, textvariable=search_var, width=20)
        search_entry.pack(side=tk.LEFT, padx=5)
        search_var.trace_add("write", lambda *args, ot=order_type: self.load_data(order_type=ot))
        
        # Month filter
        ttk.Label(control_frame, text="Tháng:").pack(side=tk.LEFT, padx=5)
        month_var = tk.StringVar(value="Tất cả")
        months = ["Tất cả"] + [f"Tháng {i}" for i in range(1, 13)]
        month_cb = ttk.Combobox(control_frame, textvariable=month_var,
                               values=months, state="readonly", width=15)
        month_cb.pack(side=tk.LEFT, padx=5)
        month_var.trace_add("write", lambda *args, ot=order_type: self.load_data(order_type=ot))
        
        # Filter by status
        ttk.Label(control_frame, text="Trạng thái:").pack(side=tk.LEFT, padx=5)
        filter_var = tk.StringVar(value="Tất cả")
        filter_cb = ttk.Combobox(control_frame, textvariable=filter_var, values=[
            "Tất cả",
            "Sắp đến hạn",
            "Quá hạn",
            "Chưa tất toán",
            "Đã hoàn thành"
        ], state="readonly", width=15)
        filter_cb.pack(side=tk.LEFT, padx=5)
        filter_cb.bind("<<ComboboxSelected>>", lambda e, ot=order_type: self.load_data(order_type=ot))
        
        # Refresh Button
        ttk.Button(control_frame, text="Làm mới", command=lambda ot=order_type: self.load_data(order_type=ot)).pack(side=tk.LEFT, padx=5)
        
        
        # Create frame for treeview and scrollbar
        tree_frame = ttk.Frame(list_frame)
        tree_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Configure grid weights for tree_frame
        tree_frame.grid_columnconfigure(0, weight=1)
        tree_frame.grid_rowconfigure(0, weight=1)
        
        # Treeview to display order data
        tree = ttk.Treeview(tree_frame, columns=(
            "id", "thoi_gian", "ten_hang", "ten_khach_hang", "ngay_du_kien", 
            "cong_no_khach", "da_giao", "da_tat_toan", "da_gui_email"
        ), show="headings")
        
        # Define columns with sort commands
        columns_config = {
            "id": ("ID đơn hàng", 100),
            "thoi_gian": ("Ngày tạo đơn", 150),
            "ten_hang": ("Tên đơn", 200),
            "ten_khach_hang": ("Tên khách hàng", 200),
            "ngay_du_kien": ("Ngày giao", 150),
            "cong_no_khach": ("Công nợ khách", 150),
            "da_giao": ("Đã giao", 100),
            "da_tat_toan": ("Đã tất toán", 100),
            "da_gui_email": ("Đã gửi email", 100)
        }
        
        # Calculate total fixed width
        fixed_width = sum(width for _, width in columns_config.values())
        
        # Configure columns
        for col, (heading, width) in columns_config.items():
            tree.heading(col, text=heading,
                        command=lambda c=col, t=order_type: self.sort_treeview(c, t))
            # Set stretch=True for ten_hang and ten_khach_hang columns
            if col in ["ten_hang", "ten_khach_hang"]:
                tree.column(col, width=width, minwidth=width, stretch=True,
                          anchor=tk.W)
            else:
                tree.column(col, width=width, minwidth=width, stretch=False,
                          anchor=tk.E if col == "cong_no_khach" else tk.CENTER)
        
        # Add scrollbars to Treeview
        y_scrollbar = ttk.Scrollbar(tree_frame, orient=tk.VERTICAL, command=tree.yview)
        x_scrollbar = ttk.Scrollbar(tree_frame, orient=tk.HORIZONTAL, command=tree.xview)
        tree.configure(yscrollcommand=y_scrollbar.set, xscrollcommand=x_scrollbar.set)
        
        # Grid layout for treeview and scrollbars
        tree.grid(row=0, column=0, sticky='nsew')
        y_scrollbar.grid(row=0, column=1, sticky='ns')
        x_scrollbar.grid(row=1, column=0, sticky='ew')
        
        # Gửi Email Button
        ttk.Button(control_frame, text="Gửi Email", command=lambda ot=order_type, t=tree: self.send_email_selected(ot, t)).pack(side=tk.LEFT, padx=5)
        
        # Bind double-click event
        tree.bind('<Double-1>', lambda e, ot=order_type, t=tree: self.on_double_click(e, ot, t))
        # Bind right-click for bulk status update
        tree.bind('<Button-3>', lambda e, ot=order_type, t=tree: self.on_right_click(e, ot, t))
        
        # Store references for later use
        if order_type == "Băng Keo In":
            self.bang_keo_in_tree = tree
            self.bang_keo_in_filter_var = filter_var
            self.bang_keo_in_search_var = search_var
            self.bang_keo_in_month_var = month_var
        elif order_type == "Trục In":
            self.truc_in_tree = tree
            self.truc_in_filter_var = filter_var
            self.truc_in_search_var = search_var
            self.truc_in_month_var = month_var
        else:
            self.bang_keo_tree = tree
            self.bang_keo_filter_var = filter_var
            self.bang_keo_search_var = search_var
            self.bang_keo_month_var = month_var
        
    def load_data(self, order_type=None):
        """Load data from the database and populate the Treeviews."""
        try:
            # Reset all counters
            self.reset_counters()
            
            # Clear existing data in all Treeviews
            for tree in [self.bang_keo_in_tree, self.truc_in_tree, self.bang_keo_tree]:
                for item in tree.get_children():
                    tree.delete(item)
            
            # Get today's date
            today = datetime.now().date()
            
            try:
                # Thử query database
                bang_keo_in_orders = self.parent_form.db_session.query(BangKeoInOrder).all()
                truc_in_orders = self.parent_form.db_session.query(TrucInOrder).all()
                bang_keo_orders = self.parent_form.db_session.query(BangKeoOrder).all()
            except Exception as db_error:
                # Nếu có lỗi database, thử tạo session mới
                logging.error(f"Database error: {str(db_error)}")
                self.parent_form.db_session.rollback()
                # Tạo session mới
                self.parent_form.db_session = get_session(self.parent_form.db_session.bind)
                # Thử query lại
                bang_keo_in_orders = self.parent_form.db_session.query(BangKeoInOrder).all()
                truc_in_orders = self.parent_form.db_session.query(TrucInOrder).all()
                bang_keo_orders = self.parent_form.db_session.query(BangKeoOrder).all()
            
            # Load Băng Keo In orders
            for order in bang_keo_in_orders:
                self.process_order(order, "Băng Keo In", today, self.bang_keo_in_tree)
            
            # Load Trục In orders
            for order in truc_in_orders:
                self.process_order(order, "Trục In", today, self.truc_in_tree)
                
            # Load Băng Keo orders
            for order in bang_keo_orders:
                self.process_order(order, "Băng Keo", today, self.bang_keo_tree)
            
            # Update dashboard labels with the latest counts and sums
            self.update_dashboard_labels()
            
        except Exception as e:
            logging.error(f"Error loading data: {str(e)}")
            messagebox.showerror("Lỗi", 
                               "Có lỗi xảy ra khi tải dữ liệu. Hệ thống sẽ thử tải lại.\n" + 
                               f"Chi tiết lỗi: {str(e)}")
            # Thử tải lại dữ liệu một lần nữa sau 1 giây
            self.container.after(1000, self.load_data)
        
    def process_order(self, order, order_type, today, tree):
        """Process each order to update counters and insert into Treeview if it matches the filter."""
        # Calculate days until due
        days_until_due = (order.ngay_du_kien - today).days
        
        # Update statistical counters based on order status
        if not order.da_giao:
            if 0 <= days_until_due <= 3:
                self.sap_den_han_count += 1
            elif days_until_due < 0:
                self.qua_han_count += 1
                
        if not order.da_tat_toan:
            self.chua_tat_toan_count += 1
            self.tong_cong_no += order.cong_no_khach
            
        if order.da_giao and order.da_tat_toan:
            self.hoan_thanh_count += 1
            
        self.tong_doanh_thu += order.thanh_tien_ban
        self.tong_loi_nhuan_rong += order.loi_nhuan_rong  # Add net profit to total
        
        # Determine if the order should be displayed based on the current filter
        if self.should_show_order(order, days_until_due, order_type):
            # Format công nợ khách with thousand separator
            cong_no = f"{order.cong_no_khach:,.0f}" if order.cong_no_khach else "0"
            
            # Assign tag based on order type for identification
            tag = "bang_keo_in" if order_type == "Băng Keo In" else "truc_in" if order_type == "Trục In" else "bang_keo"
            
            # Insert data with proper order and formatting
            tree.insert("", "end", values=(
                order.id,  # ID đơn hàng
                order.thoi_gian.strftime("%d/%m/%Y") if order.thoi_gian else "",  # Ngày tạo đơn
                order.ten_hang,  # Tên đơn
                order.ten_khach_hang,  # Tên khách hàng
                order.ngay_du_kien.strftime("%d/%m/%Y") if order.ngay_du_kien else "",  # Ngày giao
                cong_no,  # Công nợ khách
                "✓" if order.da_giao else "",  # Đã giao
                "✓" if order.da_tat_toan else "",  # Đã tất toán
                "✓" if order.da_gui_email else ""  # Đã gửi email
            ), tags=(tag, str(order.id)))
        
        # After inserting data, apply sort if a column is selected
        sort_state = self.bang_keo_in_sort if order_type == "Băng Keo In" else self.truc_in_sort if order_type == "Trục In" else self.bang_keo_sort
        if sort_state['column']:
            self.sort_treeview(sort_state['column'], order_type)
        else:
            self._apply_row_colors(tree)
        
    def should_show_order(self, order, days_until_due, order_type):
        """Determine whether an order should be displayed based on the current filter."""
        if order_type == "Băng Keo In":
            filter_value = self.bang_keo_in_filter_var.get()
            search_text = self.bang_keo_in_search_var.get().lower().strip()
            selected_month = self.bang_keo_in_month_var.get()
        elif order_type == "Trục In":
            filter_value = self.truc_in_filter_var.get()
            search_text = self.truc_in_search_var.get().lower().strip()
            selected_month = self.truc_in_month_var.get()
        else:
            filter_value = self.bang_keo_filter_var.get()
            search_text = self.bang_keo_search_var.get().lower().strip()
            selected_month = self.bang_keo_month_var.get()
        
        # Check search text first
        if search_text and search_text not in order.ten_hang.lower():
            return False
        
        # Check month filter
        if selected_month != "Tất cả":
            month_num = int(selected_month.split()[1])
            if order.thoi_gian.month != month_num:
                return False
        
        # Then check status filter
        if filter_value == "Tất cả":
            return True
        elif filter_value == "Sắp đến hạn":
            return not order.da_giao and 0 <= days_until_due <= 3
        elif filter_value == "Quá hạn":
            return not order.da_giao and days_until_due < 0
        elif filter_value == "Chưa tất toán":
            return not order.da_tat_toan
        elif filter_value == "Đã hoàn thành":
            return order.da_giao and order.da_tat_toan
            
        return True
        

    def on_double_click(self, event, order_type, tree):
        """Handle double-click event on a Treeview item to open the update status window."""
        # Ensure that an item is selected
        selected_items = tree.selection()
        if not selected_items:
            return
        
        item = selected_items[0]
        values = tree.item(item)["values"]
        if not values or len(values) < 1:
            messagebox.showerror("Lỗi", "Thông tin đơn hàng không đầy đủ.")
            return
            
        # Lấy ID đơn hàng từ cột đầu tiên
        order_id = values[0]
        if not order_id:
            messagebox.showerror("Lỗi", "ID đơn hàng không hợp lệ.")
            return
            
        # Open the update status window
        self.show_update_status_window(order_type, order_id)
        
    def show_update_status_window(self, order_type, order_id):
        try:
            # Get the order from database based on type
            if order_type == "Băng Keo In":
                order = self.parent_form.db_session.query(BangKeoInOrder).filter_by(id=order_id).first()
            elif order_type == "Trục In":
                order = self.parent_form.db_session.query(TrucInOrder).filter_by(id=order_id).first()
            else:  # Băng Keo
                order = self.parent_form.db_session.query(BangKeoOrder).filter_by(id=order_id).first()
                
            if not order:
                messagebox.showerror("Lỗi", "Không tìm thấy đơn hàng.")
                return
            
            # Create update window
            update_window = tk.Toplevel(self.root)
            update_window.title("Cập nhật trạng thái đơn hàng")
            
            # Set window icon
            set_window_icon(update_window)
            
            # Center window with better size for content
            window_width = 450
            window_height = 420
            center_window(update_window, window_width, window_height)
            
            update_window.transient(self.root)
            update_window.grab_set()
            update_window.configure(bg='#ffffff')

            # --- Layout Configuration ---
            update_window.grid_columnconfigure(0, weight=1)
            update_window.grid_rowconfigure(1, weight=1)

            # --- Header Section ---
            header_frame = tk.Frame(update_window, bg='#14b8a6', height=60)
            header_frame.grid(row=0, column=0, sticky="ew")
            header_frame.grid_propagate(False)
            
            tk.Label(header_frame, 
                     text="Cập nhật trạng thái đơn hàng", 
                     bg='#14b8a6', 
                     fg='white', 
                     font=('Segoe UI Semibold', 14)).pack(pady=15)

            # --- Main Content Section ---
            content_frame = tk.Frame(update_window, bg='#ffffff', padx=30, pady=20)
            content_frame.grid(row=1, column=0, sticky="nsew")
            content_frame.grid_columnconfigure(0, weight=1)

            # Order Details Group
            details_frame = tk.LabelFrame(content_frame, text=" Thông tin chi tiết ", 
                                         font=('Segoe UI Bold', 10), 
                                         bg='#ffffff', fg='#64748b',
                                         padx=15, pady=10)
            details_frame.grid(row=0, column=0, sticky="ew", pady=(0, 20))
            details_frame.grid_columnconfigure(1, weight=1)

            def add_detail_row(parent, row, label, value):
                tk.Label(parent, text=label, bg='#ffffff', fg='#64748b', font=('Segoe UI', 10)).grid(row=row, column=0, sticky='w', pady=2)
                tk.Label(parent, text=value, bg='#ffffff', fg='#1e293b', font=('Segoe UI Semibold', 10)).grid(row=row, column=1, sticky='w', padx=(10, 0), pady=2)

            add_detail_row(details_frame, 0, "ID đơn hàng:", order.id)
            add_detail_row(details_frame, 1, "Tên hàng:", order.ten_hang)
            add_detail_row(details_frame, 2, "Ngày tạo:", order.thoi_gian.strftime('%d/%m/%Y') if order.thoi_gian else 'N/A')

            # Status Group
            status_frame = tk.LabelFrame(content_frame, text=" Trạng thái đơn hàng ", 
                                        font=('Segoe UI Bold', 10), 
                                        bg='#ffffff', fg='#64748b',
                                        padx=15, pady=10)
            status_frame.grid(row=1, column=0, sticky="ew", pady=(0, 20))

            da_giao_var = tk.BooleanVar(value=order.da_giao)
            da_tat_toan_var = tk.BooleanVar(value=order.da_tat_toan)

            check_style = {'bg': '#ffffff', 'activebackground': '#ffffff', 'font': ('Segoe UI', 11), 'highlightthickness': 0, 'bd': 0}
            
            tk.Checkbutton(status_frame, text="Đã giao hàng", variable=da_giao_var, **check_style).pack(anchor=tk.W, pady=5)
            tk.Checkbutton(status_frame, text="Đã tất toán", variable=da_tat_toan_var, **check_style).pack(anchor=tk.W, pady=5)

            # --- Footer / Buttons Section ---
            footer_frame = tk.Frame(update_window, bg='#f8fafc', pady=15, padx=30)
            footer_frame.grid(row=2, column=0, sticky="ew")
            footer_frame.columnconfigure((0, 1), weight=1)

            def save_changes():
                try:
                    order.da_giao = da_giao_var.get()
                    order.da_tat_toan = da_tat_toan_var.get()
                    apply_settlement_debt(order)
                    self.parent_form.db_session.commit()
                    messagebox.showinfo("Thành công", "Cập nhật trạng thái đơn hàng thành công.")
                    update_window.destroy()
                    self.load_data()
                except Exception as e:
                    self.parent_form.db_session.rollback()
                    messagebox.showerror("Lỗi", f"Có lỗi xảy ra khi cập nhật: {str(e)}")

            # Better style buttons - using tk.Button for reliability with custom colors
            save_btn = tk.Button(footer_frame, 
                                text="Lưu thay đổi", 
                                command=save_changes,
                                bg='#14b8a6', fg='white',
                                font=('Segoe UI Bold', 10),
                                relief='flat',
                                padx=20, pady=8,
                                activebackground='#0d9488',
                                activeforeground='white',
                                cursor='hand2')
            save_btn.grid(row=0, column=0, padx=(0, 5), sticky='ew')
            
            cancel_btn = tk.Button(footer_frame,
                                  text="Đóng",
                                  command=update_window.destroy,
                                  bg='#e2e8f0', fg='#475569',
                                  font=('Segoe UI Bold', 10),
                                  relief='flat',
                                  padx=20, pady=8,
                                  activebackground='#cbd5e1',
                                  activeforeground='#475569',
                                  cursor='hand2')
            cancel_btn.grid(row=0, column=1, padx=(5, 0), sticky='ew')
            
        except Exception as e:
            messagebox.showerror("Lỗi", f"Có lỗi xảy ra: {str(e)}")

    def on_right_click(self, event, order_type, tree):
        try:
            # Ensure item under cursor is selected if no selection
            iid = tree.identify_row(event.y)
            if iid and iid not in tree.selection():
                tree.selection_set(iid)

            if not tree.selection():
                return

            menu = tk.Menu(self.root, tearoff=0)
            menu.add_command(label="Gửi Email...", command=lambda: self.send_email_selected(order_type, tree))
            menu.add_command(label="Cập nhật trạng thái...", command=lambda: self.open_bulk_status_dialog(order_type, tree))
            menu.tk_popup(event.x_root, event.y_root)
        finally:
            try:
                menu.grab_release()
            except Exception:
                pass

    def open_bulk_status_dialog(self, order_type, tree):
        dlg = tk.Toplevel(self.root)
        dlg.title("Cập nhật hàng loạt")
        
        # Set window icon
        set_window_icon(dlg)
        
        # Center window
        window_width = 400
        window_height = 320
        center_window(dlg, window_width, window_height)
        
        dlg.transient(self.root)
        dlg.grab_set()
        dlg.configure(bg='#ffffff')

        # --- Layout ---
        dlg.grid_columnconfigure(0, weight=1)
        dlg.grid_rowconfigure(1, weight=1)

        # --- Header ---
        header_frame = tk.Frame(dlg, bg='#64748b', height=50) # Grayish header for bulk
        header_frame.grid(row=0, column=0, sticky="ew")
        header_frame.grid_propagate(False)
        
        tk.Label(header_frame, 
                 text="Cập nhật hàng loạt", 
                 bg='#64748b', 
                 fg='white', 
                 font=('Segoe UI Semibold', 12)).pack(pady=12)

        # --- Content ---
        content_frame = tk.Frame(dlg, bg='#ffffff', padx=25, pady=20)
        content_frame.grid(row=1, column=0, sticky="nsew")
        content_frame.grid_columnconfigure(0, weight=1)

        info_text = f"Đang chọn {len(tree.selection())} đơn hàng"
        tk.Label(content_frame, text=info_text, bg='#ffffff', fg='#1e293b', font=('Segoe UI Bold', 11)).pack(anchor=tk.W, pady=(0, 15))

        # Status Group
        status_frame = tk.LabelFrame(content_frame, text=" Chọn trạng thái áp dụng ", 
                                    font=('Segoe UI Bold', 10), 
                                    bg='#ffffff', fg='#64748b',
                                    padx=15, pady=10)
        status_frame.pack(fill=tk.X, pady=(0, 10))

        da_giao_val = tk.BooleanVar(value=True)
        da_tt_val = tk.BooleanVar(value=True)

        check_style = {'bg': '#ffffff', 'activebackground': '#ffffff', 'font': ('Segoe UI', 11), 'highlightthickness': 0, 'bd': 0}
        tk.Checkbutton(status_frame, text="Đã giao hàng", variable=da_giao_val, **check_style).pack(anchor=tk.W, pady=5)
        tk.Checkbutton(status_frame, text="Đã tất toán", variable=da_tt_val, **check_style).pack(anchor=tk.W, pady=5)

        # --- Footer ---
        footer_frame = tk.Frame(dlg, bg='#f8fafc', pady=15, padx=25)
        footer_frame.grid(row=2, column=0, sticky="ew")
        footer_frame.columnconfigure((0, 1), weight=1)

        # Apply Button Logic - explicitly styled tk.Buttons
        apply_btn = tk.Button(footer_frame, 
                             text="Áp dụng ngay", 
                             command=lambda: self.apply_bulk_status(order_type, tree, da_giao_val.get(), da_tt_val.get(), dlg),
                             bg='#14b8a6', fg='white',
                             font=('Segoe UI Bold', 10),
                             relief='flat',
                             padx=20, pady=8,
                             activebackground='#0d9488',
                             activeforeground='white',
                             cursor='hand2')
        apply_btn.grid(row=0, column=0, padx=(0, 5), sticky='ew')
        
        cancel_btn = tk.Button(footer_frame, 
                              text="Hủy bỏ", 
                              command=dlg.destroy,
                              bg='#e2e8f0', fg='#475569',
                              font=('Segoe UI Bold', 10),
                              relief='flat',
                              padx=20, pady=8,
                              activebackground='#cbd5e1',
                              activeforeground='#475569',
                              cursor='hand2')
        cancel_btn.grid(row=0, column=1, padx=(5, 0), sticky='ew')

    def apply_bulk_status(self, order_type, tree, giao_value, tt_value, dlg):
        try:
            if order_type == "Băng Keo In":
                model = BangKeoInOrder
            elif order_type == "Trục In":
                model = TrucInOrder
            else:
                model = BangKeoOrder

            selected = tree.selection()
            if not selected:
                return

            count = 0
            for iid in selected:
                values = tree.item(iid)["values"]
                order_id = values[0]
                order = self.parent_form.db_session.query(model).filter_by(id=order_id).first()
                if not order:
                    continue
                # Luôn áp dụng cả hai trạng thái theo yêu cầu
                order.da_giao = bool(giao_value)
                order.da_tat_toan = bool(tt_value)
                apply_settlement_debt(order)

                count += 1

            self.parent_form.db_session.commit()
            dlg.destroy()
            self.load_data()
            messagebox.showinfo("Thành công", f"Đã cập nhật {count} đơn hàng")
        except Exception as e:
            self.parent_form.db_session.rollback()
            messagebox.showerror("Lỗi", f"Không thể cập nhật hàng loạt: {e}")

    def send_email_selected(self, order_type_display, tree):
        """Send email for the selected order using ExportImportManager logic"""
        try:
            # Map display name to internal name
            order_type_map = {
                "Băng Keo In": "bang_keo_in",
                "Trục In": "truc_in",
                "Băng Keo": "bang_keo"
            }
            order_type = order_type_map.get(order_type_display)
            if not order_type:
                return

            from src.ui.tabs.history_components.export_import import ExportImportManager
            # Mock or use actual ExportImportManager
            export_manager = ExportImportManager(self.parent_form)
            export_manager.export_selected_to_email(tree, order_type)
            
            # Refresh data to show the checkmark if it was updated
            self.load_data(order_type_display)
        except Exception as e:
            messagebox.showerror("Lỗi", f"Không thể gửi email: {e}")

    def create_bang_keo_tree(self):
        columns = ('id', 'thoi_gian', 'ten_hang', 'ngay_du_kien', 'quy_cach_mm', 'quy_cach_m', 'quy_cach_mic', 
                  'cuon_cay', 'so_luong', 'phi_sl', 'mau_keo', 'phi_keo', 'mau_sac', 
                  'phi_mau', 'phi_size', 'phi_cat', 'don_gia_von', 'don_gia_goc', 
                  'thanh_tien_goc', 'don_gia_ban', 'thanh_tien_ban', 'tien_coc', 
                  'cong_no_khach', 'ctv', 'hoa_hong', 'tien_hoa_hong',
                  'loi_giay', 'thung_bao', 'loi_nhuan')
        
        # Create container frame
        container = ttk.Frame(self.bang_keo_frame)
        container.pack(fill=tk.BOTH, expand=True)
        
        # Configure grid weights
        container.grid_columnconfigure(0, weight=1)
        container.grid_rowconfigure(0, weight=1)
        
        # Create treeview with alternating row colors
        style = ttk.Style()
        style.configure("Custom.Treeview",
                       background="#ffffff",
                       foreground="black",
                       fieldbackground="#ffffff",
                       rowheight=25)
        style.map("Custom.Treeview",
                 background=[("selected", "#0078D7")],
                 foreground=[("selected", "#ffffff")])
        
        self.bang_keo_tree = ttk.Treeview(container, columns=columns, show='headings',
                                         selectmode='extended', style="Custom.Treeview")
        
        # Define headings and column widths
        headings = {
            'id': 'ID đơn hàng',
            'thoi_gian': 'Thời gian', 
            'ten_hang': 'Tên hàng',
            'ngay_du_kien': 'Ngày dự kiến',
            'quy_cach_mm': 'Quy cách (mm)',
            'quy_cach_m': 'Quy cách (m)',
            'quy_cach_mic': 'Quy cách (mic)',
            # ... các heading khác giữ nguyên
        }
        
        # Cấu hình cột
        for col in columns:
            self.bang_keo_tree.heading(col, text=headings[col],
                                     command=lambda c=col: self.sort_treeview(self.bang_keo_tree, c, False))
            # Đặt độ rộng cho từng cột
            if col == 'id':
                self.bang_keo_tree.column(col, width=100, stretch=False)
            elif col in ['thoi_gian', 'ngay_du_kien']:
                self.bang_keo_tree.column(col, width=120, minwidth=120)
            elif col == 'ten_hang':
                self.bang_keo_tree.column(col, width=200, minwidth=150)
            else:
                self.bang_keo_tree.column(col, width=100, minwidth=80)

    def create_truc_in_tree(self):
        columns = ('id', 'thoi_gian', 'ten_hang', 'ngay_du_kien', 'quy_cach', 'so_luong', 'mau_sac',
                  'mau_keo', 'don_gia_goc', 'thanh_tien', 'don_gia_ban',
                  'thanh_tien_ban', 'cong_no_khach', 'ctv', 'hoa_hong',
                  'tien_hoa_hong', 'loi_nhuan')
        
        # Create container frame
        container = ttk.Frame(self.truc_in_frame)
        container.pack(fill=tk.BOTH, expand=True)
        
        # Configure grid weights
        container.grid_columnconfigure(0, weight=1)
        container.grid_rowconfigure(0, weight=1)
        
        self.truc_in_tree = ttk.Treeview(container, columns=columns, show='headings', selectmode='extended')
        
        # Define headings
        headings = {
            'id': 'ID đơn hàng',
            'thoi_gian': 'Thời gian',
            'ten_hang': 'Tên hàng',
            'ngay_du_kien': 'Ngày dự kiến',
            'quy_cach': 'Quy cách',
            # ... các heading khác giữ nguyên
        }
        
        # Cấu hình cột
        for col in columns:
            self.truc_in_tree.heading(col, text=headings[col])
            # Đặt độ rộng cho từng cột
            if col == 'id':
                self.truc_in_tree.column(col, width=100, stretch=False)
            elif col in ['thoi_gian', 'ngay_du_kien']:
                self.truc_in_tree.column(col, width=120, minwidth=120)
            elif col == 'ten_hang':
                self.truc_in_tree.column(col, width=200, minwidth=150)
            else:
                self.truc_in_tree.column(col, width=100, minwidth=80)

    def open_order_export(self):
        """Open the order export dialog"""
        try:
            export_dialog = OrderSelectionDialog(parent=self.container)
            self.container.wait_window(export_dialog)
        except Exception as e:
            messagebox.showerror("Lỗi", f"Không thể mở cửa sổ xuất đơn: {str(e)}")

    def sort_treeview(self, col, order_type):
        """Sort treeview content when a column header is clicked"""
        try:
            # Get the correct tree and sort state
            if order_type == "Băng Keo In":
                tree = self.bang_keo_in_tree
                sort_state = self.bang_keo_in_sort
            elif order_type == "Trục In":
                tree = self.truc_in_tree
                sort_state = self.truc_in_sort
            else:
                tree = self.bang_keo_tree
                sort_state = self.bang_keo_sort

            # Get all items from treeview
            items = [(tree.set(item, col), item) for item in tree.get_children('')]
            
            # If clicking the same column, reverse the sort order
            if sort_state['column'] == col:
                sort_state['reverse'] = not sort_state['reverse']
            else:
                sort_state['column'] = col
                sort_state['reverse'] = False
            
            # Sort based on column type
            if col == "cong_no_khach":
                # Convert string numbers with commas to float for sorting
                items.sort(key=lambda x: float(x[0].replace(',', '')) if x[0] else 0, 
                         reverse=sort_state['reverse'])
            elif col in ["thoi_gian", "ngay_du_kien"]:
                # Convert date strings to datetime objects for sorting
                items.sort(key=lambda x: datetime.strptime(x[0], '%d/%m/%Y') if x[0] else datetime.min, 
                         reverse=sort_state['reverse'])
            elif col in ["da_giao", "da_tat_toan"]:
                # Sort checkmarks
                items.sort(key=lambda x: x[0] == "✓", 
                         reverse=sort_state['reverse'])
            else:
                # Regular string sorting for other columns
                items.sort(key=lambda x: str(x[0]).lower(), 
                         reverse=sort_state['reverse'])
            
            # Rearrange items in treeview
            for index, (val, item) in enumerate(items):
                tree.move(item, '', index)
            
            # Apply alternating row colors
            self._apply_row_colors(tree)
            
        except Exception as e:
            logging.error(f"Error sorting treeview: {str(e)}")
            messagebox.showerror("Lỗi", f"Lỗi khi sắp xếp dữ liệu: {str(e)}")

    def _apply_row_colors(self, tree):
        """Apply alternating row colors to tree"""
        items = tree.get_children()
        for i, item in enumerate(items):
            if i % 2 == 0:
                tree.tag_configure('evenrow', background='#FFFFFF')
                tree.item(item, tags=('evenrow',))
            else:
                tree.tag_configure('oddrow', background='#F0F0F0')
                tree.item(item, tags=('oddrow',))
