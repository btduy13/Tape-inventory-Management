import tkinter as tk
from tkinter import ttk, messagebox
from datetime import datetime
from src.ui.tabs.tab_base import TabBase
from src.database.database import BangKeoInOrder, TrucInOrder
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
        self.DATETIME_FORMAT = '%d/%m/%Y %H:%M:%S'
        
        # Create main frame with padding
        main_frame = ttk.Frame(self.tab, padding="15 15 15 15")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Initialize data storage
        self.bang_keo_in_data = []
        self.truc_in_data = []
        self.all_bang_keo_in_items = []
        self.all_truc_in_items = []
        
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
        title_frame = ttk.Frame(main_frame)
        title_frame.pack(fill=tk.X, pady=(0, 10))
        title_label = ttk.Label(title_frame, text="LỊCH SỬ ĐƠN HÀNG", font=('Arial', 16, 'bold'))
        title_label.pack(pady=10)
        
        # Create filter frame
        self.filter_manager.create_filter_frame(main_frame)
        
        # Instructions frame
        instruction_frame = ttk.LabelFrame(main_frame, text="Hướng dẫn sử dụng", padding="10 5 10 5")
        instruction_frame.pack(fill=tk.X, padx=5, pady=5)
        
        instructions = [
            "- Click chuột để chọn một dòng",
            "- Giữ Ctrl + Click để chọn nhiều dòng riêng lẻ",
            "- Ctrl + A để chọn tất cả các dòng",
            "- Double-click để chỉnh sửa thông tin",
        ]
        
        for instruction in instructions:
            ttk.Label(instruction_frame, text=instruction).pack(anchor=tk.W, padx=5, pady=2)
        
        # Create notebook for categories
        self.category_notebook = ttk.Notebook(main_frame)
        self.category_notebook.pack(fill=tk.BOTH, expand=True, pady=5)
        
        # Create frames for each category
        self.bang_keo_in_frame = ttk.Frame(self.category_notebook, padding="5 5 5 5")
        self.truc_in_frame = ttk.Frame(self.category_notebook, padding="5 5 5 5")
        
        self.category_notebook.add(self.bang_keo_in_frame, text="Băng keo in")
        self.category_notebook.add(self.truc_in_frame, text="Trục in")
        
        # Create treeviews
        self.bang_keo_in_tree = self.tree_manager.create_bang_keo_in_tree(self.bang_keo_in_frame)
        self.truc_in_tree = self.tree_manager.create_truc_in_tree(self.truc_in_frame)
        
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
        
    def load_data_from_db(self):
        try:
            # Load bang keo orders
            bang_keo_in_orders = self.db_session.query(BangKeoInOrder).all()
            for order in bang_keo_in_orders:
                order_data = {
                    'id': order.id,
                    'thoi_gian': order.thoi_gian.strftime(self.DATE_FORMAT),
                    'ten_hang': order.ten_hang,
                    'ngay_du_kien': order.ngay_du_kien.strftime(self.DATE_FORMAT),
                    'quy_cach_mm': order.quy_cach_mm,
                    'quy_cach_m': order.quy_cach_m,
                    'quy_cach_mic': order.quy_cach_mic,
                    'cuon_cay': order.cuon_cay,
                    'so_luong': order.so_luong,
                    'phi_sl': order.phi_sl,
                    'mau_keo': order.mau_keo,
                    'phi_keo': order.phi_keo,
                    'mau_sac': order.mau_sac,
                    'phi_mau': order.phi_mau,
                    'phi_size': order.phi_size,
                    'phi_cat': order.phi_cat,
                    'don_gia_von': order.don_gia_von,
                    'don_gia_goc': order.don_gia_goc,
                    'thanh_tien_goc': order.thanh_tien_goc,
                    'don_gia_ban': order.don_gia_ban,
                    'thanh_tien_ban': order.thanh_tien_ban,
                    'tien_coc': order.tien_coc,
                    'cong_no_khach': order.cong_no_khach,
                    'ctv': order.ctv,
                    'hoa_hong': order.hoa_hong,
                    'tien_hoa_hong': order.tien_hoa_hong,
                    'loi_giay': order.loi_giay,
                    'thung_bao': order.thung_bao,
                    'loi_nhuan': order.loi_nhuan,
                    'da_giao': order.da_giao,
                    'da_tat_toan': order.da_tat_toan
                }
                self.add_order('Băng keo in', order_data)
            
            # Load truc in orders
            truc_in_orders = self.db_session.query(TrucInOrder).all()
            for order in truc_in_orders:
                order_data = {
                    'id': order.id,
                    'thoi_gian': order.thoi_gian.strftime(self.DATE_FORMAT),
                    'ten_hang': order.ten_hang,
                    'ngay_du_kien': order.ngay_du_kien.strftime(self.DATE_FORMAT),
                    'quy_cach': order.quy_cach,
                    'so_luong': order.so_luong,
                    'mau_sac': order.mau_sac,
                    'mau_keo': order.mau_keo,
                    'don_gia_goc': order.don_gia_goc,
                    'thanh_tien': order.thanh_tien,
                    'don_gia_ban': order.don_gia_ban,
                    'thanh_tien_ban': order.thanh_tien_ban,
                    'cong_no_khach': order.cong_no_khach,
                    'ctv': order.ctv,
                    'hoa_hong': order.hoa_hong,
                    'tien_hoa_hong': order.tien_hoa_hong,
                    'loi_nhuan': order.loi_nhuan,
                    'da_giao': order.da_giao,
                    'da_tat_toan': order.da_tat_toan
                }
                self.add_order('Trục in', order_data)
        except Exception as e:
            messagebox.showerror("Lỗi", f"Có lỗi xảy ra khi tải dữ liệu: {str(e)}")
            self.update_status("Lỗi khi tải dữ liệu từ database")
            
    def add_order(self, order_type, order_data):
        current_time = datetime.now().strftime(self.DATE_FORMAT)
        
        if order_type == 'Băng keo in':
            values = [
                order_data.get('id', ''),
                order_data.get('thoi_gian', current_time),
                order_data.get('ten_hang', ''),
                order_data.get('ngay_du_kien', current_time),
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
        else:  # Trục in
            values = [
                order_data.get('id', ''),
                order_data.get('thoi_gian', current_time),
                order_data.get('ten_hang', ''),
                order_data.get('ngay_du_kien', current_time),
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
            
    def delete_selected(self):
        try:
            current_tab = self.category_notebook.select()
            if current_tab == str(self.bang_keo_in_frame):
                tree = self.bang_keo_in_tree
                model = BangKeoInOrder
            else:
                tree = self.truc_in_tree
                model = TrucInOrder

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
                    else:
                        self.all_truc_in_items = [
                            (item, self.truc_in_tree.item(item)['values'])
                            for item in self.truc_in_tree.get_children()
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
        else:
            tree = self.truc_in_tree
        self.edit_manager.show_edit_form(order_type, tree, self.db_session)
        
    def export_selected_to_excel(self):
        current_tab = self.category_notebook.select()
        if current_tab == str(self.bang_keo_in_frame):
            tree = self.bang_keo_in_tree
            sheet_name = "Bang keo in"
        else:
            tree = self.truc_in_tree
            sheet_name = "Truc in"
        self.export_import_manager.export_selected_to_excel(tree, sheet_name)
        
    def export_selected_to_email(self):
        current_tab = self.category_notebook.select()
        if current_tab == str(self.bang_keo_in_frame):
            tree = self.bang_keo_in_tree
            order_type = 'bang_keo_in'
        else:
            tree = self.truc_in_tree
            order_type = 'truc_in'
        self.export_import_manager.export_selected_to_email(tree, order_type)
        
    def refresh_data(self):
        try:
            self.bang_keo_in_tree.delete(*self.bang_keo_in_tree.get_children())
            self.truc_in_tree.delete(*self.truc_in_tree.get_children())
            self.bang_keo_in_data.clear()
            self.truc_in_data.clear()
            self.all_bang_keo_in_items.clear()
            self.all_truc_in_items.clear()
            
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

