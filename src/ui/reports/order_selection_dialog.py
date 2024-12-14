import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from ..db.database import init_db, get_session, get_filtered_orders, get_orders_from_database
from ..utils.helpers import convert_order_to_preview_data, apply_row_colors, sort_treeview_items
from ..pdf_gen.pdf_generator import create_order_pdf
from src.ui.forms.preview_dialog import PreviewDialog

class OrderSelectionDialog(tk.Toplevel):
    def __init__(self, parent=None):
        super().__init__(parent if parent else tk.Tk())
        self.title("Chọn đơn hàng")
        
        # Add sort tracking variables
        self.sort_column = None
        self.sort_reverse = False
        
        # Initialize database connection
        self.engine = init_db()
        self.session = get_session(self.engine)
        
        self.selected_orders = []
        self.result = False
        
        # Configure the window
        self.resizable(True, True)
        self.minsize(800, 600)
        
        # Create widgets
        self.create_widgets()
        
        # Center the window
        self.update_idletasks()
        width = self.winfo_width()
        height = self.winfo_height()
        x = (self.winfo_screenwidth() // 2) - (width // 2)
        y = (self.winfo_screenheight() // 2) - (height // 2)
        self.geometry(f'{width}x{height}+{x}+{y}')
        
        # Make dialog modal
        self.transient(parent if parent else None)
        self.grab_set()
        
        # Bind window close event
        self.protocol("WM_DELETE_WINDOW", self.cancel)
    
    def create_widgets(self):
        try:
            # Main container
            main_container = ttk.Frame(self)
            main_container.pack(fill='both', expand=True, padx=10, pady=10)
            
            # Search frame
            search_frame = ttk.LabelFrame(main_container, text="Tìm kiếm")
            search_frame.pack(fill='x', pady=(0, 10))
            
            # Search entry
            search_container = ttk.Frame(search_frame)
            search_container.pack(fill='x', padx=5, pady=5)
            
            ttk.Label(search_container, text="Tìm kiếm:").pack(side='left', padx=5)
            self.search_var = tk.StringVar()
            self.search_entry = ttk.Entry(search_container, textvariable=self.search_var)
            self.search_entry.pack(side='left', fill='x', expand=True, padx=5)
            
            # Bind search text changes
            self.search_var.trace_add('write', self.on_filter_change)
            
            # Month filter
            month_container = ttk.Frame(search_frame)
            month_container.pack(fill='x', padx=5, pady=5)
            
            ttk.Label(month_container, text="Tháng:").pack(side='left', padx=5)
            self.month_var = tk.StringVar(value="Tất cả")
            months = ["Tất cả"] + [f"Tháng {i}" for i in range(1, 13)]
            month_cb = ttk.Combobox(month_container, textvariable=self.month_var,
                                   values=months, state="readonly", width=15)
            month_cb.pack(side='left', padx=5)
            
            # Bind month selection changes
            self.month_var.trace_add('write', self.on_filter_change)
            
            # Order type filter
            filter_container = ttk.Frame(search_frame)
            filter_container.pack(fill='x', padx=5, pady=5)
            
            self.order_type_var = tk.StringVar(value="all")
            ttk.Radiobutton(filter_container, text="Tất cả", variable=self.order_type_var, 
                           value="all", command=self.filter_orders).pack(side='left', padx=5)
            ttk.Radiobutton(filter_container, text="Băng keo in", variable=self.order_type_var, 
                           value="BK", command=self.filter_orders).pack(side='left', padx=5)
            ttk.Radiobutton(filter_container, text="Trục in", variable=self.order_type_var, 
                           value="TI", command=self.filter_orders).pack(side='left', padx=5)
            
            # Orders frame
            orders_frame = ttk.LabelFrame(main_container, text="Danh sách đơn hàng")
            orders_frame.pack(fill='both', expand=True)
            
            # Treeview
            self.tree = ttk.Treeview(orders_frame, columns=('id', 'date', 'name', 'quantity', 'price'), 
                                   show='headings', selectmode='extended')
            
            # Set column headings with sort command
            self.tree.heading('id', text='Mã đơn', 
                            command=lambda: self.sort_treeview('id'))
            self.tree.heading('date', text='Ngày', 
                            command=lambda: self.sort_treeview('date'))
            self.tree.heading('name', text='Tên hàng', 
                            command=lambda: self.sort_treeview('name'))
            self.tree.heading('quantity', text='Số Lượng', 
                            command=lambda: self.sort_treeview('quantity'))
            self.tree.heading('price', text='Đơn giá', 
                            command=lambda: self.sort_treeview('price'))
            
            # Set column widths
            self.tree.column('id', width=100)
            self.tree.column('date', width=100)
            self.tree.column('name', width=300)
            self.tree.column('quantity', width=100)
            self.tree.column('price', width=100)
            
            # Add scrollbar
            scrollbar = ttk.Scrollbar(orders_frame, orient='vertical', command=self.tree.yview)
            self.tree.configure(yscrollcommand=scrollbar.set)
            
            # Pack scrollbar and treeview
            self.tree.pack(side='left', fill='both', expand=True, padx=5, pady=5)
            scrollbar.pack(side='right', fill='y', pady=5)
            
            # Buttons frame
            button_frame = ttk.Frame(main_container)
            button_frame.pack(fill='x', pady=10)
            
            # Style configuration for extra large buttons
            style = ttk.Style()
            style.configure('ExtraLarge.TButton', 
                           padding=(30, 15),
                           font=('TkDefaultFont', 12))
            
            # Create extra large buttons
            ttk.Button(button_frame, text="Xuất đơn đặt hàng", 
                      command=self.confirm,
                      style='ExtraLarge.TButton').pack(side='right', padx=15)
            ttk.Button(button_frame, text="Hủy", 
                      command=self.cancel,
                      style='ExtraLarge.TButton').pack(side='right', padx=15)
            
            # Load initial data
            self.load_orders()
            
        except Exception as e:
            print(f"Error creating widgets: {str(e)}")
            messagebox.showerror("Lỗi", f"Không thể tạo giao diện: {str(e)}")
    
    def load_orders(self):
        try:
            # Clear existing items
            for item in self.tree.get_children():
                self.tree.delete(item)
            
            # Get orders using the database module
            orders = get_filtered_orders(self.session)
            
            # Add orders to treeview
            for order in orders:
                self.tree.insert('', 'end', values=(
                    order.id,
                    order.thoi_gian.strftime('%d/%m/%Y'),
                    order.ten_hang,
                    f"{order.so_luong:,.0f}",
                    f"{order.don_gia_ban:,.0f}"
                ))
                
            # Apply row colors
            apply_row_colors(self.tree)
                
        except Exception as e:
            print(f"Error loading orders: {str(e)}")
            messagebox.showerror("Lỗi", f"Không thể tải danh sách đơn hàng: {str(e)}")
    
    def on_filter_change(self, *args):
        """Handle changes in any filter (search text or month)"""
        self.filter_orders()

    def filter_orders(self):
        try:
            search_text = self.search_var.get().lower().strip()
            order_type = self.order_type_var.get()
            selected_month = self.month_var.get()
            
            # Clear existing items
            for item in self.tree.get_children():
                self.tree.delete(item)
            
            # Get filtered orders using the database module
            orders = get_filtered_orders(
                self.session,
                search_text=search_text,
                order_type=order_type,
                selected_month=selected_month
            )
            
            # Add filtered orders to treeview
            for order in orders:
                self.tree.insert('', 'end', values=(
                    order.id,
                    order.thoi_gian.strftime('%d/%m/%Y'),
                    order.ten_hang,
                    f"{order.so_luong:,.0f}",
                    f"{order.don_gia_ban:,.0f}"
                ))
            
            # After inserting all items, sort by current column if one is selected
            if self.sort_column:
                self.sort_treeview(self.sort_column)
            else:
                # Apply alternating row colors
                apply_row_colors(self.tree)
                
        except Exception as e:
            print(f"Error filtering orders: {str(e)}")
            messagebox.showerror("Lỗi", f"Lỗi khi lọc đơn hàng: {str(e)}")
    
    def confirm(self):
        try:
            selected_items = self.tree.selection()
            if not selected_items:
                messagebox.showwarning("Cảnh báo", "Vui lòng chọn ít nhất một đơn hàng")
                return
            
            self.selected_orders = [self.tree.item(item)['values'][0] for item in selected_items]
            self.result = True
            
            # Process the selected orders
            self.process_selected_orders()
            
        except Exception as e:
            print(f"Error confirming selection: {str(e)}")
            messagebox.showerror("Lỗi", f"Lỗi khi xác nhận lựa chọn: {str(e)}")
    
    def process_selected_orders(self):
        try:
            # Get orders from database
            orders = get_orders_from_database(self.session, self.selected_orders)
            if not orders:
                messagebox.showerror("Lỗi", "Không tìm thấy đơn hàng trong cơ sở dữ liệu")
                return
            
            # Convert orders to preview data format
            preview_data = {
                'customer_name': '',
                'address': '',
                'products': [convert_order_to_preview_data(order) for order in orders]
            }
            
            # Show preview dialog
            preview = PreviewDialog(self, preview_data)
            preview.transient(self)
            preview.grab_set()
            self.wait_window(preview)
            
            # If user confirms, show save dialog and generate PDF
            if preview.result:
                filename = filedialog.asksaveasfilename(
                    defaultextension=".pdf",
                    filetypes=[("PDF files", "*.pdf"), ("All files", "*.*")],
                    title="Lưu đơn đặt hàng",
                    initialfile="don_dat_hang.pdf"
                )
                
                if filename:
                    create_order_pdf(filename, preview.result)
                    messagebox.showinfo("Thành công", f"Đã xuất PDF thành công!\nFile được lưu tại: {filename}")
            
        except Exception as e:
            print(f"Error processing orders: {str(e)}")
            messagebox.showerror("Lỗi", f"Lỗi khi xử lý đơn hàng: {str(e)}")
    
    def cancel(self):
        try:
            self.selected_orders = []
            self.result = False
            if hasattr(self, 'session'):
                self.session.close()
            self.destroy()
            
        except Exception as e:
            print(f"Error canceling: {str(e)}")
            messagebox.showerror("Lỗi", f"L���i: {str(e)}")
            self.destroy()

    def sort_treeview(self, col):
        """Sort treeview when a column header is clicked"""
        try:
            # If clicking the same column, reverse the sort order
            if self.sort_column == col:
                self.sort_reverse = not self.sort_reverse
            else:
                self.sort_column = col
                self.sort_reverse = False
            
            # Use helper function to sort items
            sort_treeview_items(self.tree, col, self.sort_reverse)
            
            # Apply alternating row colors
            apply_row_colors(self.tree)
            
        except Exception as e:
            print(f"Error sorting treeview: {str(e)}")
            messagebox.showerror("Lỗi", f"Lỗi khi sắp xếp dữ liệu: {str(e)}") 