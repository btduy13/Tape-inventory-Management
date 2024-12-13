import tkinter as tk
from tkinter import ttk, messagebox
from datetime import datetime
from database import BangKeoInOrder, TrucInOrder
from tab_base import TabBase
import logging

class ThongKeTab(TabBase):
    def __init__(self, notebook, parent):
        super().__init__(parent)
        self.parent_form = parent  # Assuming parent is the main form with db_session
        self.tab = ttk.Frame(notebook)
        notebook.add(self.tab, text="Thống kê")
        
        # Add sort tracking variables
        self.bang_keo_sort = {'column': None, 'reverse': False}
        self.truc_in_sort = {'column': None, 'reverse': False}
        
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
        
    def create_dashboard(self):
        """Create the dashboard displaying summary information."""
        dashboard_frame = ttk.LabelFrame(self.tab, text="Tổng quan")
        dashboard_frame.pack(fill=tk.X, padx=5, pady=5)
        
        # Frame for statistical information
        stats_frame = ttk.Frame(dashboard_frame)
        stats_frame.pack(fill=tk.X, padx=5, pady=5)
        
        # Warning Frame
        warning_frame = ttk.LabelFrame(stats_frame, text="Cảnh báo")
        warning_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=5)
        
        # Orders nearing deadline
        self.sap_den_han_label = ttk.Label(warning_frame, text="Đơn hàng sắp đến hạn: 0")
        self.sap_den_han_label.pack(anchor=tk.W, padx=5, pady=2)
        
        # Overdue orders
        self.qua_han_label = ttk.Label(warning_frame, text="Đơn hàng quá hạn: 0", foreground="red")
        self.qua_han_label.pack(anchor=tk.W, padx=5, pady=2)
        
        # Status Frame
        status_frame = ttk.LabelFrame(stats_frame, text="Trạng thái")
        status_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=5)
        
        # Unsettled orders
        self.chua_tat_toan_label = ttk.Label(status_frame, text="Chưa tất toán: 0")
        self.chua_tat_toan_label.pack(anchor=tk.W, padx=5, pady=2)
        
        # Completed orders
        self.hoan_thanh_label = ttk.Label(status_frame, text="Đã hoàn thành: 0", foreground="green")
        self.hoan_thanh_label.pack(anchor=tk.W, padx=5, pady=2)
        
        # Financial Info Frame
        finance_frame = ttk.LabelFrame(stats_frame, text="Tài chính")
        finance_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=5)
        
        # Total debt
        self.tong_cong_no_label = ttk.Label(finance_frame, text="Tổng công nợ: 0")
        self.tong_cong_no_label.pack(anchor=tk.W, padx=5, pady=2)
        
        # Total revenue
        self.tong_doanh_thu_label = ttk.Label(finance_frame, text="Tổng doanh thu: 0")
        self.tong_doanh_thu_label.pack(anchor=tk.W, padx=5, pady=2)
        
        # Add Actions Frame
        actions_frame = ttk.LabelFrame(dashboard_frame, text="Thao tác")
        actions_frame.pack(fill=tk.X, padx=5, pady=5)
        
        # Style for large button
        style = ttk.Style()
        style.configure('Action.TButton', 
                       padding=(20, 10),
                       font=('TkDefaultFont', 11))
        
        # Add Export Order button
        export_btn = ttk.Button(
            actions_frame, 
            text="Xuất đơn đặt hàng", 
            style='Action.TButton',
            command=self.open_order_export
        )
        export_btn.pack(pady=5)
        
    def create_order_tabs(self):
        """Create a nested notebook with separate tabs for each order type."""
        order_notebook = ttk.Notebook(self.tab)
        order_notebook.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Tab for "Băng keo in"
        self.bang_keo_tab = ttk.Frame(order_notebook)
        order_notebook.add(self.bang_keo_tab, text="Băng keo in")
        self.create_order_list(self.bang_keo_tab, "Băng keo in")
        
        # Tab for "Trục in"
        self.truc_in_tab = ttk.Frame(order_notebook)
        order_notebook.add(self.truc_in_tab, text="Trục in")
        self.create_order_list(self.truc_in_tab, "Trục in")
        
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
        
        # Treeview to display order data
        tree = ttk.Treeview(tree_frame, columns=(
            "id", "thoi_gian", "ten_hang", "ngay_du_kien", 
            "cong_no_khach", "da_giao", "da_tat_toan"
        ), show="headings")
        
        # Define columns with sort commands
        columns_config = {
            "id": ("ID đơn hàng", 100),
            "thoi_gian": ("Ngày tạo đơn", 150),
            "ten_hang": ("Tên đơn", 200),
            "ngay_du_kien": ("Ngày giao", 150),
            "cong_no_khach": ("Công nợ khách", 150),
            "da_giao": ("Đã giao", 100),
            "da_tat_toan": ("Đã tất toán", 100)
        }
        
        for col, (heading, width) in columns_config.items():
            tree.heading(col, text=heading,
                        command=lambda c=col, t=order_type: self.sort_treeview(c, t))
            tree.column(col, width=width, 
                       anchor=tk.CENTER if col not in ["ten_hang"] else tk.W)
            if col == "cong_no_khach":
                tree.column(col, anchor=tk.E)
        
        # Add scrollbar to Treeview
        scrollbar = ttk.Scrollbar(tree_frame, orient=tk.VERTICAL, command=tree.yview)
        tree.configure(yscrollcommand=scrollbar.set)
        
        # Pack scrollbar and treeview
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        # Bind double-click event
        tree.bind('<Double-1>', lambda e, ot=order_type, t=tree: self.on_double_click(e, ot, t))
        
        # Store references for later use
        if order_type == "Băng keo in":
            self.bang_keo_tree = tree
            self.bang_keo_filter_var = filter_var
            self.bang_keo_search_var = search_var
            self.bang_keo_month_var = month_var
        else:
            self.truc_in_tree = tree
            self.truc_in_filter_var = filter_var
            self.truc_in_search_var = search_var
            self.truc_in_month_var = month_var
        
    def load_data(self, order_type=None):
        """Load data from the database and populate the Treeviews."""
        # Reset all counters
        self.reset_counters()
        
        # Clear existing data in both Treeviews
        for tree in [self.bang_keo_tree, self.truc_in_tree]:
            for item in tree.get_children():
                tree.delete(item)
        
        # Get today's date
        today = datetime.now().date()
        
        # Load Băng keo in orders
        bang_keo_orders = self.parent_form.db_session.query(BangKeoInOrder).all()
        for order in bang_keo_orders:
            self.process_order(order, "Băng keo in", today, self.bang_keo_tree)
        
        # Load Trục in orders
        truc_in_orders = self.parent_form.db_session.query(TrucInOrder).all()
        for order in truc_in_orders:
            self.process_order(order, "Trục in", today, self.truc_in_tree)
        
        # Update dashboard labels with the latest counts and sums
        self.update_dashboard_labels()
        
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
        
        # Determine if the order should be displayed based on the current filter
        if self.should_show_order(order, days_until_due, order_type):
            # Format công nợ khách with thousand separator
            cong_no = f"{order.cong_no_khach:,.0f}" if order.cong_no_khach else "0"
            
            # Assign tag based on order type for identification
            tag = "bang_keo" if order_type == "Băng keo in" else "truc_in"
            
            # Insert data with proper order and formatting
            tree.insert("", "end", values=(
                order.id,  # ID đơn hàng
                order.thoi_gian.strftime("%d/%m/%Y"),  # Ngày tạo đơn
                order.ten_hang,  # Tên đơn
                order.ngay_du_kien.strftime("%d/%m/%Y"),  # Ngày giao
                cong_no,  # Công nợ khách
                "✓" if order.da_giao else "",  # Đã giao
                "✓" if order.da_tat_toan else ""  # Đã tất toán
            ), tags=(tag, str(order.id)))
        
        # After inserting data, apply sort if a column is selected
        sort_state = self.bang_keo_sort if order_type == "Băng keo in" else self.truc_in_sort
        if sort_state['column']:
            self.sort_treeview(sort_state['column'], order_type)
        else:
            self._apply_row_colors(tree)
        
    def should_show_order(self, order, days_until_due, order_type):
        """Determine whether an order should be displayed based on the current filter."""
        if order_type == "Băng keo in":
            filter_value = self.bang_keo_filter_var.get()
            search_text = self.bang_keo_search_var.get().lower().strip()
            selected_month = self.bang_keo_month_var.get()
        else:
            filter_value = self.truc_in_filter_var.get()
            search_text = self.truc_in_search_var.get().lower().strip()
            selected_month = self.truc_in_month_var.get()
        
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
        
    def update_dashboard_labels(self):
        """Update all labels in the dashboard with the latest counts and sums."""
        self.sap_den_han_label.config(text=f"Đơn hàng sắp đến hạn: {self.sap_den_han_count}")
        self.qua_han_label.config(text=f"Đơn hàng quá hạn: {self.qua_han_count}")
        self.chua_tat_toan_label.config(text=f"Chưa tất toán: {self.chua_tat_toan_count}")
        self.hoan_thanh_label.config(text=f"Đã hoàn thành: {self.hoan_thanh_count}")
        self.tong_cong_no_label.config(text=f"Tổng công nợ: {self.tong_cong_no:,.0f}")
        self.tong_doanh_thu_label.config(text=f"Tổng doanh thu: {self.tong_doanh_thu:,.0f}")
        
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
        """Create and display a window to update the status of an order."""
        update_window = tk.Toplevel(self.tab)
        update_window.title("Cập nhật trạng thái")
        update_window.geometry("400x300")
        
        def center_window(window):
            window.update_idletasks()
            width = window.winfo_width()
            height = window.winfo_height()
            x = (window.winfo_screenwidth() // 2) - (width // 2)
            y = (window.winfo_screenheight() // 2) - (height // 2)
            window.geometry(f'{width}x{height}+{x}+{y}')
        
        center_window(update_window)
        update_window.resizable(False, False)
        
        try:
            if order_type == "Băng keo in":
                order = self.parent_form.db_session.query(BangKeoInOrder).filter(BangKeoInOrder.id == order_id).first()
            else:
                order = self.parent_form.db_session.query(TrucInOrder).filter(TrucInOrder.id == order_id).first()
                
            if not order:
                messagebox.showerror("Lỗi", "Không tìm thấy đơn hàng.")
                update_window.destroy()
                return
                
            # Main frame với padding lớn hơn
            main_frame = ttk.Frame(update_window, padding="20")
            main_frame.pack(fill=tk.BOTH, expand=True)
            
            # Tiêu đề với font lớn hơn và đậm hơn
            title_label = ttk.Label(main_frame, 
                                  text=f"{order.ten_hang}", 
                                  font=("Arial", 14, "bold"))
            title_label.pack(pady=(0, 20))
            
            # Frame cho checkboxes với khoảng cách lớn hơn
            checkbox_frame = ttk.Frame(main_frame)
            checkbox_frame.pack(fill=tk.X, pady=20)
            
            # Style cho checkboxes
            style = ttk.Style()
            style.configure("Large.TCheckbutton", 
                           font=("Arial", 12),
                           padding=10)
            
            # Variables cho checkboxes
            da_giao_var = tk.BooleanVar(value=order.da_giao)
            da_tat_toan_var = tk.BooleanVar(value=order.da_tat_toan)
            
            # Checkboxes với font lớn hơn
            ttk.Checkbutton(checkbox_frame, 
                           text="Đã giao", 
                           variable=da_giao_var,
                           style="Large.TCheckbutton").pack(anchor=tk.W, pady=10)
            
            ttk.Checkbutton(checkbox_frame, 
                           text="Đã tất toán", 
                           variable=da_tat_toan_var,
                           style="Large.TCheckbutton").pack(anchor=tk.W, pady=10)
            
            # Frame cho buttons
            button_frame = ttk.Frame(main_frame)
            button_frame.pack(side=tk.BOTTOM, pady=(20, 0))
            
            # Style cho buttons
            style.configure("Action.TButton", 
                           font=("Arial", 11),
                           padding=(20, 10))
            
            def save_changes():
                try:
                    order.da_giao = da_giao_var.get()
                    order.da_tat_toan = da_tat_toan_var.get()
                    if order.da_tat_toan:
                        order.cong_no_khach = 0
                    self.parent_form.db_session.commit()
                    messagebox.showinfo("Thành công", "Cập nhật trạng thái đơn hàng thành công.")
                    update_window.destroy()
                    self.load_data()
                except Exception as e:
                    self.parent_form.db_session.rollback()
                    messagebox.showerror("Lỗi", f"Có lỗi xảy ra khi cập nhật: {str(e)}")
            
            # Buttons với style mới
            ttk.Button(button_frame, 
                      text="Lưu", 
                      command=save_changes,
                      style="Action.TButton").pack(side=tk.LEFT, padx=10)
            
            ttk.Button(button_frame, 
                      text="Hủy", 
                      command=update_window.destroy,
                      style="Action.TButton").pack(side=tk.LEFT, padx=10)
            
        except Exception as e:
            messagebox.showerror("Lỗi", f"Có lỗi xảy ra: {str(e)}")
            update_window.destroy()
        
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
            from report_gen import OrderSelectionDialog
            export_dialog = OrderSelectionDialog(parent=self.tab)
            self.tab.wait_window(export_dialog)
        except Exception as e:
            messagebox.showerror("Lỗi", f"Không thể mở cửa sổ xuất đơn: {str(e)}")

    def sort_treeview(self, col, order_type):
        """Sort treeview content when a column header is clicked"""
        try:
            # Get the correct tree and sort state
            if order_type == "Băng keo in":
                tree = self.bang_keo_tree
                sort_state = self.bang_keo_sort
            else:
                tree = self.truc_in_tree
                sort_state = self.truc_in_sort

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
