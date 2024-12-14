import tkinter as tk
from tkinter import ttk
from tkinter import messagebox

class PreviewDialog(tk.Toplevel):
    def __init__(self, parent, order_data):
        super().__init__(parent)
        self.title("Xem trước đơn hàng")
        self.order_data = order_data
        
        # Remove style clam and use default system style
        style = ttk.Style(self)
        # style.theme_use("clam") # remove this line

        # Set a default font for all widgets
        default_font = ("Segoe UI", 10)
        self.option_add("*Font", default_font)

        self.configure(background="white")
        
        # Create main frame with uniform padding
        main_frame = ttk.Frame(self, padding=10)
        main_frame.grid(row=0, column=0, sticky='nsew')
        
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(0, weight=1)
        main_frame.grid_rowconfigure(0, weight=1)
        main_frame.grid_columnconfigure(0, weight=1)
        
        # Default row heights
        self.default_row_height = 25
        self.expanded_row_height = 60
        
        # Style for treeview rows
        style.configure("PreviewDialog.Treeview", rowheight=self.default_row_height, font=default_font)
        
        # content_frame with padding
        content_frame = ttk.Frame(main_frame, padding=10)
        content_frame.grid(row=0, column=0, sticky='nsew')
        
        # Customer information
        customer_frame = ttk.LabelFrame(content_frame, text="Thông tin khách hàng", padding=10)
        customer_frame.pack(fill='x', pady=(0, 10))
        
        ttk.Label(customer_frame, text="Kính gửi:").grid(row=0, column=0, padx=(0,5), pady=5, sticky='e')
        self.customer_name = ttk.Entry(customer_frame)
        self.customer_name.grid(row=0, column=1, padx=5, pady=5, sticky='ew')
        self.customer_name.insert(0, self.order_data.get('customer_name', ''))
        
        ttk.Label(customer_frame, text="Địa chỉ:").grid(row=1, column=0, padx=(0,5), pady=5, sticky='e')
        self.address = ttk.Entry(customer_frame, width=50)
        self.address.grid(row=1, column=1, padx=5, pady=5, sticky='ew')
        self.address.insert(0, self.order_data.get('address', ''))

        customer_frame.grid_columnconfigure(1, weight=1)

        # Products frame
        products_frame = ttk.LabelFrame(content_frame, text="Chi tiết đơn hàng", padding=10)
        products_frame.pack(fill='both', expand=True, pady=(0, 10))
        
        # Create Treeview for products
        columns = ('product', 'specs', 'text_color', 'bg_color', 'unit', 'quantity', 'price', 'total')
        style.configure("PreviewDialog.Treeview", rowheight=60, font=default_font)
        
        tree_frame = ttk.Frame(products_frame)
        tree_frame.pack(fill='both', expand=True)
        
        self.tree = ttk.Treeview(tree_frame, columns=columns, show='headings', style="PreviewDialog.Treeview")
        
        # Adjust columns: "Tên Sản Phẩm" anchored to left, wider
        headers = {
            'product': ('Tên Sản Phẩm', 300, 'w'),
            'specs': ('Quy Cách', 100, 'center'),
            'text_color': ('Màu Chữ', 100, 'center'),
            'bg_color': ('Màu Nền', 100, 'center'),
            'unit': ('Đơn Vị', 80, 'center'),
            'quantity': ('Số Lượng', 100, 'center'),
            'price': ('Đơn Giá', 100, 'center'),
            'total': ('Tổng Cộng', 120, 'center')
        }
        
        for col, (header, width, anch) in headers.items():
            self.tree.heading(col, text=header)
            self.tree.column(col, width=width, minwidth=width, anchor=anch)
        
        # Add scrollbars
        v_scrollbar = ttk.Scrollbar(tree_frame, orient='vertical', command=self.tree.yview)
        h_scrollbar = ttk.Scrollbar(tree_frame, orient='horizontal', command=self.tree.xview)
        self.tree.configure(yscrollcommand=v_scrollbar.set, xscrollcommand=h_scrollbar.set)
        
        self.tree.grid(row=0, column=0, sticky='nsew')
        v_scrollbar.grid(row=0, column=1, sticky='ns')
        h_scrollbar.grid(row=1, column=0, sticky='ew')
        
        tree_frame.grid_columnconfigure(0, weight=1)
        tree_frame.grid_rowconfigure(0, weight=1)
        
        products_list = self.order_data.get('products', [])
        for item in products_list:
            price_value = float(item['price'])
            total_value = float(item['total'])
            values = (
                self.format_cell_text(item['product']),
                self.format_cell_text(item['specs']),
                self.format_cell_text(item['text_color']),
                self.format_cell_text(item['bg_color']),
                item['unit'],
                item['quantity'],
                self.format_currency(price_value),
                self.format_currency(total_value)
            )
            self.tree.insert('', 'end', values=values)

        # Tính tổng cộng các sản phẩm
        self.total_sum = sum(float(p['total']) for p in products_list if 'total' in p and p['total'] is not None)

        # Totals frame: "Tổng cộng", "VAT", "Cọc" trên 1 dòng
        totals_frame = ttk.LabelFrame(main_frame, text="Tổng cộng", padding=10)
        totals_frame.grid(row=1, column=0, sticky='ew', padx=10, pady=(0,10))
        
        # Tổng cộng
        ttk.Label(totals_frame, text="Tổng cộng:").grid(row=0, column=0, padx=(5,5), pady=5, sticky='e')
        self.total_entry = ttk.Entry(totals_frame, width=15, state='readonly')
        self.total_entry.grid(row=0, column=1, padx=(0,20), pady=5, sticky='w')
        self.total_entry.configure(state='normal')
        self.total_entry.delete(0, tk.END)
        self.total_entry.insert(0, self.format_currency(self.total_sum))
        self.total_entry.configure(state='readonly')

        # VAT
        ttk.Label(totals_frame, text="VAT:").grid(row=0, column=2, padx=(0,5), pady=5, sticky='e')
        self.vat = ttk.Entry(totals_frame, width=10)
        self.vat.grid(row=0, column=3, padx=(0,20), pady=5, sticky='w')
        self.vat.insert(0, "0")

        # Cọc
        ttk.Label(totals_frame, text="Cọc:").grid(row=0, column=4, padx=(0,5), pady=5, sticky='e')
        self.deposit = ttk.Entry(totals_frame, width=10)
        self.deposit.grid(row=0, column=5, padx=5, pady=5, sticky='w')
        self.deposit.insert(0, "0")

        totals_frame.grid_columnconfigure(1, weight=1)
        
        # Button frame at the bottom
        button_frame = ttk.Frame(main_frame, padding=10)
        button_frame.grid(row=2, column=0, sticky='ew')
        
        # Right align buttons
        ttk.Button(button_frame, text="Hủy", command=self.cancel).pack(side='right', padx=5)
        ttk.Button(button_frame, text="Xuất PDF", command=self.confirm).pack(side='right', padx=5)
        ttk.Button(button_frame, text="Chỉnh sửa dòng", command=self.edit_row).pack(side='right', padx=5)
        
        # Bind double click to edit
        self.tree.bind('<Double-1>', lambda e: self.edit_row())
        
        self.result = None
        
        # Let the window size itself according to the content
        self.update_idletasks()
        
        # Get the requested size
        req_width = self.winfo_reqwidth()
        req_height = self.winfo_reqheight()
        
        # Limit window size
        max_width = 1200
        max_height = 600
        final_width = min(req_width, max_width)
        final_height = min(req_height, max_height)
        
        # Center the window on the screen
        x = (self.winfo_screenwidth() // 2) - (final_width // 2)
        y = (self.winfo_screenheight() // 2) - (final_height // 2)
        self.geometry(f'{final_width}x{final_height}+{x}+{y}')
        
    def format_currency(self, value):
        # Format currency with commas and no decimal places
        return "{:,.0f}".format(value)

    def format_cell_text(self, text):
        """Format long text into multiple lines if needed."""
        if not text:
            return text
        words = str(text).split()
        lines = []
        current_line = []
        max_chars = 20
        
        for word in words:
            current_line.append(word)
            if len(' '.join(current_line)) > max_chars:
                if len(current_line) > 1:
                    lines.append(' '.join(current_line[:-1]))
                    current_line = [word]
                else:
                    lines.append(word)
                    current_line = []
                    
        if current_line:
            lines.append(' '.join(current_line))
            
        result = '\n'.join(lines)
        
        if result.count('\n') > 0:
            style = ttk.Style()
            required_height = (result.count('\n') + 1) * 20
            style.configure("PreviewDialog.Treeview", rowheight=max(self.expanded_row_height, required_height))
        
        return result
        
    def reset_row_height(self):
        style = ttk.Style()
        style.configure("PreviewDialog.Treeview", rowheight=self.default_row_height)
        
    def update_row(self, item_id, values):
        # Parse numeric values for price and total, handling comma-separated numbers
        try:
            price_str = values[6].replace(',', '')
            total_str = values[7].replace(',', '')
            price_val = float(price_str) if price_str.replace('.', '').isdigit() else 0.0
            total_val = float(total_str) if total_str.replace('.', '').isdigit() else 0.0
        except (ValueError, AttributeError):
            price_val = 0.0
            total_val = 0.0
        
        formatted_values = [
            self.format_cell_text(values[0]),
            self.format_cell_text(values[1]),
            self.format_cell_text(values[2]),
            self.format_cell_text(values[3]),
            values[4],
            values[5],
            self.format_currency(price_val),
            self.format_currency(total_val)
        ]
        
        self.tree.item(item_id, values=formatted_values)
        
        needs_expansion = any(
            str(val).count('\n') > 0 
            for val in formatted_values[:4]
        )
        
        style = ttk.Style()
        if needs_expansion:
            max_lines = max(str(val).count('\n') for val in formatted_values[:4]) + 1
            required_height = max_lines * 20
            style.configure("PreviewDialog.Treeview", rowheight=max(self.expanded_row_height, required_height))
        else:
            style.configure("PreviewDialog.Treeview", rowheight=self.default_row_height)
        
        self.update_totals()

    def update_totals(self):
        # Recalculate total after update
        total_sum = 0.0
        for item_id in self.tree.get_children():
            vals = self.tree.item(item_id)['values']
            if len(vals) > 7:
                # vals[7] is total formatted with commas, need to parse it back to float
                try:
                    total_sum += float(vals[7].replace(',', ''))
                except ValueError:
                    pass
        self.total_sum = total_sum
        self.total_entry.configure(state='normal')
        self.total_entry.delete(0, tk.END)
        self.total_entry.insert(0, self.format_currency(self.total_sum))
        self.total_entry.configure(state='readonly')
        
    def edit_row(self):
        selected_item = self.tree.selection()
        if not selected_item:
            messagebox.showwarning("Cảnh báo", "Vui lòng chọn một dòng để chỉnh sửa")
            return
            
        item = self.tree.item(selected_item[0])
        EditRowDialog(self, item['values'], selected_item[0])
        
    def confirm(self):
        try:
            # Parse VAT and deposit as float with possible commas
            vat_str = self.vat.get().replace(',', '')
            deposit_str = self.deposit.get().replace(',', '')
            vat = float(vat_str or 0)
            deposit = float(deposit_str or 0)

            products = []
            for item_id in self.tree.get_children():
                values = self.tree.item(item_id)['values']
                # Parse back numeric fields safely
                try:
                    # Handle both string and numeric types for total
                    total_val = values[7]
                    if isinstance(total_val, str):
                        product_total = float(total_val.replace(',', ''))
                    else:
                        product_total = float(total_val)

                    # Handle both string and numeric types for price
                    price_val = values[6]
                    if isinstance(price_val, str):
                        product_price = float(price_val.replace(',', ''))
                    else:
                        product_price = float(price_val)

                    products.append({
                        'product': values[0],
                        'specs': values[1],
                        'text_color': values[2],
                        'bg_color': values[3],
                        'unit': values[4],
                        'quantity': values[5],
                        'price': product_price,
                        'total': product_total
                    })
                except (ValueError, IndexError) as e:
                    print(f"Error parsing row values: {e}")
                    messagebox.showerror("Lỗi", f"Lỗi khi xử lý dữ liệu dòng: {str(e)}")
                    return
                
            self.result = {
                'customer_name': self.customer_name.get(),
                'address': self.address.get(),
                'products': products,
                'total_sum': self.total_sum,
                'vat': vat,
                'deposit': deposit
            }
            self.destroy()
        except ValueError as e:
            print(f"Error in confirm: {e}")
            messagebox.showerror("Lỗi", "VAT và Cọc phải là số")
        except Exception as e:
            print(f"Unexpected error in confirm: {e}")
            messagebox.showerror("Lỗi", f"Lỗi không mong đợi: {str(e)}")
        
    def cancel(self):
        self.result = None
        self.destroy()


class EditRowDialog(tk.Toplevel):
    def __init__(self, parent, values, item_id):
        super().__init__(parent)
        self.title("Chỉnh sửa dòng")
        self.parent = parent
        self.item_id = item_id
        
        style = ttk.Style(self)
        # style.theme_use("clam") # no clam style
        default_font = ("Segoe UI", 10)
        self.option_add("*Font", default_font)
        self.configure(background="white")
        
        main_frame = ttk.Frame(self, padding=10)
        main_frame.pack(fill='both', expand=True)
        
        main_frame.grid_columnconfigure(1, weight=1)
        
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
            label = ttk.Label(main_frame, text=field, anchor='e')
            label.grid(row=i, column=0, padx=(5,10), pady=5, sticky='e')
            
            entry = ttk.Entry(main_frame, width=width)
            # Không format lại ở đây, chỉ giữ nguyên dữ liệu sẵn có
            entry.insert(0, value)
            
            entry.grid(row=i, column=1, padx=5, pady=5, sticky='ew')
            self.entries.append(entry)
        
        button_frame = ttk.Frame(main_frame, padding=(0,10))
        button_frame.grid(row=len(fields), column=0, columnspan=2, pady=15, sticky='e')

        # Right align buttons
        ttk.Button(button_frame, text="Hủy", command=self.destroy, width=10).pack(side='right', padx=5)
        ttk.Button(button_frame, text="Lưu", command=self.save, width=10).pack(side='right', padx=5)
        
        self.update_idletasks()
        req_width = self.winfo_reqwidth()
        req_height = self.winfo_reqheight()
        
        max_width = 600
        max_height = 400
        final_width = min(req_width, max_width)
        final_height = min(req_height, max_height)
        
        x = (self.winfo_screenwidth() // 2) - (final_width // 2)
        y = (self.winfo_screenheight() // 2) - (final_height // 2)
        self.geometry(f'{final_width}x{final_height}+{x}+{y}')
        
        self.transient(parent)
        self.grab_set()
        self.entries[0].focus_set()
        
    def save(self):
        values = [entry.get() for entry in self.entries]
        self.parent.update_row(self.item_id, values)
        self.destroy()
