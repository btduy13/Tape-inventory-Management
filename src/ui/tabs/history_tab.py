import tkinter as tk
from tkinter import ttk, messagebox
from datetime import datetime
from src.ui.tabs.tab_base import TabBase
from src.database.database import BangKeoInOrder, TrucInOrder, BangKeoOrder
import logging
from src.services.excel_import import export_template, import_data
from src.ui.tabs.history_components.tree_views import TreeViewManager
from src.ui.tabs.history_components.edit_dialog import EditDialogManager
from src.ui.tabs.history_components.filters import FilterManager
from src.ui.tabs.history_components.export_import import ExportImportManager
from src.ui.tabs.history_components.utils import HistoryUtils

class HistoryTab(TabBase):
    def __init__(self, notebook, parent_form):
        super().__init__(parent_form)
        self.tab = ttk.Frame(notebook)
        notebook.add(self.tab, text="Lịch sử")
        self.db_session = parent_form.db_session
        
        # Define standard date formats
        self.DATE_FORMAT = '%d/%m/%Y'
        self.DATE_FORMAT = '%d/%m/%Y'
        
        # Create main frame with padding
        main_frame = ttk.Frame(self.tab, padding="15 15 15 15")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Initialize data storage
        self.bang_keo_in_data = []
        self.truc_in_data = []
        self.bang_keo_data = []
        self.all_bang_keo_in_items = []
        self.all_truc_in_items = []
        self.all_bang_keo_items = []
        
        # Initialize managers
        self.tree_manager = TreeViewManager(self)
        self.edit_manager = EditDialogManager(self)
        self.filter_manager = FilterManager(self)
        self.export_import_manager = ExportImportManager(self)
        self.utils = HistoryUtils()
        
        # Build the UI components
        self.build_ui(main_frame)
        
        # Load data from database
        self.load_data_from_db()

    def build_ui(self, main_frame):
        # Title with better styling
        title_label = ttk.Label(main_frame, text="LỊCH SỬ ĐƠN HÀNG", 
                              font=('Segoe UI', 16, 'bold'))
        title_label.pack(pady=(0, 10))
        
        # Create filter frame
        self.filter_manager.create_filter_frame(main_frame)
        
        # Create notebook for categories
        self.category_notebook = ttk.Notebook(main_frame)
        self.category_notebook.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Create frames for each category
        self.bang_keo_in_frame = ttk.Frame(self.category_notebook)
        self.truc_in_frame = ttk.Frame(self.category_notebook)
        self.bang_keo_frame = ttk.Frame(self.category_notebook)
        
        # Add frames to notebook
        self.category_notebook.add(self.bang_keo_in_frame, text="Băng keo in")
        self.category_notebook.add(self.truc_in_frame, text="Trục in")
        self.category_notebook.add(self.bang_keo_frame, text="Băng keo")
        
        # Create treeviews
        self.bang_keo_in_tree = self.tree_manager.create_bang_keo_in_tree(self.bang_keo_in_frame)
        self.truc_in_tree = self.tree_manager.create_truc_in_tree(self.truc_in_frame)
        self.bang_keo_tree = self.tree_manager.create_bang_keo_tree(self.bang_keo_frame)
        
        # Create button frame
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(fill=tk.X, padx=5, pady=10, side=tk.BOTTOM)
        
        # Configure grid to make buttons stick during resizing
        button_frame.columnconfigure((0, 1, 2, 3), weight=1)
        
        # Add buttons with tooltips
        export_excel_btn = ttk.Button(button_frame, text="Xuất Excel", 
                                    command=self.export_selected_to_excel, width=15)
        export_excel_btn.grid(row=0, column=0, padx=5, sticky='ew')
        self.utils.create_tooltip(export_excel_btn, "Xuất dữ liệu đã chọn ra file Excel (Ctrl+E)")
        
        export_email_btn = ttk.Button(button_frame, text="Xuất Email", 
                                    command=self.export_selected_to_email, width=15)
        export_email_btn.grid(row=0, column=1, padx=5, sticky='ew')
        self.utils.create_tooltip(export_email_btn, "Xuất dữ liệu đã chọn thành email (Ctrl+M)")
        
        delete_btn = ttk.Button(button_frame, text="Xóa", command=self.delete_selected, width=15)
        delete_btn.grid(row=0, column=2, padx=5, sticky='ew')
        self.utils.create_tooltip(delete_btn, "Xóa các dòng đã chọn (Delete)")
        
        refresh_btn = ttk.Button(button_frame, text="Làm mới", command=self.refresh_data, width=15)
        refresh_btn.grid(row=0, column=3, padx=5, sticky='ew')
        self.utils.create_tooltip(refresh_btn, "Làm mới dữ liệu (F5)")
        
        # Status bar
        self.status_bar = ttk.Label(main_frame, text="", relief=tk.SUNKEN, anchor=tk.W)
        self.status_bar.pack(fill=tk.X, side=tk.BOTTOM, pady=(5, 0))
        
        # Bind keyboard shortcuts
        self.bind_shortcuts()
        
        # Bind notebook tab change event
        self.category_notebook.bind('<<NotebookTabChanged>>', self.on_tab_changed)
        
        # Bind double-click events
        self.bang_keo_in_tree.bind('<Double-1>', lambda e: self.show_edit_form('bang_keo_in'))
        self.truc_in_tree.bind('<Double-1>', lambda e: self.show_edit_form('truc_in'))
        self.bang_keo_tree.bind('<Double-1>', lambda e: self.show_edit_form('bang_keo'))

    def load_data_from_db(self):
        try:
            # Load bang keo in orders
            bang_keo_in_orders = self.db_session.query(BangKeoInOrder).all()
            for order in bang_keo_in_orders:
                self.add_order('bang_keo_in', order.__dict__)
            
            # Load truc in orders
            truc_in_orders = self.db_session.query(TrucInOrder).all()
            for order in truc_in_orders:
                self.add_order('truc_in', order.__dict__)
                
            # Load bang keo orders
            bang_keo_orders = self.db_session.query(BangKeoOrder).all()
            for order in bang_keo_orders:
                self.add_order('bang_keo', order.__dict__)
            
            self.update_status("Đã tải dữ liệu thành công")
            
        except Exception as e:
            messagebox.showerror("Lỗi", f"Có lỗi xảy ra khi tải dữ liệu: {str(e)}")
            self.update_status("Lỗi khi tải dữ liệu")

    def add_order(self, order_type, order_data):
        # Format thời gian từ datetime object sang string theo định dạng dd/mm/yyyy
        def format_datetime(dt):
            if isinstance(dt, str):
                try:
                    dt = datetime.strptime(dt, '%Y-%m-%d %H:%M:%S.%f')
                except ValueError:
                    try:
                        dt = datetime.strptime(dt, '%Y-%m-%d %H:%M:%S')
                    except ValueError:
                        return dt
            return dt.strftime('%d/%m/%Y') if dt else ''

        if order_type == 'bang_keo_in':
            values = [
                order_data.get('id', ''),
                format_datetime(order_data.get('thoi_gian', '')),
                order_data.get('ten_hang', ''),
                format_datetime(order_data.get('ngay_du_kien', '')),
                order_data.get('quy_cach_mm', ''),
                order_data.get('quy_cach_m', ''),
                order_data.get('quy_cach_mic', ''),
                order_data.get('cuon_cay', ''),
                order_data.get('so_luong', ''),
                self.utils.format_currency(order_data.get('phi_sl', '')),
                order_data.get('mau_keo', ''),
                self.utils.format_currency(order_data.get('phi_keo', '')),
                order_data.get('mau_sac', ''),
                self.utils.format_currency(order_data.get('phi_mau', '')),
                self.utils.format_currency(order_data.get('phi_size', '')),
                self.utils.format_currency(order_data.get('phi_cat', '')),
                self.utils.format_currency(order_data.get('don_gia_von', '')),
                self.utils.format_currency(order_data.get('don_gia_goc', '')),
                self.utils.format_currency(order_data.get('thanh_tien_goc', '')),
                self.utils.format_currency(order_data.get('don_gia_ban', '')),
                self.utils.format_currency(order_data.get('thanh_tien_ban', '')),
                self.utils.format_currency(order_data.get('tien_coc', '')),
                self.utils.format_currency(order_data.get('cong_no_khach', '')),
                order_data.get('ctv', ''),
                order_data.get('hoa_hong', ''),
                self.utils.format_currency(order_data.get('tien_hoa_hong', '')),
                order_data.get('loi_giay', ''),
                order_data.get('thung_bao', ''),
                self.utils.format_currency(order_data.get('loi_nhuan', '')),
                order_data.get('da_giao', ''),
                order_data.get('da_tat_toan', '')
            ]
            item = self.bang_keo_in_tree.insert('', 0, values=values)
            self.bang_keo_in_data.append(item)
            self.all_bang_keo_in_items.append((item, values))
        elif order_type == 'truc_in':
            values = [
                order_data.get('id', ''),
                format_datetime(order_data.get('thoi_gian', '')),
                order_data.get('ten_hang', ''),
                format_datetime(order_data.get('ngay_du_kien', '')),
                order_data.get('quy_cach', ''),
                order_data.get('so_luong', ''),
                order_data.get('mau_sac', ''),
                order_data.get('mau_keo', ''),
                self.utils.format_currency(order_data.get('don_gia_goc', '')),
                self.utils.format_currency(order_data.get('thanh_tien', '')),
                self.utils.format_currency(order_data.get('don_gia_ban', '')),
                self.utils.format_currency(order_data.get('thanh_tien_ban', '')),
                self.utils.format_currency(order_data.get('cong_no_khach', '')),
                order_data.get('ctv', ''),
                order_data.get('hoa_hong', ''),
                self.utils.format_currency(order_data.get('tien_hoa_hong', '')),
                self.utils.format_currency(order_data.get('loi_nhuan', '')),
                order_data.get('da_giao', ''),
                order_data.get('da_tat_toan', '')
            ]
            item = self.truc_in_tree.insert('', 0, values=values)
            self.truc_in_data.append(item)
            self.all_truc_in_items.append((item, values))
        else:  # bang_keo
            values = [
                order_data.get('id', ''),
                format_datetime(order_data.get('thoi_gian', '')),
                order_data.get('ten_hang', ''),
                format_datetime(order_data.get('ngay_du_kien', '')),
                order_data.get('quy_cach', ''),
                order_data.get('so_luong', ''),
                order_data.get('mau_sac', ''),
                self.utils.format_currency(order_data.get('don_gia_goc', '')),
                self.utils.format_currency(order_data.get('thanh_tien', '')),
                self.utils.format_currency(order_data.get('don_gia_ban', '')),
                self.utils.format_currency(order_data.get('thanh_tien_ban', '')),
                self.utils.format_currency(order_data.get('cong_no_khach', '')),
                order_data.get('ctv', ''),
                order_data.get('hoa_hong', ''),
                self.utils.format_currency(order_data.get('tien_hoa_hong', '')),
                self.utils.format_currency(order_data.get('loi_nhuan', '')),
                order_data.get('da_giao', ''),
                order_data.get('da_tat_toan', '')
            ]
            item = self.bang_keo_tree.insert('', 0, values=values)
            self.bang_keo_data.append(item)
            self.all_bang_keo_items.append((item, values))

    def delete_selected(self):
        try:
            current_tab = self.category_notebook.select()
            if current_tab == str(self.bang_keo_in_frame):
                tree = self.bang_keo_in_tree
                model = BangKeoInOrder
            elif current_tab == str(self.truc_in_frame):
                tree = self.truc_in_tree
                model = TrucInOrder
            else:
                tree = self.bang_keo_tree
                model = BangKeoOrder

            selected_items = tree.selection()
            if not selected_items:
                messagebox.showwarning("Cảnh báo", "Vui lòng chọn ít nhất một dòng để xóa")
                return

            if messagebox.askyesno("Xác nhận", "Bạn có chắc muốn xóa các dòng đã chọn?"):
                for item in selected_items:
                    try:
                        item_values = tree.item(item)['values']
                        record_id = item_values[0]
                        
                        record = self.db_session.query(model).filter_by(id=record_id).first()
                        if record:
                            self.db_session.delete(record)
                            self.db_session.commit()
                            logging.info(f"Successfully deleted record {record_id} from database")
                        
                        tree.delete(item)
                        logging.info(f"Successfully deleted item from tree")
                    except Exception as e:
                        logging.error(f"Error deleting item: {str(e)}")
                        self.db_session.rollback()
                        continue

                try:
                    self.update_status("Đã xóa các dòng đã chọn")
                    
                    if current_tab == str(self.bang_keo_in_frame):
                        self.all_bang_keo_in_items = [
                            (item, self.bang_keo_in_tree.item(item)['values'])
                            for item in self.bang_keo_in_tree.get_children()
                        ]
                    elif current_tab == str(self.truc_in_frame):
                        self.all_truc_in_items = [
                            (item, self.truc_in_tree.item(item)['values'])
                            for item in self.truc_in_tree.get_children()
                        ]
                    else:
                        self.all_bang_keo_items = [
                            (item, self.bang_keo_tree.item(item)['values'])
                            for item in self.bang_keo_tree.get_children()
                        ]
                        
                    if hasattr(self.parent_form, 'thong_ke_tab'):
                        self.parent_form.thong_ke_tab.load_data()
                        
                except Exception as e:
                    logging.error(f"Error updating UI after deletion: {str(e)}")
                    raise

        except Exception as e:
            self.db_session.rollback()
            logging.error(f"Error in delete_selected: {str(e)}")
            messagebox.showerror("Lỗi", f"Có lỗi xảy ra khi xóa: {str(e)}")
            self.update_status("Lỗi khi xóa dữ liệu")
            
    def show_edit_form(self, order_type):
        if order_type == 'bang_keo_in':
            tree = self.bang_keo_in_tree
        elif order_type == 'truc_in':
            tree = self.truc_in_tree
        else:
            tree = self.bang_keo_tree
        self.edit_manager.show_edit_form(order_type, tree, self.db_session)
        
    def export_selected_to_excel(self):
        current_tab = self.category_notebook.select()
        if current_tab == str(self.bang_keo_in_frame):
            tree = self.bang_keo_in_tree
            sheet_name = "Bang keo in"
        elif current_tab == str(self.truc_in_frame):
            tree = self.truc_in_tree
            sheet_name = "Truc in"
        else:
            tree = self.bang_keo_tree
            sheet_name = "Bang keo"
        self.export_import_manager.export_selected_to_excel(tree, sheet_name)
        
    def export_selected_to_email(self):
        current_tab = self.category_notebook.select()
        if current_tab == str(self.bang_keo_in_frame):
            tree = self.bang_keo_in_tree
            order_type = 'bang_keo_in'
        elif current_tab == str(self.truc_in_frame):
            tree = self.truc_in_tree
            order_type = 'truc_in'
        else:
            tree = self.bang_keo_tree
            order_type = 'bang_keo'
        self.export_import_manager.export_selected_to_email(tree, order_type)
        
    def refresh_data(self):
        try:
            self.bang_keo_in_tree.delete(*self.bang_keo_in_tree.get_children())
            self.truc_in_tree.delete(*self.truc_in_tree.get_children())
            self.bang_keo_tree.delete(*self.bang_keo_tree.get_children())
            self.bang_keo_in_data.clear()
            self.truc_in_data.clear()
            self.bang_keo_data.clear()
            self.all_bang_keo_in_items.clear()
            self.all_truc_in_items.clear()
            self.all_bang_keo_items.clear()
            
            self.load_data_from_db()
            
            self.update_status("Đã cập nhật dữ liệu")
            
        except Exception as e:
            messagebox.showerror("Lỗi", f"Có lỗi xảy ra khi cập nhật dữ liệu: {str(e)}")
            self.update_status("Lỗi khi cập nhật dữ liệu")
            
    def bind_shortcuts(self):
        self.root.bind('<Control-f>', lambda e: self.filter_manager.focus_search())
        self.root.bind('<F5>', lambda e: self.refresh_data())
        self.root.bind('<Delete>', lambda e: self.delete_selected())
        self.root.bind('<Control-e>', lambda e: self.export_selected_to_excel())
        self.root.bind('<Control-m>', lambda e: self.export_selected_to_email())
        
    def on_tab_changed(self, event):
        pass
        
    def update_status(self, message):
        self.status_bar.config(text=message)
        self.root.after(3000, lambda: self.status_bar.config(text=""))

    def process_order(self, order, order_type, today, tree):
        """Process each order to update counters and insert into Treeview if it matches the filter."""
        try:
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
                tag = "bang_keo_in" if order_type == "Băng keo in" else "truc_in" if order_type == "Trục in" else "bang_keo"
                
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
            sort_state = self.bang_keo_in_sort if order_type == "Băng keo in" else self.truc_in_sort if order_type == "Trục in" else self.bang_keo_sort
            if sort_state['column']:
                self.sort_treeview(sort_state['column'], order_type)
            else:
                self._apply_row_colors(tree)
                
        except Exception as e:
            logging.error(f"Error processing order {order.id}: {str(e)}")
            raise

