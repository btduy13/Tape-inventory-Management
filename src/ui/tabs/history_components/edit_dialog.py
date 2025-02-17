import tkinter as tk
from tkinter import ttk, messagebox
from datetime import datetime
from tkcalendar import DateEntry
from src.database.database import BangKeoInOrder, TrucInOrder, BangKeoOrder

class EditDialogManager:
    def __init__(self, parent):
        self.parent = parent
        self.DATE_FORMAT = '%d/%m/%Y'
        self.DATE_FORMAT = '%d/%m/%Y'
        self.edit_entries = {}
        self.current_edit_item = None
        self.current_edit_type = None
        
    def show_edit_form(self, order_type, tree, db_session):
        if order_type == 'bang_keo_in':
            readonly_fields = [
                'id',
                'don_gia_goc', 'thanh_tien_goc', 'thanh_tien_ban',
                'cong_no_khach', 'tien_hoa_hong', 'loi_nhuan'
            ]
            calculation_trigger_fields = [
                'so_luong', 'phi_sl', 'phi_keo', 'phi_size', 'phi_cat', 'don_gia_von', 'don_gia_ban', 'tien_coc',
                'hoa_hong', 'phi_mau', 'quy_cach_mm', 'quy_cach_m', 'quy_cach_mic', 'cuon_cay'
            ]
            window_title = "Chỉnh sửa đơn hàng Băng Keo In"
        elif order_type == 'truc_in':
            readonly_fields = [
                'id',
                'thanh_tien', 'thanh_tien_ban', 'cong_no_khach',
                'tien_hoa_hong', 'loi_nhuan'
            ]
            calculation_trigger_fields = [
                'so_luong', 'don_gia_ban', 'don_gia_goc', 'hoa_hong'
            ]
            window_title = "Chỉnh sửa đơn hàng Trục In"
        else:  # bang_keo
            readonly_fields = [
                'id',
                'thanh_tien', 'thanh_tien_ban', 'cong_no_khach',
                'tien_hoa_hong', 'loi_nhuan'
            ]
            calculation_trigger_fields = [
                'so_luong', 'don_gia_ban', 'don_gia_goc', 'hoa_hong'
            ]
            window_title = "Chỉnh sửa đơn hàng Băng Keo"
            
        selected_item = tree.selection()
        if not selected_item:
            return
            
        values = tree.item(selected_item[0])['values']
        self.current_edit_item = selected_item[0]
        self.current_edit_type = order_type
        
        # Get the root window from the tree widget
        root = tree.winfo_toplevel()
        
        edit_window = tk.Toplevel(root)
        edit_window.title(window_title)
        edit_window.geometry("800x600")
        edit_window.minsize(800, 600)
        
        edit_window.transient(root)
        edit_window.grab_set()
        
        window_width = 800
        window_height = 600
        screen_width = edit_window.winfo_screenwidth()
        screen_height = edit_window.winfo_screenheight()
        center_x = int((screen_width - window_width) / 2)
        center_y = int((screen_height - window_height) / 2)
        edit_window.geometry(f'{window_width}x{window_height}+{center_x}+{center_y}')

        # Configure edit window grid
        edit_window.grid_columnconfigure(0, weight=1)
        edit_window.grid_rowconfigure(0, weight=0)  # Title section
        edit_window.grid_rowconfigure(1, weight=1)  # Content section
        edit_window.grid_rowconfigure(2, weight=0)  # Button section

        # Create main frame with grid
        main_frame = ttk.Frame(edit_window, padding="10 5 10 5")
        main_frame.grid(row=1, column=0, sticky='nsew')
        main_frame.grid_columnconfigure(0, weight=1)
        main_frame.grid_rowconfigure(0, weight=1)

        # Create title section with better styling
        title_section = ttk.Frame(edit_window, style='Title.TFrame')
        title_section.grid(row=0, column=0, sticky='ew', pady=(0, 5))
        title_section.grid_columnconfigure(0, weight=1)

        # Configure styles for title
        style = ttk.Style()
        style.configure('Title.TFrame', background='#2196F3')
        style.configure('DialogTitle.TLabel', 
                       font=('Segoe UI', -14, 'bold'),
                       foreground='white',
                       background='#2196F3',
                       padding=(0, 10))

        # Create title label
        title_label = ttk.Label(title_section, 
                              text=window_title, 
                              style='DialogTitle.TLabel', 
                              anchor='center')
        title_label.grid(row=0, column=0, sticky='ew')

        # Create content frame with grid
        content_frame = ttk.Frame(main_frame)
        content_frame.grid(row=0, column=0, sticky='nsew')
        content_frame.grid_columnconfigure(0, weight=1)
        content_frame.grid_rowconfigure(0, weight=1)
        
        # Create canvas and scrollable frame
        canvas = tk.Canvas(content_frame)
        scrollbar_y = ttk.Scrollbar(content_frame, orient="vertical", command=canvas.yview)
        scrollbar_x = ttk.Scrollbar(content_frame, orient="horizontal", command=canvas.xview)
        
        # Configure canvas
        canvas.configure(yscrollcommand=scrollbar_y.set, xscrollcommand=scrollbar_x.set)
        
        # Create scrollable frame
        scrollable_frame = ttk.Frame(canvas)
        scrollable_frame.grid_columnconfigure(0, weight=1)
        
        # Add scrollable frame to canvas
        canvas_frame = canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        
        # Grid layout for canvas and scrollbars
        canvas.grid(row=0, column=0, sticky='nsew', padx=(0, 2))
        scrollbar_y.grid(row=0, column=1, sticky='ns')
        scrollbar_x.grid(row=1, column=0, sticky='ew')
        
        # Configure content frame grid weights
        content_frame.grid_columnconfigure(0, weight=1)
        content_frame.grid_rowconfigure(0, weight=1)
        
        self.edit_entries = {}
        
        if order_type == 'bang_keo_in':
            self._create_bang_keo_in_form(scrollable_frame, values, readonly_fields)
        elif order_type == 'truc_in':
            self._create_truc_in_form(scrollable_frame, values, readonly_fields)
        else:  # bang_keo
            self._create_bang_keo_form(scrollable_frame, values, readonly_fields)
        
        # Create button frame
        button_frame = ttk.Frame(edit_window)
        button_frame.grid(row=2, column=0, sticky='ew', padx=10, pady=(5, 10))
        button_frame.grid_columnconfigure(1, weight=1)  # Push buttons to the right
        
        # Configure button style for auto-resizing text
        style.configure('AutoResize.TButton', 
                       font=('TkDefaultFont', -12),
                       padding=(10, 3))
        
        # Create buttons with auto-resize style
        cancel_button = ttk.Button(button_frame, text="Hủy", style='AutoResize.TButton',
                                 command=edit_window.destroy)
        save_button = ttk.Button(button_frame, text="Lưu", style='AutoResize.TButton',
                               command=lambda: self.save_edit(tree, db_session, edit_window))
        
        cancel_button.grid(row=0, column=2, padx=(0, 3))
        save_button.grid(row=0, column=3, padx=(0, 3))
        
        # Configure canvas scrolling
        def configure_scroll_region(event):
            canvas.configure(scrollregion=canvas.bbox("all"))
            
        def configure_canvas_width(event):
            canvas.itemconfig(canvas_frame, width=event.width)
            
        scrollable_frame.bind("<Configure>", configure_scroll_region)
        canvas.bind("<Configure>", configure_canvas_width)
        
        # Bind mouse wheel to scroll
        def on_mousewheel(event):
            canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")
            
        canvas.bind_all("<MouseWheel>", on_mousewheel)
        
        # Bind keyboard shortcuts
        edit_window.bind('<Escape>', lambda e: edit_window.destroy())
        edit_window.bind('<Control-s>', lambda e: self.save_edit(tree, db_session, edit_window))
        
        # Set initial focus
        for entry in self.edit_entries.values():
            if entry.cget('state') != 'readonly':
                entry.focus_set()
                break
                
        # Update window size based on content
        edit_window.update_idletasks()
        
        # Configure main frame grid weights for resizing
        main_frame.grid_columnconfigure(0, weight=1)
        main_frame.grid_rowconfigure(0, weight=1)
        
    def _create_bang_keo_in_form(self, main_frame, values, readonly_fields):
        # Configure main frame for resizing
        main_frame.grid_columnconfigure(0, weight=1)
        
        # Create frames with grid layout
        info_frame = ttk.LabelFrame(main_frame, text="Thông tin đơn hàng", padding="8 5 8 5")
        info_frame.grid(row=0, column=0, sticky='ew', padx=3, pady=3)
        info_frame.grid_columnconfigure((1, 3), weight=1)
        
        specs_frame = ttk.LabelFrame(main_frame, text="Quy cách", padding="8 5 8 5")
        specs_frame.grid(row=1, column=0, sticky='ew', padx=3, pady=3)
        specs_frame.grid_columnconfigure((1, 3), weight=1)
        
        price_frame = ttk.LabelFrame(main_frame, text="Giá và phí", padding="8 5 8 5")
        price_frame.grid(row=2, column=0, sticky='ew', padx=3, pady=3)
        price_frame.grid_columnconfigure((1, 3, 5), weight=1)
        
        # Info section
        self._create_field(info_frame, 'thoi_gian', 'Thời gian:', values, 0, 0, readonly_fields)
        self._create_field(info_frame, 'ten_hang', 'Tên hàng:', values, 0, 2, readonly_fields)
        self._create_field(info_frame, 'ngay_du_kien', 'Ngày dự kiến:', values, 1, 0, readonly_fields)
        
        # Specs section
        self._create_field(specs_frame, 'quy_cach_mm', 'Quy cách (mm):', values, 0, 0, readonly_fields)
        self._create_field(specs_frame, 'quy_cach_m', 'Quy cách (m):', values, 0, 2, readonly_fields)
        self._create_field(specs_frame, 'quy_cach_mic', 'Quy cách (mic):', values, 1, 0, readonly_fields)
        self._create_field(specs_frame, 'cuon_cay', 'Cuộn/cây:', values, 1, 2, readonly_fields)
        self._create_field(specs_frame, 'so_luong', 'Số lượng:', values, 2, 0, readonly_fields)
        
        # Price section
        self._create_field(price_frame, 'phi_sl', 'Phí SL:', values, 0, 0, readonly_fields)
        self._create_field(price_frame, 'mau_keo', 'Màu keo:', values, 0, 2, readonly_fields)
        self._create_field(price_frame, 'phi_keo', 'Phí keo:', values, 0, 4, readonly_fields)
        
        self._create_field(price_frame, 'mau_sac', 'Màu sắc:', values, 1, 0, readonly_fields)
        self._create_field(price_frame, 'phi_mau', 'Phí màu:', values, 1, 2, readonly_fields)
        self._create_field(price_frame, 'phi_size', 'Phí size:', values, 1, 4, readonly_fields)
        
        self._create_field(price_frame, 'phi_cat', 'Phí cắt:', values, 2, 0, readonly_fields)
        self._create_field(price_frame, 'don_gia_von', 'Đơn giá vốn:', values, 2, 2, readonly_fields)
        self._create_field(price_frame, 'don_gia_goc', 'Đơn giá gốc:', values, 2, 4, readonly_fields)
        
        self._create_field(price_frame, 'thanh_tien_goc', 'Thành tiền gốc:', values, 3, 0, readonly_fields)
        self._create_field(price_frame, 'don_gia_ban', 'Đơn giá bán:', values, 3, 2, readonly_fields)
        self._create_field(price_frame, 'thanh_tien_ban', 'Thành tiền bán:', values, 3, 4, readonly_fields)
        
        self._create_field(price_frame, 'tien_coc', 'Tiền cọc:', values, 4, 0, readonly_fields)
        self._create_field(price_frame, 'cong_no_khach', 'Công nợ khách:', values, 4, 2, readonly_fields)
        
        self._create_field(price_frame, 'ctv', 'CTV:', values, 5, 0, readonly_fields)
        self._create_field(price_frame, 'hoa_hong', 'Hoa hồng (%):', values, 5, 2, readonly_fields)
        self._create_field(price_frame, 'tien_hoa_hong', 'Tiền hoa hồng:', values, 5, 4, readonly_fields)
        
        self._create_field(price_frame, 'loi_giay', 'Lõi giấy:', values, 6, 0, readonly_fields)
        self._create_field(price_frame, 'thung_bao', 'Thùng/Bao:', values, 6, 2, readonly_fields)
        self._create_field(price_frame, 'loi_nhuan', 'Lợi nhuận:', values, 6, 4, readonly_fields)

        self._create_field(price_frame, 'tien_ship', 'Tiền ship:', values, 7, 0, readonly_fields)
        self._create_field(price_frame, 'loi_nhuan_rong', 'Lợi nhuận ròng:', values, 7, 2, readonly_fields)

    def _create_truc_in_form(self, main_frame, values, readonly_fields):
        # Configure main frame for resizing
        main_frame.grid_columnconfigure(0, weight=1)
        
        # Create frames with grid layout
        info_frame = ttk.LabelFrame(main_frame, text="Thông tin đơn hàng", padding="8 5 8 5")
        info_frame.grid(row=0, column=0, sticky='ew', padx=3, pady=3)
        info_frame.grid_columnconfigure((1, 3), weight=1)
        
        specs_frame = ttk.LabelFrame(main_frame, text="Quy cách", padding="8 5 8 5")
        specs_frame.grid(row=1, column=0, sticky='ew', padx=3, pady=3)
        specs_frame.grid_columnconfigure((1, 3), weight=1)
        
        price_frame = ttk.LabelFrame(main_frame, text="Giá và phí", padding="8 5 8 5")
        price_frame.grid(row=2, column=0, sticky='ew', padx=3, pady=3)
        price_frame.grid_columnconfigure((1, 3), weight=1)
        
        status_frame = ttk.LabelFrame(main_frame, text="Trạng thái", padding="8 5 8 5")
        status_frame.grid(row=3, column=0, sticky='ew', padx=3, pady=3)
        status_frame.grid_columnconfigure((0, 1), weight=1)

        # Info section
        self._create_field(info_frame, 'thoi_gian', 'Thời gian:', values, 0, 0, readonly_fields)
        self._create_field(info_frame, 'ten_hang', 'Tên hàng:', values, 0, 2, readonly_fields)
        self._create_field(info_frame, 'ten_khach_hang', 'Tên khách hàng:', values, 1, 0, readonly_fields)
        self._create_field(info_frame, 'ngay_du_kien', 'Ngày dự kiến:', values, 1, 2, readonly_fields)
        
        # Specs section
        self._create_field(specs_frame, 'quy_cach', 'Quy cách:', values, 0, 0, readonly_fields)
        self._create_field(specs_frame, 'so_luong', 'Số lượng:', values, 0, 2, readonly_fields)
        self._create_field(specs_frame, 'mau_sac', 'Màu sắc:', values, 1, 0, readonly_fields)
        self._create_field(specs_frame, 'mau_keo', 'Màu keo:', values, 1, 2, readonly_fields)
        
        # Price section
        self._create_field(price_frame, 'don_gia_goc', 'Đơn giá gốc:', values, 0, 0, readonly_fields)
        self._create_field(price_frame, 'thanh_tien', 'Thành tiền:', values, 0, 2, readonly_fields)
        
        self._create_field(price_frame, 'don_gia_ban', 'Đơn giá bán:', values, 1, 0, readonly_fields)
        self._create_field(price_frame, 'thanh_tien_ban', 'Thành tiền bán:', values, 1, 2, readonly_fields)
        
        self._create_field(price_frame, 'cong_no_khach', 'Công nợ khách:', values, 2, 0, readonly_fields)
        
        self._create_field(price_frame, 'ctv', 'CTV:', values, 3, 0, readonly_fields)
        self._create_field(price_frame, 'hoa_hong', 'Hoa hồng (%):', values, 3, 2, readonly_fields)
        
        self._create_field(price_frame, 'tien_hoa_hong', 'Tiền hoa hồng:', values, 4, 0, readonly_fields)
        self._create_field(price_frame, 'loi_nhuan', 'Lợi nhuận:', values, 4, 2, readonly_fields)
        
        self._create_field(price_frame, 'tien_ship', 'Tiền ship:', values, 5, 0, readonly_fields)
        self._create_field(price_frame, 'loi_nhuan_rong', 'Lợi nhuận ròng:', values, 5, 2, readonly_fields)

        # Configure style for checkbuttons
        style = ttk.Style()
        style.configure('AutoResize.TCheckbutton', font=('TkDefaultFont', -12))

        # Add status checkboxes with auto-resize style
        da_giao_var = tk.BooleanVar(value=values[self.parent.truc_in_tree['columns'].index('da_giao')] == "✓")
        da_tat_toan_var = tk.BooleanVar(value=values[self.parent.truc_in_tree['columns'].index('da_tat_toan')] == "✓")

        ttk.Checkbutton(status_frame, text="Đã giao hàng", variable=da_giao_var, 
                       style='AutoResize.TCheckbutton').grid(row=0, column=0, padx=3, pady=3, sticky='w')
        ttk.Checkbutton(status_frame, text="Đã tất toán", variable=da_tat_toan_var,
                       style='AutoResize.TCheckbutton').grid(row=0, column=1, padx=3, pady=3, sticky='w')

        self.edit_entries['da_giao'] = da_giao_var
        self.edit_entries['da_tat_toan'] = da_tat_toan_var

    def _create_bang_keo_form(self, main_frame, values, readonly_fields):
        # Configure main frame for resizing
        main_frame.grid_columnconfigure(0, weight=1)
        
        # Create frames with grid layout
        info_frame = ttk.LabelFrame(main_frame, text="Thông tin đơn hàng", padding="8 5 8 5")
        info_frame.grid(row=0, column=0, sticky='ew', padx=3, pady=3)
        info_frame.grid_columnconfigure((1, 3), weight=1)
        
        specs_frame = ttk.LabelFrame(main_frame, text="Quy cách", padding="8 5 8 5")
        specs_frame.grid(row=1, column=0, sticky='ew', padx=3, pady=3)
        specs_frame.grid_columnconfigure((1, 3), weight=1)
        
        price_frame = ttk.LabelFrame(main_frame, text="Giá và phí", padding="8 5 8 5")
        price_frame.grid(row=2, column=0, sticky='ew', padx=3, pady=3)
        price_frame.grid_columnconfigure((1, 3), weight=1)
        
        # Info section
        self._create_field(info_frame, 'thoi_gian', 'Thời gian:', values, 0, 0, readonly_fields)
        self._create_field(info_frame, 'ten_hang', 'Tên hàng:', values, 0, 2, readonly_fields)
        self._create_field(info_frame, 'ngay_du_kien', 'Ngày dự kiến:', values, 1, 0, readonly_fields)
        
        # Specs section
        self._create_field(specs_frame, 'quy_cach', 'Quy cách (KG):', values, 0, 0, readonly_fields)
        self._create_field(specs_frame, 'so_luong', 'Số lượng:', values, 0, 2, readonly_fields)
        self._create_field(specs_frame, 'mau_sac', 'Màu sắc:', values, 1, 0, readonly_fields)
        
        # Price section
        self._create_field(price_frame, 'don_gia_goc', 'Đơn giá gốc:', values, 0, 0, readonly_fields)
        self._create_field(price_frame, 'thanh_tien', 'Thành tiền:', values, 0, 2, readonly_fields)
        
        self._create_field(price_frame, 'don_gia_ban', 'Đơn giá bán:', values, 1, 0, readonly_fields)
        self._create_field(price_frame, 'thanh_tien_ban', 'Thành tiền bán:', values, 1, 2, readonly_fields)
        
        self._create_field(price_frame, 'cong_no_khach', 'Công nợ khách:', values, 2, 0, readonly_fields)
        
        self._create_field(price_frame, 'ctv', 'CTV:', values, 3, 0, readonly_fields)
        self._create_field(price_frame, 'hoa_hong', 'Hoa hồng (%):', values, 3, 2, readonly_fields)
        
        self._create_field(price_frame, 'tien_hoa_hong', 'Tiền hoa hồng:', values, 4, 0, readonly_fields)
        self._create_field(price_frame, 'loi_nhuan', 'Lợi nhuận:', values, 4, 2, readonly_fields)

        self._create_field(price_frame, 'tien_ship', 'Tiền ship:', values, 5, 0, readonly_fields)
        self._create_field(price_frame, 'loi_nhuan_rong', 'Lợi nhuận ròng:', values, 5, 2, readonly_fields)

    def _create_field(self, parent, field_name, label_text, values, row, col, readonly_fields):
        """Create a labeled field in the edit form"""
        # Configure styles for auto-resizing text
        style = ttk.Style()
        style.configure('AutoResize.TLabel', font=('TkDefaultFont', -12))
        style.configure('AutoResize.TEntry', font=('TkDefaultFont', -12))
        
        # Create label with auto-resize style
        label = ttk.Label(parent, text=label_text, style='AutoResize.TLabel')
        label.grid(row=row, column=col, sticky='e', padx=3, pady=2)
        
        # Configure grid weights for the parent frame
        parent.grid_columnconfigure(col+1, weight=1)
        
        # Xử lý các trường mới
        if field_name in ['tien_ship', 'loi_nhuan_rong']:
            entry = ttk.Entry(parent, width=15, style='AutoResize.TEntry')
            if values and len(values) > 0:
                try:
                    field_index = list(self.parent.bang_keo_in_tree['columns'] if self.current_edit_type == 'bang_keo_in' 
                                    else self.parent.truc_in_tree['columns'] if self.current_edit_type == 'truc_in'
                                    else self.parent.bang_keo_tree['columns']).index(field_name)
                    entry.insert(0, values[field_index] if values[field_index] is not None else '')
                except ValueError:
                    entry.insert(0, '0')
                
            if field_name == 'loi_nhuan_rong':
                entry.configure(state='readonly')
            elif field_name == 'tien_ship':
                entry.bind('<KeyRelease>', lambda e: self.recalculate_edit_form(self.current_edit_type))
                entry.bind('<FocusOut>', lambda e: (
                    self.format_currency_input(e),
                    self.recalculate_edit_form(self.current_edit_type)
                ))
        else:
            field_index = list(self.parent.bang_keo_in_tree['columns'] if self.current_edit_type == 'bang_keo_in' 
                            else self.parent.truc_in_tree['columns'] if self.current_edit_type == 'truc_in'
                            else self.parent.bang_keo_tree['columns']).index(field_name)
            
            if field_name in ['thoi_gian', 'ngay_du_kien']:
                date_value = values[field_index] if values[field_index] else datetime.now()
                entry = DateEntry(parent, width=15, background='darkblue',
                                foreground='white', borderwidth=2,
                                date_pattern='dd/mm/yyyy',
                                locale='vi_VN',
                                font=('TkDefaultFont', -12))  # Add auto-scaling font
                try:
                    if isinstance(date_value, datetime):
                        entry.set_date(date_value.date())
                    elif isinstance(date_value, str):
                        try:
                            entry.set_date(datetime.strptime(date_value, self.DATE_FORMAT).date())
                        except ValueError:
                            entry.set_date(datetime.strptime(date_value, self.DATE_FORMAT).date())
                    else:
                        entry.set_date(datetime.now().date())
                except ValueError:
                    entry.set_date(datetime.now().date())
            else:
                entry = ttk.Entry(parent, width=15, style='AutoResize.TEntry')
                entry.insert(0, values[field_index] if values[field_index] is not None else '')
                
                if field_name in readonly_fields:
                    entry.configure(state='readonly')
            
            # Define calculation trigger fields for each order type
            calculation_trigger_fields = {
                'bang_keo_in': [
                    'so_luong', 'phi_sl', 'phi_keo', 'phi_size', 'phi_cat', 'don_gia_von',
                    'don_gia_ban', 'tien_coc', 'hoa_hong', 'phi_mau', 'quy_cach_mm',
                    'quy_cach_m', 'quy_cach_mic', 'cuon_cay'
                ],
                'truc_in': [
                    'so_luong', 'don_gia_ban', 'don_gia_goc', 'hoa_hong'
                ],
                'bang_keo': [
                    'so_luong', 'don_gia_ban', 'don_gia_goc', 'hoa_hong'
                ]
            }[self.current_edit_type]
            
            # Bind calculation triggers
            if field_name in calculation_trigger_fields:
                entry.bind('<KeyRelease>', lambda e: self.recalculate_edit_form(self.current_edit_type))
                entry.bind('<FocusOut>', lambda e: (
                    self.format_currency_input(e),
                    self.recalculate_edit_form(self.current_edit_type)
                ))
            # Format currency for numeric fields
            elif field_name in ['don_gia_goc', 'thanh_tien_goc', 'don_gia_ban', 'thanh_tien_ban',
                              'tien_coc', 'cong_no_khach', 'tien_hoa_hong', 'loi_nhuan',
                              'phi_sl', 'phi_keo', 'phi_mau', 'phi_size', 'phi_cat', 'don_gia_von',
                              'thanh_tien']:
                entry.bind('<FocusOut>', self.format_currency_input)
        
        entry.grid(row=row, column=col+1, sticky=tk.EW, padx=5, pady=5)  # Changed sticky to EW for better resizing
        
        self.edit_entries[field_name] = entry
        
    def save_edit(self, tree, db_session, edit_window):
        if not self.current_edit_item or not self.current_edit_type:
            return
            
        try:
            values = {}
            item_values = tree.item(self.current_edit_item)['values']
            record_id = item_values[0]
            
            numeric_fields = [
                'quy_cach_mm', 'quy_cach_m', 'quy_cach_mic', 'cuon_cay', 'so_luong',
                'phi_sl', 'phi_keo', 'phi_mau', 'phi_size', 'phi_cat', 'don_gia_von',
                'don_gia_goc', 'thanh_tien_goc', 'don_gia_ban', 'thanh_tien_ban',
                'tien_coc', 'cong_no_khach', 'hoa_hong', 'tien_hoa_hong', 'loi_nhuan',
                'thanh_tien', 'tien_ship', 'loi_nhuan_rong'
            ]
            
            for field_name, entry in self.edit_entries.items():
                if field_name in ['id', 'da_giao', 'da_tat_toan']:
                    continue
                    
                if field_name in ['thoi_gian', 'ngay_du_kien']:
                    date_value = entry.get_date()
                    if field_name == 'thoi_gian':
                        current_time = datetime.now().time()
                        values[field_name] = datetime.combine(date_value, current_time)
                    else:
                        values[field_name] = date_value
                elif field_name in numeric_fields:
                    # Convert numeric values, removing commas
                    value = entry.get()
                    values[field_name] = self.validate_float_input(value)
                else:
                    values[field_name] = entry.get()
            
            try:
                if self.current_edit_type == 'bang_keo_in':
                    order = db_session.query(BangKeoInOrder).filter_by(id=record_id).first()
                elif self.current_edit_type == 'truc_in':
                    order = db_session.query(TrucInOrder).filter_by(id=record_id).first()
                else:  # bang_keo
                    order = db_session.query(BangKeoOrder).filter_by(id=record_id).first()
                    
                if order:
                    for field, value in values.items():
                        if field not in ['id', 'da_giao', 'da_tat_toan']:
                            setattr(order, field, value)
                
                if not order:
                    raise Exception("Không tìm thấy đơn hàng trong database")
                
                db_session.commit()
                
                # Update tree view
                tree_values = [record_id]
                for column in tree['columns'][1:]:
                    if column in ['thoi_gian']:
                        tree_values.append(values[column].strftime(self.DATE_FORMAT))
                    elif column in ['ngay_du_kien']:
                        tree_values.append(values[column].strftime(self.DATE_FORMAT))
                    elif column in ['da_giao', 'da_tat_toan']:
                        tree_values.append(item_values[tree['columns'].index(column)])
                    elif column in numeric_fields:
                        # Format numeric values with commas for display
                        tree_values.append(self.format_currency(values.get(column, 0)))
                    else:
                        tree_values.append(values.get(column, ''))
                
                tree.item(self.current_edit_item, values=tree_values)
                
                messagebox.showinfo("Thành công", "Đã cập nhật thông tin")
                edit_window.destroy()
                
            except Exception as e:
                db_session.rollback()
                raise Exception(f"Lỗi khi cập nhật database: {str(e)}")
                
        except Exception as e:
            messagebox.showerror("Lỗi", f"Có lỗi xảy ra khi cập nhật: {str(e)}")
            
    def validate_float_input(self, value):
        try:
            if isinstance(value, str):
                value = value.replace(',', '')
            return float(value)
        except (ValueError, TypeError):
            return 0.0
            
    def format_currency_input(self, event):
        entry = event.widget
        try:
            value = float(entry.get().replace(',', ''))
            entry.delete(0, tk.END)
            entry.insert(0, f"{value:,.0f}")
        except ValueError:
            pass 

    def recalculate_edit_form(self, order_type):
        """Recalculate values in the edit form based on the order type"""
        try:
            if order_type == 'bang_keo_in':
                # Get values from edit entries
                don_gia_von = self.validate_float_input(self.edit_entries['don_gia_von'].get())
                phi_sl = self.validate_float_input(self.edit_entries['phi_sl'].get())
                phi_mau = self.validate_float_input(self.edit_entries['phi_mau'].get())
                phi_keo = self.validate_float_input(self.edit_entries['phi_keo'].get())
                phi_size = self.validate_float_input(self.edit_entries['phi_size'].get())
                phi_cat = self.validate_float_input(self.edit_entries['phi_cat'].get())
                so_luong = self.validate_float_input(self.edit_entries['so_luong'].get())
                don_gia_ban = self.validate_float_input(self.edit_entries['don_gia_ban'].get())
                tien_coc = self.validate_float_input(self.edit_entries['tien_coc'].get())
                hoa_hong = self.validate_float_input(self.edit_entries['hoa_hong'].get()) / 100
                cuon_cay = self.validate_float_input(self.edit_entries['cuon_cay'].get())
                quy_cach_m = self.validate_float_input(self.edit_entries['quy_cach_m'].get())
                tien_ship = self.validate_float_input(self.edit_entries['tien_ship'].get())

                # Calculate don_gia_goc
                if cuon_cay == 0 or quy_cach_m == 0:
                    don_gia_goc = 0
                else:
                    don_gia_goc = (don_gia_von + phi_sl + phi_mau + phi_keo + phi_size + phi_cat) / 90 * quy_cach_m / cuon_cay

                # Calculate other values
                thanh_tien_goc = don_gia_goc * so_luong
                thanh_tien_ban = don_gia_ban * so_luong
                cong_no_khach = thanh_tien_ban - tien_coc
                loi_nhuan = thanh_tien_ban - thanh_tien_goc
                tien_hoa_hong = loi_nhuan * hoa_hong
                loi_nhuan_rong = loi_nhuan - tien_hoa_hong - tien_ship

                # Update readonly fields
                self.update_readonly_field('don_gia_goc', don_gia_goc)
                self.update_readonly_field('thanh_tien_goc', thanh_tien_goc)
                self.update_readonly_field('thanh_tien_ban', thanh_tien_ban)
                self.update_readonly_field('cong_no_khach', cong_no_khach)
                self.update_readonly_field('tien_hoa_hong', tien_hoa_hong)
                self.update_readonly_field('loi_nhuan', loi_nhuan)
                self.update_readonly_field('loi_nhuan_rong', loi_nhuan_rong)

            else:  # truc_in và bang_keo
                # Get values
                so_luong = self.validate_float_input(self.edit_entries['so_luong'].get())
                don_gia_ban = self.validate_float_input(self.edit_entries['don_gia_ban'].get())
                don_gia_goc = self.validate_float_input(self.edit_entries['don_gia_goc'].get())
                hoa_hong = self.validate_float_input(self.edit_entries['hoa_hong'].get()) / 100
                tien_ship = self.validate_float_input(self.edit_entries['tien_ship'].get())

                # Calculate values
                thanh_tien = don_gia_goc * so_luong
                thanh_tien_ban = don_gia_ban * so_luong
                loi_nhuan = thanh_tien_ban - thanh_tien
                tien_hoa_hong = loi_nhuan * hoa_hong
                cong_no_khach = thanh_tien_ban
                loi_nhuan_rong = loi_nhuan - tien_hoa_hong - tien_ship

                # Update readonly fields
                self.update_readonly_field('thanh_tien', thanh_tien)
                self.update_readonly_field('thanh_tien_ban', thanh_tien_ban)
                self.update_readonly_field('cong_no_khach', cong_no_khach)
                self.update_readonly_field('tien_hoa_hong', tien_hoa_hong)
                self.update_readonly_field('loi_nhuan', loi_nhuan)
                self.update_readonly_field('loi_nhuan_rong', loi_nhuan_rong)

        except Exception as e:
            messagebox.showerror("Lỗi", f"Có lỗi xảy ra khi tính toán: {str(e)}")

    def update_readonly_field(self, field_name, value):
        """Update readonly field with formatted value"""
        if field_name in self.edit_entries:
            entry = self.edit_entries[field_name]
            entry.configure(state='normal')
            entry.delete(0, tk.END)
            entry.insert(0, self.format_currency(value))
            entry.configure(state='readonly')

    def format_currency(self, value):
        """Format currency value with thousand separators"""
        try:
            if value is None or value == '':
                return ''
            return f"{float(value):,.0f}"
        except (ValueError, TypeError):
            return str(value)

    def format_currency_input(self, event):
        """Format currency input when focus leaves the field"""
        entry = event.widget
        try:
            value = float(entry.get().replace(',', ''))
            entry.delete(0, tk.END)
            entry.insert(0, f"{value:,.0f}")
        except ValueError:
            pass

    def update_loi_nhuan_rong(self, event=None):
        """Cập nhật lợi nhuận ròng khi thay đổi tiền ship"""
        try:
            # Lấy giá trị lợi nhuận và tiền hoa hồng
            loi_nhuan = self.validate_float_input(self.edit_entries['loi_nhuan'].get())
            tien_hoa_hong = self.validate_float_input(self.edit_entries['tien_hoa_hong'].get())
            tien_ship = self.validate_float_input(self.edit_entries['tien_ship'].get())
            
            # Tính lợi nhuận ròng
            loi_nhuan_rong = loi_nhuan - tien_hoa_hong - tien_ship
            
            # Cập nhật trường lợi nhuận ròng
            self.edit_entries['loi_nhuan_rong'].configure(state='normal')
            self.edit_entries['loi_nhuan_rong'].delete(0, tk.END)
            self.edit_entries['loi_nhuan_rong'].insert(0, f"{loi_nhuan_rong:,.0f}")
            self.edit_entries['loi_nhuan_rong'].configure(state='readonly')
            
        except Exception as e:
            print(f"Lỗi khi cập nhật lợi nhuận ròng: {str(e)}")