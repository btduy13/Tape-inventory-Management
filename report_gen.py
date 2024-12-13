import sys
import os
import logging
from datetime import datetime
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from preview_dialog import PreviewDialog
from database import init_db, get_session, BangKeoInOrder, TrucInOrder
from sqlalchemy import text, or_, desc
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.units import mm

# Set up logging
def setup_logging():
    try:
        # Sử dụng thư mục người dùng thay vì thư mục cài đặt
        app_data = os.getenv('APPDATA')
        log_dir = os.path.join(app_data, "QuanLyDonHang", "logs")
        
        if not os.path.exists(log_dir):
            os.makedirs(log_dir, exist_ok=True)
        
        log_file = os.path.join(log_dir, f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log")
        
        # Configure logging
        logging.basicConfig(
            level=logging.DEBUG,
            format='%(asctime)s [%(levelname)s] %(message)s',
            handlers=[
                logging.FileHandler(log_file, encoding='utf-8'),
                logging.StreamHandler()
            ]
        )
        
        return log_file
    except Exception as e:
        print(f"Error setting up logging: {str(e)}")
        # Fallback to console logging only if file logging fails
        logging.basicConfig(
            level=logging.DEBUG,
            format='%(asctime)s [%(levelname)s] %(message)s',
            handlers=[logging.StreamHandler()]
        )
        return None

# Initialize logger
logger = setup_logging()

# Safely set UTF-8 encoding for stdout and stderr
if sys.stdout is not None and hasattr(sys.stdout, 'encoding'):
    if sys.stdout.encoding != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8')
if sys.stderr is not None and hasattr(sys.stderr, 'encoding'):
    if sys.stderr.encoding != 'utf-8':
        sys.stderr.reconfigure(encoding='utf-8')

# Database connection string
DATABASE_URL = "postgresql://postgres.ctmkkxfheqjdmjahkheu:M4tkh%40u_11@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"

# Register font for Unicode (Vietnamese)
try:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    FONT_PATH = os.path.join(script_dir, 'vuArial.ttf')
    pdfmetrics.registerFont(TTFont('VuArial', FONT_PATH))
except:
    try:
        FONT_PATH = "C:\\Windows\\Fonts\\arialuni.ttf"
        pdfmetrics.registerFont(TTFont('VuArial', FONT_PATH))
    except:
        print("Warning: VuArial font not found, using system Arial")
        FONT_PATH = "C:\\Windows\\Fonts\\arial.ttf"
        pdfmetrics.registerFont(TTFont('VuArial', FONT_PATH))

def format_currency(amount):
    if isinstance(amount, str):
        try:
            amount = float(amount.replace(',', ''))
        except ValueError:
            return "0"
    return f"{amount:,.0f}"

def get_orders_from_database(session, order_ids):
    orders = []
    try:
        print(f"Attempting to fetch orders: {order_ids}")
        
        # Test database connection
        result = session.execute(text("SELECT 1")).scalar()
        print("Database connection test successful")
        
        # Print available tables
        result = session.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """))
        tables = [row[0] for row in result]
        print(f"Available tables: {tables}")
        
        for order_id in order_ids:
            print(f"Searching for order: {order_id}")
            if order_id.startswith('BK'):
                # Print the query being executed
                query = session.query(BangKeoInOrder).filter_by(id=order_id)
                print(f"Executing query: {query}")
                
                order = query.first()
                if order:
                    print(f"Found BangKeoInOrder: {order.id}")
                else:
                    print(f"No BangKeoInOrder found with ID: {order_id}")
            else:
                query = session.query(TrucInOrder).filter_by(id=order_id)
                print(f"Executing query: {query}")
                
                order = query.first()
                if order:
                    print(f"Found TrucInOrder: {order.id}")
                else:
                    print(f"No TrucInOrder found with ID: {order_id}")
            
            if order:
                orders.append(order)
    except Exception as e:
        print(f"Error in get_orders_from_database: {str(e)}")
        raise
    
    return orders

def create_order_pdf(filename, order_data):
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        rightMargin=10 * mm,
        leftMargin=10 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm
    )

    story = []

    # Styles
    header_style = ParagraphStyle(
        'HeaderStyle',
        fontName='VuArial',
        fontSize=15,
        alignment=1,
        textColor=colors.red,
        spaceAfter=5 * mm,
        bold=True
    )

    subheader_style = ParagraphStyle(
        'SubHeaderStyle',
        fontName='VuArial',
        fontSize=10,
        alignment=1,
        spaceAfter=2 * mm
    )

    title_style = ParagraphStyle(
        'TitleStyle',
        fontName='VuArial',
        fontSize=20,
        alignment=1,
        spaceAfter=10 * mm,
        bold=True
    )

    # Add company header
    story.append(Paragraph('CÔNG TY TNHH SẢN XUẤT THƯƠNG MẠI BĂNG KEO IN VĨNH THỊNH', header_style))
    story.append(Paragraph('90E đường số 18B, P. Bình Hưng Hòa A, Q. Bình Tân, TP. HCM, Việt Nam', subheader_style))
    story.append(Paragraph('Hotline: 0903003882 - 0936380405', subheader_style))

    # Add title
    story.append(Paragraph('ĐƠN ĐẶT HÀNG', title_style))

    # Recipient information
    recipient_data = [
        ['Kính gửi:', order_data['customer_name'], '', '', '', '', datetime.now().strftime('%d/%m/%Y')],
        ['Địa chỉ:', order_data['address'], '', '', '', '', '']
    ]
    recipient_table = Table(recipient_data, colWidths=[20 * mm, 50 * mm, 20 * mm, 20 * mm, 20 * mm, 20 * mm, 30 * mm])
    recipient_table.setStyle(TableStyle([
        ('FONT', (0, 0), (-1, -1), 'VuArial', 10),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('SPAN', (1, 0), (5, 0)),
        ('SPAN', (1, 1), (5, 1))
    ]))
    story.append(recipient_table)
    story.append(Spacer(1, 10 * mm))

    # Table headers
    header_data = [
        ["Tên Sản Phẩm", "Quy Cách", "In Ấn", "", "Đơn Vị Tính", "Đơn Giá Theo Số Lượng", "", "Tổng Cộng"],
        ["", "", "Màu Chữ", "Màu Nền", "", "Số lượng", "Đơn Giá", ""]
    ]

    # Products data
    products_data = []
    for product in order_data['products']:
        products_data.append([
            product['product'],
            product['specs'],
            product['text_color'],
            product['bg_color'],
            product['unit'],
            format_currency(product['quantity']),
            format_currency(product['price']),
            format_currency(product['total'])
        ])

    # Calculate totals
    subtotal = sum(float(str(p['total']).replace(',', '')) for p in order_data['products'])
    vat = float(order_data.get('vat', 0))
    total = subtotal + vat
    deposit = float(order_data.get('deposit', 0))
    remaining = total - deposit

    # Totals data
    totals_data = [
        ["", "", "", "", "", "", "VAT", format_currency(vat)],
        ["", "", "", "", "", "", "Tổng Cộng", format_currency(total)],
        ["", "", "", "", "", "", "Cọc", format_currency(deposit)],
        ["", "", "", "", "", "", "Còn Lại", format_currency(remaining)]
    ]

    # Combine all data
    table_data = header_data + products_data + totals_data

    # Column widths
    col_widths = [45 * mm, 20 * mm, 20 * mm, 20 * mm, 20 * mm, 22 * mm, 22 * mm, 25 * mm]

    # Create table
    order_table = Table(table_data, colWidths=col_widths, rowHeights=[12 * mm] * len(table_data))  # Fixed row height
    table_style = TableStyle([
        ('FONT', (0, 0), (-1, -1), 'VuArial', 9),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, len(header_data) + len(products_data) - 1), 0.5, colors.black),
        ('GRID', (-2, -4), (-1, -1), 0.5, colors.black),
        ('BACKGROUND', (0, 0), (-1, 1), colors.lightgrey),
        ('SPAN', (0, 0), (0, 1)),
        ('SPAN', (1, 0), (1, 1)),
        ('SPAN', (4, 0), (4, 1)),
        ('SPAN', (7, 0), (7, 1)),
        ('SPAN', (2, 0), (3, 0)),
        ('SPAN', (5, 0), (6, 0)),
        ('ALIGN', (-2, -4), (-2, -1), 'RIGHT'),
        ('ALIGN', (-1, -4), (-1, -1), 'CENTER'),
        ('LEFTPADDING', (0, 0), (-1, -1), 2),  # Reduce left padding
        ('RIGHTPADDING', (0, 0), (-1, -1), 2),  # Reduce right padding
        ('TOPPADDING', (0, 0), (-1, -1), 2),    # Reduce top padding  
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),  # Reduce bottom padding
    ])
    order_table.setStyle(table_style)
    story.append(order_table)

    # Footer
    story.append(Spacer(1, 15 * mm))
    footer_left_style = ParagraphStyle(
        'FooterLeftStyle',
        fontName='VuArial',
        fontSize=9,
        alignment=0,
        spaceAfter=5 * mm
    )

    footer_right_style = ParagraphStyle(
        'FooterRightStyle',
        fontName='VuArial',
        fontSize=9,
        alignment=2,
        spaceAfter=5 * mm
    )

    footer_data = [
        [Paragraph('NGƯỜI NHẬN HÀNG', footer_left_style),
         Paragraph('CÔNG TY TNHH SẢN XUẤT THƯƠNG MẠI\nBĂNG KEO IN VĨNH THỊNH', footer_right_style)],
        ['', Paragraph('ĐẠI DIỆN THƯƠNG MẠI', footer_right_style)],
        ['', Paragraph('LÝ THANH QUẾ', footer_right_style)],
        ['', Paragraph('HP:090 300 3882', footer_right_style)]
    ]

    footer_table = Table(footer_data, colWidths=[doc.width/2, doc.width/2])
    footer_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0, colors.white),
    ]))
    story.append(footer_table)

    doc.build(story)

def convert_order_to_preview_data(order):
    if isinstance(order, BangKeoInOrder):
        specs = f"{int(order.quy_cach_mm)}x{int(order.quy_cach_m)}x{int(order.quy_cach_mic)}"
    else:
        specs = order.quy_cach

    return {
        'product': order.ten_hang,
        'specs': specs,
        'text_color': '',  # Will be input by user
        'bg_color': '',    # Will be input by user
        'unit': '',     # Default, can be changed by user
        'quantity': str(order.so_luong),
        'price': str(order.don_gia_ban),
        'total': str(order.thanh_tien_ban)
    }

class OrderSelectionDialog(tk.Toplevel):
    def __init__(self, parent=None):
        super().__init__(parent if parent else tk.Tk())
        self.title("Chọn đơn hàng")
        
        # Add sort tracking variables
        self.sort_column = None
        self.sort_reverse = False
        
        # Initialize database connection
        logger.info("Initializing database connection in dialog...")
        self.engine = init_db(DATABASE_URL)
        self.session = get_session(self.engine)
        logger.info("Database session created successfully in dialog")
        
        self.selected_orders = []
        self.result = False
        
        # Configure the window
        self.resizable(True, True)
        self.minsize(800, 600)
        
        # Create widgets before setting window position
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
            
            # Pack the treeview and scrollbar
            self.tree.pack(side='left', fill='both', expand=True, padx=5, pady=5)
            scrollbar.pack(side='right', fill='y', pady=5)
            
            # Buttons frame
            button_frame = ttk.Frame(main_container)
            button_frame.pack(fill='x', pady=10)
            
            # Style configuration for extra large buttons
            style = ttk.Style()
            style.configure('ExtraLarge.TButton', 
                           padding=(30, 15),     # Even larger padding
                           font=('TkDefaultFont', 12))  # Larger font
            
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
            logger.info("Loading orders from database")
            # Clear existing items
            for item in self.tree.get_children():
                self.tree.delete(item)
            
            # Get orders from both tables
            bang_keo_orders = self.session.query(BangKeoInOrder).order_by(desc(BangKeoInOrder.thoi_gian)).all()
            truc_in_orders = self.session.query(TrucInOrder).order_by(desc(TrucInOrder.thoi_gian)).all()
            logger.info(f"Found {len(bang_keo_orders)} băng keo orders and {len(truc_in_orders)} trục in orders")
            
            # Add orders to treeview
            for order in bang_keo_orders:
                self.tree.insert('', 'end', values=(
                    order.id,
                    order.thoi_gian.strftime('%d/%m/%Y'),
                    order.ten_hang,
                    f"{order.so_luong:,.0f}",
                    f"{order.don_gia_ban:,.0f}"
                ))
            
            for order in truc_in_orders:
                self.tree.insert('', 'end', values=(
                    order.id,
                    order.thoi_gian.strftime('%d/%m/%Y'),
                    order.ten_hang,
                    f"{order.so_luong:,.0f}",
                    f"{order.don_gia_ban:,.0f}"
                ))
            logger.info("Orders loaded successfully")
                
        except Exception as e:
            print(f"Error loading orders: {str(e)}")
            messagebox.showerror("Lỗi", f"Không thể tải danh sách đơn hàng: {str(e)}")
    
    def on_filter_change(self, *args):
        """Handle changes in any filter (search text or month)"""
        self.filter_orders()

    def filter_orders(self):
        try:
            search_text = self.search_var.get().lower().strip()  # Add strip() to remove whitespace
            order_type = self.order_type_var.get()
            selected_month = self.month_var.get()
            
            # Clear existing items
            for item in self.tree.get_children():
                self.tree.delete(item)
            
            # Get orders from database based on type
            if order_type == "all" or order_type == "BK":
                query = self.session.query(BangKeoInOrder)\
                    .order_by(desc(BangKeoInOrder.thoi_gian))
                
                # Apply text search filter
                if search_text:
                    query = query.filter(
                        or_(
                            BangKeoInOrder.ten_hang.ilike(f'%{search_text}%'),
                            BangKeoInOrder.ctv.ilike(f'%{search_text}%'),
                            BangKeoInOrder.id.ilike(f'%{search_text}%')
                        )
                    )
                
                bang_keo_orders = query.all()
                
                # Filter by month in Python (since SQLAlchemy doesn't handle month extraction well)
                if selected_month != "Tất cả":
                    month_num = int(selected_month.split()[1])
                    bang_keo_orders = [order for order in bang_keo_orders 
                                     if order.thoi_gian.month == month_num]
                
                for order in bang_keo_orders:
                    self.tree.insert('', 'end', values=(
                        order.id,
                        order.thoi_gian.strftime('%d/%m/%Y'),
                        order.ten_hang,
                        f"{order.so_luong:,.0f}",
                        f"{order.don_gia_ban:,.0f}"
                    ))
            
            if order_type == "all" or order_type == "TI":
                query = self.session.query(TrucInOrder)\
                    .order_by(desc(TrucInOrder.thoi_gian))
                
                # Apply text search filter
                if search_text:
                    query = query.filter(
                        or_(
                            TrucInOrder.ten_hang.ilike(f'%{search_text}%'),
                            TrucInOrder.ctv.ilike(f'%{search_text}%'),
                            TrucInOrder.id.ilike(f'%{search_text}%')
                        )
                    )
                
                truc_in_orders = query.all()
                
                # Filter by month in Python
                if selected_month != "Tất cả":
                    month_num = int(selected_month.split()[1])
                    truc_in_orders = [order for order in truc_in_orders 
                                    if order.thoi_gian.month == month_num]
                
                for order in truc_in_orders:
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
                self._apply_row_colors()
                
        except Exception as e:
            print(f"Error filtering orders: {str(e)}")
            messagebox.showerror("Lỗi", f"Lỗi khi lọc đơn hàng: {str(e)}")
    
    def _apply_row_colors(self):
        """Apply alternating row colors to tree"""
        items = self.tree.get_children()
        for i, item in enumerate(items):
            if i % 2 == 0:
                self.tree.tag_configure('evenrow', background='#FFFFFF')
                self.tree.item(item, tags=('evenrow',))
            else:
                self.tree.tag_configure('oddrow', background='#F0F0F0')
                self.tree.item(item, tags=('oddrow',))
    
    def confirm(self):
        try:
            logger.info("Confirming order selection")
            selected_items = self.tree.selection()
            if not selected_items:
                logger.warning("No items selected")
                messagebox.showwarning("Cảnh báo", "Vui lòng chọn ít nhất một đơn hàng")
                return
            
            self.selected_orders = [self.tree.item(item)['values'][0] for item in selected_items]
            logger.info(f"Selected orders: {self.selected_orders}")
            self.result = True
            
            # Process the selected orders here instead of destroying the window
            self.process_selected_orders()
            
        except Exception as e:
            print(f"Error confirming selection: {str(e)}")
            messagebox.showerror("Lỗi", f"Lỗi khi xác nhận lựa chọn: {str(e)}")
    
    def process_selected_orders(self):
        try:
            # Initialize database connection for preview
            logger.info("Initializing database connection for preview")
            engine = init_db(DATABASE_URL)
            session = get_session(engine)
            
            # Get orders from database
            orders = get_orders_from_database(session, self.selected_orders)
            if not orders:
                logger.error("No orders found in database")
                messagebox.showerror("Lỗi", "Không tìm thấy đơn hàng trong cơ sở dữ liệu")
                session.close()
                return
            
            # Convert orders to preview data format
            preview_data = {
                'customer_name': '',
                'address': '',
                'products': [convert_order_to_preview_data(order) for order in orders]
            }
            
            # Show preview dialog and make it modal
            logger.info("Showing preview dialog")
            preview = PreviewDialog(self, preview_data)
            preview.transient(self)  # Make it modal
            preview.grab_set()       # Make it modal
            self.wait_window(preview)  # Wait for preview dialog to close
            
            # If user confirms, show save dialog and generate PDF
            if preview.result:
                logger.info("Opening save file dialog")
                # Show save file dialog
                filename = filedialog.asksaveasfilename(
                    defaultextension=".pdf",
                    filetypes=[("PDF files", "*.pdf"), ("All files", "*.*")],
                    title="Lưu đơn đặt hàng",
                    initialfile="don_dat_hang.pdf"
                )
                
                if filename:  # If user didn't cancel the save dialog
                    logger.info(f"Generating PDF at {filename}")
                    create_order_pdf(filename, preview.result)
                    messagebox.showinfo("Thành công", f"Đã xuất PDF thành công!\nFile được lưu tại: {filename}")
                    logger.info("PDF generated successfully")
            
            logger.info("Order form generation completed")
            
        except Exception as e:
            print(f"Error processing orders: {str(e)}")
            messagebox.showerror("Lỗi", f"Lỗi khi xử lý đơn hàng: {str(e)}")
            # Close database sessions even if there's an error
            if 'session' in locals():
                session.close()
            if hasattr(self, 'session'):
                self.session.close()
            self.destroy()
    
    def cancel(self):
        try:
            logger.info("Canceling order selection")
            self.selected_orders = []
            self.result = False
            if hasattr(self, 'session'):
                self.session.close()
            self.destroy()
            
        except Exception as e:
            print(f"Error canceling: {str(e)}")
            messagebox.showerror("Lỗi", f"Lỗi: {str(e)}")
            self.destroy()

    def sort_treeview(self, col):
        """Sort treeview content when a column header is clicked"""
        try:
            # Get all items from treeview
            items = [(self.tree.set(item, col), item) for item in self.tree.get_children('')]
            
            # If clicking the same column, reverse the sort order
            if self.sort_column == col:
                self.sort_reverse = not self.sort_reverse
            else:
                self.sort_column = col
                self.sort_reverse = False
            
            # Sort based on column type
            if col in ('quantity', 'price'):
                # Convert string numbers with commas to float for sorting
                items.sort(key=lambda x: float(x[0].replace(',', '')), reverse=self.sort_reverse)
            elif col == 'date':
                # Convert date strings to datetime objects for sorting
                items.sort(key=lambda x: datetime.strptime(x[0], '%d/%m/%Y'), reverse=self.sort_reverse)
            else:
                # Regular string sorting for other columns
                items.sort(key=lambda x: x[0].lower(), reverse=self.sort_reverse)
            
            # Rearrange items in treeview
            for index, (val, item) in enumerate(items):
                self.tree.move(item, '', index)
            
            # Apply alternating row colors
            self._apply_row_colors()
            
        except Exception as e:
            print(f"Error sorting treeview: {str(e)}")
            messagebox.showerror("Lỗi", f"Lỗi khi sắp xếp dữ liệu: {str(e)}")

def generate_order_form():
    try:
        logger.info("Starting generate_order_form")
        main_window = OrderSelectionDialog()
        main_window.mainloop()
        
    except Exception as e:
        print(f"Error in generate_order_form: {str(e)}")
        messagebox.showerror("Lỗi", f"Lỗi khi tạo đơn hàng: {str(e)}")
