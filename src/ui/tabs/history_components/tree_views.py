import tkinter as tk
from tkinter import ttk
import logging
from datetime import datetime

class TreeViewManager:
    def __init__(self, parent):
        self.parent = parent
        self.DATE_FORMAT = '%d/%m/%Y'
        
        
    def create_bang_keo_in_tree(self, frame):
        columns = ('id', 'thoi_gian', 'ten_hang', 'ngay_du_kien', 'quy_cach_mm', 'quy_cach_m', 'quy_cach_mic', 
                  'cuon_cay', 'so_luong', 'phi_sl', 'mau_keo', 'phi_keo', 'mau_sac', 
                  'phi_mau', 'phi_size', 'phi_cat', 'don_gia_von', 'don_gia_goc', 
                  'thanh_tien_goc', 'don_gia_ban', 'thanh_tien_ban', 'tien_coc', 
                  'cong_no_khach', 'ctv', 'hoa_hong', 'tien_hoa_hong',
                  'loi_giay', 'thung_bao', 'loi_nhuan', 'da_giao', 'da_tat_toan')
        
        container = ttk.Frame(frame)
        container.pack(fill=tk.BOTH, expand=True)
        
        container.grid_columnconfigure(0, weight=1)
        container.grid_rowconfigure(0, weight=1)
        
        style = ttk.Style()
        style.configure("Custom.Treeview",
                       background="#ffffff",
                       foreground="black",
                       fieldbackground="#ffffff",
                       rowheight=25)
        style.map("Custom.Treeview",
                 background=[("selected", "#0078D7")],
                 foreground=[("selected", "#ffffff")])
        
        tree = ttk.Treeview(container, columns=columns, show='headings',
                           selectmode='extended', style="Custom.Treeview")
        
        headings = {
            'id': 'ID',
            'thoi_gian': 'Thời gian', 'ten_hang': 'Tên hàng', 
            'ngay_du_kien': 'Ngày dự kiến giao',
            'quy_cach_mm': 'Quy cách (mm)', 'quy_cach_m': 'Quy cách (m)', 
            'quy_cach_mic': 'Quy cách (mic)', 'cuon_cay': 'Cuộn/cây',
            'so_luong': 'Số lượng', 'phi_sl': 'Phí SL', 'mau_keo': 'Màu keo',
            'phi_keo': 'Phí keo', 'mau_sac': 'Màu sắc', 'phi_mau': 'Phí màu',
            'phi_size': 'Phí size', 'phi_cat': 'Phí cắt',
            'don_gia_von': 'Đơn giá vốn', 'don_gia_goc': 'Đơn giá gốc',
            'thanh_tien_goc': 'Thành tiền gốc', 'don_gia_ban': 'Đơn giá bán',
            'thanh_tien_ban': 'Thành tiền bán', 'tien_coc': 'Tiền cọc',
            'cong_no_khach': 'Công nợ khách', 'ctv': 'CTV',
            'hoa_hong': 'Hoa hồng', 'tien_hoa_hong': 'Tiền hoa hồng',
            'loi_giay': 'Li giấy', 'thung_bao': 'Thùng/Bao',
            'loi_nhuan': 'Lợi nhuận',
            'da_giao': 'Đã giao',
            'da_tat_toan': 'Đã tất toán'
        }
        
        for col in columns:
            tree.heading(col, text=headings[col],
                        command=lambda c=col: self.sort_treeview(tree, c, False))
            width = max(len(headings[col])*10, 100)
            tree.column(col, width=width, stretch=False)
        
        y_scrollbar = ttk.Scrollbar(container, orient=tk.VERTICAL, command=tree.yview)
        x_scrollbar = ttk.Scrollbar(container, orient=tk.HORIZONTAL, command=tree.xview)
        tree.configure(yscrollcommand=y_scrollbar.set, xscrollcommand=x_scrollbar.set)
        
        tree.grid(row=0, column=0, sticky='nsew')
        y_scrollbar.grid(row=0, column=1, sticky='ns')
        x_scrollbar.grid(row=1, column=0, sticky='ew')
        
        tree.tag_configure('oddrow', background='#F0F0F0')
        tree.tag_configure('evenrow', background='#FFFFFF')
        
        return tree
        
    def create_truc_in_tree(self, frame):
        columns = ('id', 'thoi_gian', 'ten_hang', 'ngay_du_kien', 'quy_cach', 'so_luong', 'mau_sac',
                  'mau_keo', 'don_gia_goc', 'thanh_tien', 'don_gia_ban',
                  'thanh_tien_ban', 'cong_no_khach', 'ctv', 'hoa_hong',
                  'tien_hoa_hong', 'loi_nhuan', 'da_giao', 'da_tat_toan')
        
        container = ttk.Frame(frame)
        container.pack(fill=tk.BOTH, expand=True)
        
        container.grid_columnconfigure(0, weight=1)
        container.grid_rowconfigure(0, weight=1)
        
        tree = ttk.Treeview(container, columns=columns, show='headings', selectmode='extended')
        
        headings = {
            'id': 'ID',
            'thoi_gian': 'Thời gian', 'ten_hang': 'Tên hàng',
            'ngay_du_kien': 'Ngày dự kiến giao',
            'quy_cach': 'Quy cách', 'so_luong': 'Số lượng',
            'mau_sac': 'Màu sắc', 'mau_keo': 'Màu keo',
            'don_gia_goc': 'Đơn giá gốc', 'thanh_tien': 'Thành tiền',
            'don_gia_ban': 'Đơn giá bán', 'thanh_tien_ban': 'Thành tiền bán',
            'cong_no_khach': 'Công nợ khách', 'ctv': 'CTV',
            'hoa_hong': 'Hoa hồng', 'tien_hoa_hong': 'Tiền hoa hồng',
            'loi_nhuan': 'Lợi nhuận',
            'da_giao': 'Đã giao',
            'da_tat_toan': 'Đã tất toán'
        }
        
        for col in columns:
            tree.heading(col, text=headings[col])
            width = max(len(headings[col])*10, 100)
            tree.column(col, width=width, minwidth=50, stretch=False)
        
        y_scrollbar = ttk.Scrollbar(container, orient=tk.VERTICAL, command=tree.yview)
        x_scrollbar = ttk.Scrollbar(container, orient=tk.HORIZONTAL, command=tree.xview)
        tree.configure(yscrollcommand=y_scrollbar.set, xscrollcommand=x_scrollbar.set)
        
        tree.grid(row=0, column=0, sticky='nsew')
        y_scrollbar.grid(row=0, column=1, sticky='ns')
        x_scrollbar.grid(row=1, column=0, sticky='ew')
        
        return tree
        
    def sort_treeview(self, tree, col, reverse):
        items = [(tree.set(item, col), item) for item in tree.get_children('')]
        
        def convert_value(value):
            try:
                return float(value.replace(',', ''))
            except:
                return value.lower()
        
        items.sort(key=lambda x: convert_value(x[0]), reverse=reverse)
        
        for index, (val, item) in enumerate(items):
            tree.move(item, '', index)
            if index % 2 == 0:
                tree.item(item, tags=('evenrow',))
            else:
                tree.item(item, tags=('oddrow',))
        
        tree.heading(col, command=lambda: self.sort_treeview(tree, col, not reverse))
        
    def apply_row_colors(self, tree):
        items = tree.get_children()
        for i, item in enumerate(items):
            if i % 2 == 0:
                tree.tag_configure('evenrow', background='#FFFFFF')
                tree.item(item, tags=('evenrow',))
            else:
                tree.tag_configure('oddrow', background='#F0F0F0')
                tree.item(item, tags=('oddrow',)) 

    def create_bang_keo_tree(self, frame):
        columns = ('id', 'thoi_gian', 'ten_hang', 'ngay_du_kien', 'quy_cach', 'so_luong', 'mau_sac',
                  'don_gia_goc', 'thanh_tien', 'don_gia_ban', 'thanh_tien_ban', 'cong_no_khach',
                  'ctv', 'hoa_hong', 'tien_hoa_hong', 'loi_nhuan', 'da_giao', 'da_tat_toan')
        
        container = ttk.Frame(frame)
        container.pack(fill=tk.BOTH, expand=True)
        
        container.grid_columnconfigure(0, weight=1)
        container.grid_rowconfigure(0, weight=1)
        
        style = ttk.Style()
        style.configure("Custom.Treeview",
                       background="#ffffff",
                       foreground="black",
                       fieldbackground="#ffffff",
                       rowheight=25)
        style.map("Custom.Treeview",
                 background=[("selected", "#0078D7")],
                 foreground=[("selected", "#ffffff")])
        
        tree = ttk.Treeview(container, columns=columns, show='headings',
                           selectmode='extended', style="Custom.Treeview")
        
        headings = {
            'id': 'ID đơn hàng',
            'thoi_gian': 'Thời gian', 
            'ten_hang': 'Tên hàng',
            'ngay_du_kien': 'Ngày dự kiến',
            'quy_cach': 'Quy cách (KG)',
            'so_luong': 'Số lượng',
            'mau_sac': 'Màu sắc',
            'don_gia_goc': 'Đơn giá gốc',
            'thanh_tien': 'Thành tiền',
            'don_gia_ban': 'Đơn giá bán',
            'thanh_tien_ban': 'Thành tiền bán',
            'cong_no_khach': 'Công nợ khách',
            'ctv': 'CTV',
            'hoa_hong': 'Hoa hồng',
            'tien_hoa_hong': 'Tiền hoa hồng',
            'loi_nhuan': 'Lợi nhuận',
            'da_giao': 'Đã giao',
            'da_tat_toan': 'Đã tất toán'
        }
        
        for col in columns:
            tree.heading(col, text=headings[col],
                        command=lambda c=col: self.sort_treeview(tree, c, False))
            # Set width for each column
            if col == 'id':
                tree.column(col, width=100, stretch=False)
            elif col in ['thoi_gian', 'ngay_du_kien']:
                tree.column(col, width=120, minwidth=120)
            elif col == 'ten_hang':
                tree.column(col, width=200, minwidth=150)
            else:
                tree.column(col, width=100, minwidth=80)
                
        y_scrollbar = ttk.Scrollbar(container, orient=tk.VERTICAL, command=tree.yview)
        x_scrollbar = ttk.Scrollbar(container, orient=tk.HORIZONTAL, command=tree.xview)
        tree.configure(yscrollcommand=y_scrollbar.set, xscrollcommand=x_scrollbar.set)
        
        tree.grid(row=0, column=0, sticky='nsew')
        y_scrollbar.grid(row=0, column=1, sticky='ns')
        x_scrollbar.grid(row=1, column=0, sticky='ew')
        
        tree.tag_configure('oddrow', background='#F0F0F0')
        tree.tag_configure('evenrow', background='#FFFFFF')
        
        return tree
        