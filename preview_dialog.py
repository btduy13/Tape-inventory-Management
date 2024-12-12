import tkinter as tk
from tkinter import ttk
from tkinter import messagebox

class PreviewDialog(tk.Toplevel):
    def __init__(self, parent, order_data):
        super().__init__(parent)
        self.title("Xem trước đơn hàng")
        self.order_data = order_data
        
        # Create main frame
        main_frame = ttk.Frame(self)
        main_frame.pack(padx=10, pady=10, fill='both', expand=True)
        
        # Customer information
        customer_frame = ttk.LabelFrame(main_frame, text="Thông tin khách hàng")
        customer_frame.pack(fill='x', pady=(0, 10))
        
        ttk.Label(customer_frame, text="Kính gửi:").grid(row=0, column=0, padx=5, pady=5)
        self.customer_name = ttk.Entry(customer_frame)
        self.customer_name.grid(row=0, column=1, padx=5, pady=5)
        self.customer_name.insert(0, order_data.get('customer_name', ''))
        
        ttk.Label(customer_frame, text="Địa chỉ:").grid(row=1, column=0, padx=5, pady=5)
        self.address = ttk.Entry(customer_frame, width=50)
        self.address.grid(row=1, column=1, padx=5, pady=5)
        self.address.insert(0, order_data.get('address', ''))
        
        # Products table
        products_frame = ttk.LabelFrame(main_frame, text="Chi tiết đơn hàng")
        products_frame.pack(fill='both', expand=True)
        
        # Create Treeview for products with row height adjustment
        columns = ('product', 'specs', 'text_color', 'bg_color', 'unit', 'quantity', 'price', 'total')
        style = ttk.Style()
        style.configure("Treeview", rowheight=60)  # Set default row height
        
        self.tree = ttk.Treeview(products_frame, columns=columns, show='headings', style="Treeview")
        
        # Set column headers and widths
        headers = {
            'product': ('Tên Sản Phẩm', 200),
            'specs': ('Quy Cách', 100),
            'text_color': ('Màu Chữ', 100),
            'bg_color': ('Màu Nền', 100),
            'unit': ('Đơn Vị', 80),
            'quantity': ('Số Lượng', 100),
            'price': ('Đơn Giá', 100),
            'total': ('Tổng Cộng', 120)
        }
        
        # Configure columns with specific widths
        for col, (header, width) in headers.items():
            self.tree.heading(col, text=header)
            self.tree.column(col, width=width, minwidth=width)
        
        # Add scrollbars
        v_scrollbar = ttk.Scrollbar(products_frame, orient='vertical', command=self.tree.yview)
        h_scrollbar = ttk.Scrollbar(products_frame, orient='horizontal', command=self.tree.xview)
        self.tree.configure(yscrollcommand=v_scrollbar.set, xscrollcommand=h_scrollbar.set)
        
        # Pack scrollbars and treeview
        self.tree.pack(side='top', fill='both', expand=True)
        h_scrollbar.pack(side='bottom', fill='x')
        v_scrollbar.pack(side='right', fill='y')
        
        # Load data into table
        for item in order_data.get('products', []):
            # Format long text with newlines if needed
            values = (
                self.format_cell_text(item['product']),
                self.format_cell_text(item['specs']),
                self.format_cell_text(item['text_color']),
                self.format_cell_text(item['bg_color']),
                item['unit'],
                item['quantity'],
                item['price'],
                item['total']
            )
            self.tree.insert('', 'end', values=values)

        # Add VAT and Deposit fields
        totals_frame = ttk.LabelFrame(main_frame, text="Tổng cộng")
        totals_frame.pack(fill='x', pady=10)

        ttk.Label(totals_frame, text="VAT:").grid(row=0, column=0, padx=5, pady=5)
        self.vat = ttk.Entry(totals_frame)
        self.vat.grid(row=0, column=1, padx=5, pady=5)
        self.vat.insert(0, "0")

        ttk.Label(totals_frame, text="Tiền cọc:").grid(row=0, column=2, padx=5, pady=5)
        self.deposit = ttk.Entry(totals_frame)
        self.deposit.grid(row=0, column=3, padx=5, pady=5)
        self.deposit.insert(0, "0")
        
        # Control buttons
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(pady=10)
        
        ttk.Button(button_frame, text="Chỉnh sửa dòng", command=self.edit_row).pack(side='left', padx=5)
        ttk.Button(button_frame, text="Xuất PDF", command=self.confirm).pack(side='left', padx=5)
        ttk.Button(button_frame, text="Hủy", command=self.cancel).pack(side='left', padx=5)
        
        # Bind double click to edit
        self.tree.bind('<Double-1>', lambda e: self.edit_row())
        
        self.result = None
        
        # Center the window
        self.update_idletasks()
        width = self.winfo_width()
        height = self.winfo_height()
        x = (self.winfo_screenwidth() // 2) - (width // 2)
        y = (self.winfo_screenheight() // 2) - (height // 2)
        self.geometry(f'{width}x{height}+{x}+{y}')
        
    def format_cell_text(self, text):
        """Format long text to fit in cell with newlines"""
        if not text:
            return text
        words = str(text).split()
        lines = []
        current_line = []
        
        for word in words:
            current_line.append(word)
            if len(' '.join(current_line)) > 20:  # Adjust this number for desired line length
                if len(current_line) > 1:
                    lines.append(' '.join(current_line[:-1]))
                    current_line = [word]
                else:
                    lines.append(word)
                    current_line = []
                    
        if current_line:
            lines.append(' '.join(current_line))
            
        return '\n'.join(lines)
        
    def edit_row(self):
        selected_item = self.tree.selection()
        if not selected_item:
            messagebox.showwarning("Cảnh báo", "Vui lòng chọn một dòng để chỉnh sửa")
            return
            
        item = self.tree.item(selected_item[0])
        EditRowDialog(self, item['values'], selected_item[0])
        
    def update_row(self, item_id, values):
        self.tree.item(item_id, values=values)
        
    def confirm(self):
        try:
            # Validate VAT and deposit as numbers
            vat = float(self.vat.get() or 0)
            deposit = float(self.deposit.get() or 0)

            # Update data
            products = []
            for item_id in self.tree.get_children():
                values = self.tree.item(item_id)['values']
                products.append({
                    'product': values[0],
                    'specs': values[1],
                    'text_color': values[2],
                    'bg_color': values[3],
                    'unit': values[4],
                    'quantity': values[5],
                    'price': values[6],
                    'total': values[7]
                })
                
            self.result = {
                'customer_name': self.customer_name.get(),
                'address': self.address.get(),
                'products': products,
                'vat': vat,
                'deposit': deposit
            }
            self.destroy()
        except ValueError:
            messagebox.showerror("Lỗi", "VAT và Tiền cọc phải là số")
        
    def cancel(self):
        self.result = None
        self.destroy()

class EditRowDialog(tk.Toplevel):
    def __init__(self, parent, values, item_id):
        super().__init__(parent)
        self.title("Chỉnh sửa dòng")
        self.parent = parent
        self.item_id = item_id
        
        # Create main frame with padding
        main_frame = ttk.Frame(self, padding="10")
        main_frame.pack(fill='both', expand=True)
        
        # Configure grid weights
        main_frame.grid_columnconfigure(1, weight=1)
        
        # Create input fields with consistent spacing and alignment
        fields = [
            ('Tên Sản Phẩm', 40),
            ('Quy Cách', 20),
            ('Màu Chữ', 20),
            ('Màu Nền', 20),
            ('Đơn Vị', 10),
            ('Số Lượng', 15),
            ('Đơn Giá', 15),
            ('Tổng Cộng', 15)
        ]
        
        self.entries = []
        
        for i, ((field, width), value) in enumerate(zip(fields, values)):
            # Label
            label = ttk.Label(main_frame, text=field, anchor='e')
            label.grid(row=i, column=0, padx=(5,10), pady=5, sticky='e')
            
            # Entry/Combobox
            if field == 'Đơn Vị':
                entry = ttk.Combobox(main_frame, values=['Cuộn', 'Cây'], width=width)
                entry.set(value)
            else:
                entry = ttk.Entry(main_frame, width=width)
                entry.insert(0, value)
            
            entry.grid(row=i, column=1, padx=5, pady=5, sticky='ew')
            self.entries.append(entry)
        
        # Button frame
        button_frame = ttk.Frame(main_frame)
        button_frame.grid(row=len(fields), column=0, columnspan=2, pady=15)
        
        # Buttons
        ttk.Button(button_frame, text="Lưu", command=self.save, width=10).pack(side='left', padx=5)
        ttk.Button(button_frame, text="Hủy", command=self.destroy, width=10).pack(side='left', padx=5)
        
        # Center the window
        self.update_idletasks()
        width = self.winfo_width()
        height = self.winfo_height()
        x = (self.winfo_screenwidth() // 2) - (width // 2)
        y = (self.winfo_screenheight() // 2) - (height // 2)
        self.geometry(f'{width}x{height}+{x}+{y}')
        
        # Make dialog modal
        self.transient(parent)
        self.grab_set()
        
        # Focus first entry
        self.entries[0].focus_set()
        
    def save(self):
        values = [entry.get() for entry in self.entries]
        self.parent.update_row(self.item_id, values)
        self.destroy() 