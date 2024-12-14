import tkinter as tk
from tkinter import ttk
import logging
from datetime import datetime
from tkcalendar import DateEntry

class FilterManager:
    def __init__(self, parent):
        self.parent = parent
        self.DATE_FORMAT = '%d/%m/%Y'
        self.search_var = tk.StringVar()
        self.search_var.trace('w', self.on_search)
        
    def create_filter_frame(self, main_frame):
        search_filter_frame = ttk.LabelFrame(main_frame, text="Tìm kiếm và lọc", padding="5 5 5 5")
        search_filter_frame.pack(fill=tk.X, padx=5, pady=(0, 10))
        
        # Date filter frame
        date_frame = ttk.Frame(search_filter_frame)
        date_frame.pack(fill=tk.X, padx=5, pady=5)
        
        # From date
        ttk.Label(date_frame, text="Từ ngày:").pack(side=tk.LEFT, padx=5)
        self.from_date = DateEntry(date_frame, width=12, background='darkblue',
                                 foreground='white', borderwidth=2,
                                 date_pattern='dd-mm-yyyy', locale='vi_VN')
        self.from_date.pack(side=tk.LEFT, padx=5)
        
        # To date
        ttk.Label(date_frame, text="Đến ngày:").pack(side=tk.LEFT, padx=5)
        self.to_date = DateEntry(date_frame, width=12, background='darkblue',
                               foreground='white', borderwidth=2,
                               date_pattern='dd-mm-yyyy', locale='vi_VN')
        self.to_date.pack(side=tk.LEFT, padx=5)
        
        # Filter button
        filter_btn = ttk.Button(date_frame, text="Lọc", command=self.apply_filters)
        filter_btn.pack(side=tk.LEFT, padx=5)
        
        # Reset filter button
        reset_btn = ttk.Button(date_frame, text="Đặt lại", command=self.reset_filters)
        reset_btn.pack(side=tk.LEFT, padx=5)
        
        # Search frame
        search_frame = ttk.Frame(search_filter_frame)
        search_frame.pack(fill=tk.X, padx=5, pady=5)
        
        # Search entry
        search_entry = ttk.Entry(search_frame, textvariable=self.search_var, width=40)
        search_entry.pack(side=tk.LEFT, padx=5)
        ttk.Label(search_frame, text="(Tìm theo tên hàng, thời gian, CTV)").pack(side=tk.LEFT, padx=5)
        
    def on_search(self, *args):
        search_text = self.search_var.get().lower()
        current_tab = self.parent.category_notebook.select()
        
        if current_tab == str(self.parent.bang_keo_in_frame):
            tree = self.parent.bang_keo_in_tree
            all_items = self.parent.all_bang_keo_in_items
        else:
            tree = self.parent.truc_in_tree
            all_items = self.parent.all_truc_in_items

        for item in tree.get_children():
            tree.delete(item)
        
        from_date = self.from_date.get_date()
        to_date = self.to_date.get_date()

        for _, values in all_items:
            try:
                date_match = True
                if from_date and to_date:
                    order_date = datetime.strptime(values[1], self.DATE_FORMAT).date()
                    expected_date = datetime.strptime(values[3], self.DATE_FORMAT).date()
                    date_match = (from_date <= order_date <= to_date or 
                                from_date <= expected_date <= to_date)

                text_match = True
                if search_text:
                    text_match = False
                    for value in values:
                        if str(value).lower().find(search_text) != -1:
                            text_match = True
                            break

                if date_match and text_match:
                    tree.insert('', 'end', values=values)

            except (ValueError, IndexError) as e:
                logging.error(f"Error processing item in on_search: {str(e)}")
                continue

        self._apply_row_colors(tree)
        
    def apply_filters(self):
        try:
            from_date = self.from_date.get_date()
            to_date = self.to_date.get_date()
            search_text = self.search_var.get().lower()
            
            current_tab = self.parent.category_notebook.select()
            if current_tab == str(self.parent.bang_keo_in_frame):
                tree = self.parent.bang_keo_in_tree
                all_items = self.parent.all_bang_keo_in_items
            else:
                tree = self.parent.truc_in_tree
                all_items = self.parent.all_truc_in_items
            
            for item in tree.get_children():
                tree.delete(item)
            
            for item_id, values in all_items:
                try:
                    text_match = True
                    if search_text:
                        text_match = False
                        for value in values:
                            if str(value).lower().find(search_text) != -1:
                                text_match = True
                                break
                    
                    if text_match and from_date and to_date:
                        order_date_str = values[1]
                        order_date = datetime.strptime(order_date_str, self.DATE_FORMAT).date()
                        date_match = from_date <= order_date <= to_date
                        text_match = text_match and date_match
                    
                    if text_match:
                        tree.insert('', 'end', values=values)
                        
                        items = tree.get_children()
                        for i, item in enumerate(items):
                            if i % 2 == 0:
                                tree.tag_configure('evenrow', background='#FFFFFF')
                                tree.item(item, tags=('evenrow',))
                            else:
                                tree.tag_configure('oddrow', background='#F0F0F0')
                                tree.item(item, tags=('oddrow',))
                
                except (ValueError, IndexError) as e:
                    logging.error(f"Error processing item in apply_filters: {str(e)}")
                    continue
            
            self.parent.update_status("Đã áp dụng bộ lọc")
            
        except Exception as e:
            logging.error(f"Error in apply_filters: {str(e)}")
            messagebox.showerror("Lỗi", f"Có lỗi xảy ra khi lọc dữ liệu: {str(e)}")
            
    def reset_filters(self):
        try:
            current_date = datetime.now().date()
            self.from_date.set_date(current_date)
            self.to_date.set_date(current_date)
            
            self.search_var.set('')
            
            current_tab = self.parent.category_notebook.select()
            if current_tab == str(self.parent.bang_keo_in_frame):
                tree = self.parent.bang_keo_in_tree
                all_items = self.parent.all_bang_keo_in_items
            else:
                tree = self.parent.truc_in_tree
                all_items = self.parent.all_truc_in_items
            
            for item in tree.get_children():
                tree.delete(item)
            
            for _, values in all_items:
                tree.insert('', 'end', values=values)
            
            messagebox.showinfo("Thông báo", "Đã đặt lại bộ lọc")
        except Exception as e:
            messagebox.showerror("Lỗi", f"Có lỗi xảy ra khi đặt lại bộ lọc: {str(e)}")
            
    def _apply_row_colors(self, tree):
        items = tree.get_children()
        for i, item in enumerate(items):
            if i % 2 == 0:
                tree.tag_configure('evenrow', background='#FFFFFF')
                tree.item(item, tags=('evenrow',))
            else:
                tree.tag_configure('oddrow', background='#F0F0F0')
                tree.item(item, tags=('oddrow',)) 