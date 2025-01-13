import sys
import os
from datetime import datetime
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import threading
import queue
from functools import wraps
from src.ui.forms.preview_dialog import PreviewDialog
from src.database.database import init_db, get_session, BangKeoInOrder, TrucInOrder, BangKeoOrder
from sqlalchemy import text, or_, desc
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.units import mm

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
            elif order_id.startswith('TI'):
                query = session.query(TrucInOrder).filter_by(id=order_id)
                print(f"Executing query: {query}")
                
                order = query.first()
                if order:
                    print(f"Found TrucInOrder: {order.id}")
                else:
                    print(f"No TrucInOrder found with ID: {order_id}")
            elif order_id.startswith('B'):
                query = session.query(BangKeoOrder).filter_by(id=order_id)
                print(f"Executing query: {query}")
                
                order = query.first()
                if order:
                    print(f"Found BangKeoOrder: {order.id}")
                else:
                    print(f"No BangKeoOrder found with ID: {order_id}")
            
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

    # Cell styles for table
    cell_style = ParagraphStyle(
        'CellStyle',
        fontName='VuArial',
        fontSize=9,
        leading=12,  # Line height
        alignment=1  # Center alignment
    )

    cell_style_left = ParagraphStyle(
        'CellStyleLeft',
        parent=cell_style,
        alignment=0  # Left alignment
    )

    # Add company header
    story.append(Paragraph('CÔNG TY TNHH SẢN XUẤT THƯƠNG MẠI BĂNG KEO IN VĨNH THỊNH', header_style))
    story.append(Paragraph('90E đường số 18B, P. Bình Hưng Hòa A, Q. Bình Tân, TP. HCM, Việt Nam', subheader_style))
    story.append(Paragraph('Hotline: 0903003882 - 0936380405', subheader_style))

    # Add title based on document type
    title = "PHIẾU GIAO HÀNG" if order_data.get('document_type') == "phieu_giao_hang" else "ĐƠN ĐẶT HÀNG"
    story.append(Paragraph(title, title_style))

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
        [Paragraph("Tên Sản Phẩm", cell_style), 
         Paragraph("Quy Cách", cell_style), 
         Paragraph("In Ấn", cell_style), "", 
         Paragraph("Đơn Vị Tính", cell_style), 
         Paragraph("Đơn Giá Theo Số Lượng", cell_style), "", 
         Paragraph("Tổng Cộng", cell_style)],
        ["", "", 
         Paragraph("Màu Sắc", cell_style), 
         Paragraph("Màu Keo", cell_style), "", 
         Paragraph("Số lượng", cell_style), 
         Paragraph("Đơn Giá", cell_style), ""]
    ]

    # Products data with wrapped text
    products_data = []
    for product in order_data['products']:
        products_data.append([
            Paragraph(product['product'], cell_style_left),  # Left align product name
            Paragraph(product['specs'], cell_style),
            Paragraph(product['text_color'], cell_style),
            Paragraph(product['bg_color'], cell_style),
            Paragraph(product['unit'], cell_style),
            Paragraph(format_currency(product['quantity']), cell_style),
            Paragraph(format_currency(product['price']), cell_style),
            Paragraph(format_currency(product['total']), cell_style)
        ])

    # Calculate totals
    subtotal = sum(float(str(p['total']).replace(',', '')) for p in order_data['products'])
    vat = float(order_data.get('vat', 0))
    total = subtotal + vat
    deposit = float(order_data.get('deposit', 0))
    remaining = total - deposit

    # Totals data
    totals_data = [
        ["", "", "", "", "", "", Paragraph("VAT", cell_style), Paragraph(format_currency(vat), cell_style)],
        ["", "", "", "", "", "", Paragraph("Tổng Cộng", cell_style), Paragraph(format_currency(total), cell_style)],
        ["", "", "", "", "", "", Paragraph("Cọc", cell_style), Paragraph(format_currency(deposit), cell_style)],
        ["", "", "", "", "", "", Paragraph("Còn Lại", cell_style), Paragraph(format_currency(remaining), cell_style)]
    ]

    # Combine all data
    table_data = header_data + products_data + totals_data

    # Column widths
    col_widths = [45 * mm, 20 * mm, 20 * mm, 20 * mm, 20 * mm, 22 * mm, 22 * mm, 25 * mm]

    # Create table with automatic row heights
    order_table = Table(table_data, colWidths=col_widths)
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
        ('LEFTPADDING', (0, 0), (-1, -1), 3),  # Adjust cell padding
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
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

    # Change footer based on document type
    if order_data.get('document_type') == "phieu_giao_hang":
        footer_data = [
            [Paragraph('NGƯỜI GIAO HÀNG', footer_left_style),
             Paragraph('NGƯỜI NHẬN HÀNG', footer_right_style)],
            ['', ''],
            ['', ''],
            ['', '']
        ]
    else:
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
    print(f"\nProcessing order: {order.id}")
    print(f"Order type: {type(order).__name__}")
    
    # Handle specifications based on order type
    if isinstance(order, BangKeoInOrder):
        print("Processing BangKeoInOrder specifications")
        # Thêm đơn vị đo cho từng thông số
        specs = f"{int(order.quy_cach_mm)}mm x {int(order.quy_cach_m)}m x {int(order.quy_cach_mic)}mic"
        print(f"Generated specs: {specs}")
    elif isinstance(order, TrucInOrder):
        print("Processing TrucInOrder specifications")
        print(f"Raw quy_cach value: {order.quy_cach}")
        # Format TrucInOrder quy_cach
        specs = f"{order.quy_cach}mm" if order.quy_cach else ""
        print(f"Generated specs: {specs}")
    else:  # BangKeoOrder
        print(f"Processing BangKeoOrder specifications")
        print(f"Raw quy_cach value: {order.quy_cach}")
        try:
            # Thêm đơn vị kg cho băng keo
            specs = f"{order.quy_cach}kg" if order.quy_cach else ""
            print(f"Generated specs: {specs}")
        except (ValueError, AttributeError) as e:
            print(f"Error processing quy_cach: {str(e)}")
            specs = str(order.quy_cach) if order.quy_cach else ''
            print(f"Fallback specs: {specs}")

    # Get thanh_tien_ban safely
    print("\nProcessing pricing information:")
    thanh_tien = getattr(order, 'thanh_tien_ban', None)
    print(f"thanh_tien_ban value: {thanh_tien}")
    if thanh_tien is None:
        thanh_tien = getattr(order, 'thanh_tien_goc', 0)
        print(f"Using thanh_tien_goc instead: {thanh_tien}")

    result = {
        'product': order.ten_hang,
        'specs': specs,
        'text_color': order.mau_sac if hasattr(order, 'mau_sac') else '',
        'bg_color': order.mau_keo if hasattr(order, 'mau_keo') else '',
        'unit': 'KG' if isinstance(order, BangKeoOrder) else 'cuộn',
        'quantity': str(order.so_luong),
        'price': str(order.don_gia_ban),
        'total': str(thanh_tien)
    }
    print("\nFinal converted data:")
    for key, value in result.items():
        print(f"{key}: {value}")
    
    return result

def debounce(wait_time):
    """
    Decorator to debounce a function call.
    Will wait for wait_time seconds before executing the function.
    If the function is called again during the wait time, the timer resets.
    """
    def decorator(fn):
        timer = None
        @wraps(fn)
        def debounced(*args, **kwargs):
            nonlocal timer
            if timer is not None:
                timer.cancel()
            timer = threading.Timer(wait_time, lambda: fn(*args, **kwargs))
            timer.start()
        return debounced
    return decorator

class BackgroundTask:
    """Helper class to manage background tasks"""
    def __init__(self, callback):
        self.callback = callback
        self.is_cancelled = False

    def cancel(self):
        self.is_cancelled = True

class OrderSelectionDialog(tk.Toplevel):
    def __init__(self, parent=None):
        super().__init__(parent if parent else tk.Tk())
        self.title("Chọn đơn hàng - Đơn đặt hàng")
        
        # Initialize background processing queue and thread
        self.queue = queue.Queue()
        self.current_task = None
        
        # Start background worker thread
        self.worker_thread = threading.Thread(target=self.process_queue, daemon=True)
        self.worker_thread.start()
        
        # Add loading indicator
        self.loading = False
        self.loading_label = None
        
        # Rest of your existing initialization code...
        self.document_type = tk.StringVar(value="don_dat_hang")
        self.sort_column = None
        self.sort_reverse = False
        self.engine = init_db(DATABASE_URL)
        self.session = get_session(self.engine)
        self.selected_orders = []
        self.result = False
        
        self.resizable(True, True)
        self.minsize(800, 600)
        self.create_widgets()
        
        # Center the window
        self.update_idletasks()
        width = self.winfo_width()
        height = self.winfo_height()
        x = (self.winfo_screenwidth() // 2) - (width // 2)
        y = (self.winfo_screenheight() // 2) - (height // 2)
        self.geometry(f'{width}x{height}+{x}+{y}')
        
        self.transient(parent if parent else None)
        self.grab_set()
        self.protocol("WM_DELETE_WINDOW", self.cancel)
        
        # Initialize selected_orders list at the start
        self.selected_orders = []
        
        # Configure tag styles once at initialization
        self.tree.tag_configure('evenrow', background='#FFFFFF')
        self.tree.tag_configure('oddrow', background='#F0F0F0')
        self.tree.tag_configure('selected', background='#e6f3ff')

    def show_loading(self, show=True):
        """Show or hide loading indicator"""
        if show and not self.loading:
            self.loading = True
            if not self.loading_label:
                self.loading_label = ttk.Label(self, text="Đang tải...", font=('Segoe UI', 10))
                self.loading_label.place(relx=0.5, rely=0.5, anchor='center')
            self.loading_label.lift()
            self.update_idletasks()
        elif not show and self.loading:
            self.loading = False
            if self.loading_label:
                self.loading_label.place_forget()
            self.update_idletasks()

    def process_queue(self):
        """Process background tasks from queue"""
        while True:
            try:
                task, args, kwargs = self.queue.get()
                if task == 'filter':
                    self.do_filter_orders(*args, **kwargs)
                elif task == 'load':
                    self.do_load_orders(*args, **kwargs)
                self.queue.task_done()
            except queue.Empty:
                continue
            except Exception as e:
                print(f"Error in background thread: {str(e)}")

    def queue_background_task(self, task_type, *args, **kwargs):
        """Queue a task to be processed in background"""
        # Cancel current task if it exists
        if self.current_task:
            self.current_task.cancel()
        
        # Create new task
        self.current_task = BackgroundTask(lambda: None)
        self.queue.put((task_type, args, kwargs))
        self.show_loading(True)

    @debounce(0.5)  # 500ms debounce
    def on_filter_change(self, *args):
        """Debounced filter change handler"""
        self.queue_background_task('filter')

    def do_filter_orders(self):
        """Actual filter implementation to run in background"""
        try:
            if self.current_task and self.current_task.is_cancelled:
                return

            # Store current selections
            current_selections = self.selected_orders.copy()
            
            search_text = self.search_var.get().lower().strip()
            order_type = self.order_type_var.get()
            selected_month = self.month_var.get()
            selected_year = int(self.year_var.get())
            
            self.after(0, lambda: self.tree.delete(*self.tree.get_children()))
            
            # Get orders from database based on type
            orders = []
            
            if order_type == "all" or order_type == "BK":
                query = self.session.query(BangKeoInOrder)\
                    .order_by(desc(BangKeoInOrder.thoi_gian))
                
                if search_text:
                    query = query.filter(
                        or_(
                            BangKeoInOrder.ten_hang.ilike(f'%{search_text}%'),
                            BangKeoInOrder.ctv.ilike(f'%{search_text}%'),
                            BangKeoInOrder.id.ilike(f'%{search_text}%')
                        )
                    )
                
                bang_keo_orders = query.all()
                
                # Filter by year and month
                bang_keo_orders = [order for order in bang_keo_orders 
                                 if order.thoi_gian.year == selected_year]
                
                if selected_month != "Tất cả":
                    month_num = int(selected_month.split()[1])
                    bang_keo_orders = [order for order in bang_keo_orders 
                                     if order.thoi_gian.month == month_num]
                
                orders.extend(bang_keo_orders)

            if order_type == "all" or order_type == "TI":
                query = self.session.query(TrucInOrder)\
                    .order_by(desc(TrucInOrder.thoi_gian))
                
                if search_text:
                    query = query.filter(
                        or_(
                            TrucInOrder.ten_hang.ilike(f'%{search_text}%'),
                            TrucInOrder.ctv.ilike(f'%{search_text}%'),
                            TrucInOrder.id.ilike(f'%{search_text}%')
                        )
                    )
                
                truc_in_orders = query.all()
                
                if selected_month != "Tất cả":
                    month_num = int(selected_month.split()[1])
                    truc_in_orders = [order for order in truc_in_orders 
                                    if order.thoi_gian.month == month_num]
                
                orders.extend(truc_in_orders)

            if order_type == "all" or order_type == "B":
                query = self.session.query(BangKeoOrder)\
                    .order_by(desc(BangKeoOrder.thoi_gian))
                
                if search_text:
                    query = query.filter(
                        or_(
                            BangKeoOrder.ten_hang.ilike(f'%{search_text}%'),
                            BangKeoOrder.ctv.ilike(f'%{search_text}%'),
                            BangKeoOrder.id.ilike(f'%{search_text}%')
                        )
                    )
                
                bang_keo_orders = query.all()
                
                if selected_month != "Tất cả":
                    month_num = int(selected_month.split()[1])
                    bang_keo_orders = [order for order in bang_keo_orders 
                                    if order.thoi_gian.month == month_num]
                
                orders.extend(bang_keo_orders)

            # Update UI in batches
            batch_size = 50
            for i in range(0, len(orders), batch_size):
                if self.current_task and self.current_task.is_cancelled:
                    return
                    
                batch = orders[i:i + batch_size]
                self.after(0, lambda b=batch: self.insert_orders_batch(b))
            
            # Restore selections after loading
            def restore_selections():
                for item in self.tree.get_children():
                    item_id = self.tree.item(item)['values'][0]
                    if item_id in current_selections:
                        self.tree.selection_add(item)
                        self.tree.item(item, tags=['selected'])
            
            self.after(100, restore_selections)
            
        except Exception as e:
            self.after(0, lambda: messagebox.showerror("Lỗi", f"Lỗi khi lọc đơn hàng: {str(e)}"))
        finally:
            self.after(0, lambda: self.show_loading(False))

    def insert_orders_batch(self, orders):
        """Insert a batch of orders into the treeview"""
        for order in orders:
            item = self.tree.insert('', 'end', values=(
                order.id,
                order.thoi_gian.strftime('%d/%m/%Y'),
                order.ten_hang,
                f"{order.so_luong:,.0f}",
                f"{order.don_gia_ban:,.0f}"
            ))
            
            # Apply initial coloring
            if order.id in self.selected_orders:
                self.tree.selection_add(item)
                self.tree.item(item, tags=['selected'])
            else:
                if len(self.tree.get_children()) % 2 == 0:
                    self.tree.item(item, tags=['evenrow'])
                else:
                    self.tree.item(item, tags=['oddrow'])

    def finalize_filter_update(self):
        """Finalize the filter update by applying sorting and colors"""
        if self.sort_column:
            self.sort_treeview(self.sort_column)
        else:
            self._apply_row_colors()

    def load_orders(self):
        """Queue loading orders in background"""
        self.queue_background_task('load')

    def do_load_orders(self):
        """Actual load orders implementation to run in background"""
        try:
            if self.current_task and self.current_task.is_cancelled:
                return

            # Store current selections
            current_selections = self.selected_orders.copy() if hasattr(self, 'selected_orders') else []
            
            self.after(0, lambda: self.tree.delete(*self.tree.get_children()))
            
            # Get orders from both tables
            orders = []
            orders.extend(self.session.query(BangKeoInOrder).order_by(desc(BangKeoInOrder.thoi_gian)).all())
            orders.extend(self.session.query(TrucInOrder).order_by(desc(TrucInOrder.thoi_gian)).all())
            orders.extend(self.session.query(BangKeoOrder).order_by(desc(BangKeoOrder.thoi_gian)).all())
            
            # Update UI in batches
            batch_size = 50
            for i in range(0, len(orders), batch_size):
                if self.current_task and self.current_task.is_cancelled:
                    return
                    
                batch = orders[i:i + batch_size]
                self.after(0, lambda b=batch: self.insert_orders_batch(b))
            
            # Restore selections after loading
            self.selected_orders = current_selections
            
            # Apply colors and restore selections
            self.after(0, lambda: self.finalize_filter_update())
            
        except Exception as e:
            self.after(0, lambda: messagebox.showerror("Lỗi", f"Không thể tải danh sách đơn hàng: {str(e)}"))
        finally:
            self.after(0, lambda: self.show_loading(False))

    def destroy(self):
        """Clean up resources before destroying the window"""
        # Cancel any pending tasks
        if self.current_task:
            self.current_task.cancel()
        
        # Close database connection
        if hasattr(self, 'session'):
            self.session.close()
        
        super().destroy()

    def create_widgets(self):
        try:
            # Main container
            main_container = ttk.Frame(self)
            main_container.pack(fill='both', expand=True, padx=10, pady=10)
            
            # Document type frame
            doc_type_frame = ttk.LabelFrame(main_container, text="Loại tài liệu")
            doc_type_frame.pack(fill='x', pady=(0, 10))
            
            # Document type buttons
            button_frame = ttk.Frame(doc_type_frame)
            button_frame.pack(fill='x', padx=5, pady=5)
            
            # Button styles
            active_style = {
                'bg': '#4CAF50',  # Material Green
                'fg': 'white',
                'font': ('Segoe UI', 10, 'bold'),
                'relief': 'raised',
                'width': 15,
                'height': 2
            }
            
            inactive_style = {
                'bg': '#f0f0f0',  # Light gray
                'fg': 'black',
                'font': ('Segoe UI', 10),
                'relief': 'raised',
                'width': 15,
                'height': 2
            }
            
            # Create buttons with initial style
            self.don_dat_hang_btn = tk.Button(
                button_frame,
                text="Đơn đặt hàng",
                command=lambda: self.set_document_type("don_dat_hang"),
                cursor='hand2',
                **active_style
            )
            self.don_dat_hang_btn.pack(side='left', padx=5)
            
            self.phieu_giao_hang_btn = tk.Button(
                button_frame,
                text="Phiếu giao hàng",
                command=lambda: self.set_document_type("phieu_giao_hang"),
                cursor='hand2',
                **inactive_style
            )
            self.phieu_giao_hang_btn.pack(side='left', padx=5)
            
            # Store styles for later use
            self.active_style = active_style
            self.inactive_style = inactive_style
            
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
            
            # Month and Year filters
            filter_container = ttk.Frame(search_frame)
            filter_container.pack(fill='x', padx=5, pady=5)
            
            # Year filter
            ttk.Label(filter_container, text="Năm:").pack(side='left', padx=5)
            current_year = datetime.now().year
            years = list(range(current_year - 5, current_year + 1))  # 5 năm trước đến năm hiện tại
            self.year_var = tk.StringVar(value=str(current_year))
            year_cb = ttk.Combobox(filter_container, textvariable=self.year_var,
                                  values=years, state="readonly", width=10)
            year_cb.pack(side='left', padx=5)
            
            # Month filter (đã có từ trước)
            ttk.Label(filter_container, text="Tháng:").pack(side='left', padx=5)
            self.month_var = tk.StringVar(value="Tất cả")
            months = ["Tất cả"] + [f"Tháng {i}" for i in range(1, 13)]
            month_cb = ttk.Combobox(filter_container, textvariable=self.month_var,
                                   values=months, state="readonly", width=15)
            month_cb.pack(side='left', padx=5)
            
            # Bind year and month selection changes
            self.year_var.trace_add('write', self.on_filter_change)
            self.month_var.trace_add('write', self.on_filter_change)
            
            # Order type filter
            filter_container = ttk.Frame(search_frame)
            filter_container.pack(fill='x', padx=5, pady=5)
            
            self.order_type_var = tk.StringVar(value="all")
            ttk.Radiobutton(filter_container, text="Tất cả", variable=self.order_type_var, 
                           value="all", command=self.on_order_type_change).pack(side='left', padx=5)
            ttk.Radiobutton(filter_container, text="Băng keo in", variable=self.order_type_var, 
                           value="BK", command=self.on_order_type_change).pack(side='left', padx=5)
            ttk.Radiobutton(filter_container, text="Trục In", variable=self.order_type_var, 
                           value="TI", command=self.on_order_type_change).pack(side='left', padx=5)
            ttk.Radiobutton(filter_container, text="Băng keo", variable=self.order_type_var, 
                           value="B", command=self.on_order_type_change).pack(side='left', padx=5)
            
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
            
            # Add tag configuration for selected items
            self.tree.tag_configure('selected', background='#e6f3ff')
            
            # Bind click event
            self.tree.bind('<Button-1>', self.on_tree_click)
            
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
                           padding=(30, 15),     # Even larger padding
                           font=('TkDefaultFont', 12))  # Larger font
            
            # Create extra large buttons
            ttk.Button(button_frame, text="Xuất đơn", 
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
    
    def confirm(self):
        try:
            # Check if any order is selected
            if not self.selected_orders:
                messagebox.showwarning("Cảnh báo", "Vui lòng chọn ít nhất một đơn hàng")
                return
            
            # Check if document type is selected
            if not self.document_type.get():
                messagebox.showwarning("Cảnh báo", "Vui lòng chọn loại tài liệu (Đơn đặt hàng hoặc Phiếu giao hàng)")
                return
            
            self.result = True
            
            # Process the selected orders here instead of destroying the window
            self.process_selected_orders()
            
        except Exception as e:
            print(f"Error confirming selection: {str(e)}")
            messagebox.showerror("Lỗi", f"Lỗi khi xác nhận lựa chọn: {str(e)}")
    
    def process_selected_orders(self):
        try:
            # Initialize database connection for preview
            engine = init_db(DATABASE_URL)
            session = get_session(engine)
            
            # Get orders from database
            orders = get_orders_from_database(session, self.selected_orders)
            if not orders:
                messagebox.showerror("Lỗi", "Không tìm thấy đơn hàng trong cơ sở dữ liệu")
                session.close()
                return
            
            # Convert orders to preview data format
            preview_data = {
                'customer_name': '',
                'address': '',
                'products': [convert_order_to_preview_data(order) for order in orders],
                'document_type': self.document_type.get()  # Pass document type to preview
            }
            
            # Show preview dialog and make it modal
            preview = PreviewDialog(self, preview_data)
            preview.transient(self)  # Make it modal
            preview.grab_set()       # Make it modal
            self.wait_window(preview)  # Wait for preview dialog to close
            
            # If user confirms, show save dialog and generate PDF
            if preview.result:
                # Get title based on document type
                title = "Phiếu giao hàng" if self.document_type.get() == "phieu_giao_hang" else "Đơn đặt hàng"
                
                # Show save file dialog
                filename = filedialog.asksaveasfilename(
                    defaultextension=".pdf",
                    filetypes=[("PDF files", "*.pdf"), ("All files", "*.*")],
                    title=f"Lưu {title.lower()}",
                    initialfile=f"{title.lower()}.pdf"
                )
                
                if filename:  # If user didn't cancel the save dialog
                    create_order_pdf(filename, preview.result)
                    messagebox.showinfo("Thành công", f"Đã xuất PDF thành công!\nFile được lưu tại: {filename}")
            
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
            # Store currently selected order IDs before sorting
            selected_ids = [self.tree.item(item)['values'][0] for item in self.tree.selection()]
            
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
                # If this item was previously selected, reselect it
                if self.tree.item(item)['values'][0] in selected_ids:
                    self.tree.selection_add(item)
                    self.tree.item(item, tags=['selected'])
                else:
                    # Apply alternating row colors for non-selected items
                    if index % 2 == 0:
                        self.tree.item(item, tags=['evenrow'])
                    else:
                        self.tree.item(item, tags=['oddrow'])
            
        except Exception as e:
            print(f"Error sorting treeview: {str(e)}")
            messagebox.showerror("Lỗi", f"Lỗi khi sắp xếp dữ liệu: {str(e)}")
            
    def set_document_type(self, doc_type):
        """Set the document type and update UI accordingly"""
        self.document_type.set(doc_type)
        # Update window title based on document type
        title = "Phiếu giao hàng" if doc_type == "phieu_giao_hang" else "Đơn đặt hàng"
        self.title(f"Chọn đơn hàng - {title}")
        
        # Update button styles
        if doc_type == "phieu_giao_hang":
            for key, value in self.active_style.items():
                self.phieu_giao_hang_btn.configure(**{key: value})
            for key, value in self.inactive_style.items():
                self.don_dat_hang_btn.configure(**{key: value})
        else:
            for key, value in self.active_style.items():
                self.don_dat_hang_btn.configure(**{key: value})
            for key, value in self.inactive_style.items():
                self.phieu_giao_hang_btn.configure(**{key: value})

    def on_tree_click(self, event):
        """Handle click event on treeview"""
        region = self.tree.identify_region(event.x, event.y)
        if region == "heading":
            # If clicking on heading, let the default sort handler work
            return
        
        item = self.tree.identify_row(event.y)
        if not item:
            return
        
        # Toggle selection
        if item in self.tree.selection():
            self.tree.selection_remove(item)
            self.tree.item(item, tags=[])
            # Remove from selected_orders
            item_id = self.tree.item(item)['values'][0]
            if item_id in self.selected_orders:
                self.selected_orders.remove(item_id)
        else:
            self.tree.selection_add(item)
            self.tree.item(item, tags=['selected'])
            # Add to selected_orders
            item_id = self.tree.item(item)['values'][0]
            if item_id not in self.selected_orders:
                self.selected_orders.append(item_id)
        
        return "break"

    def on_order_type_change(self, *args):
        """Handle changes in order type radio buttons"""
        # No need to update selected_orders here as it's maintained globally
        self.filter_orders()

    def filter_orders(self):
        """Filter orders based on the selected order type and other criteria."""
        # This method should encapsulate the filtering logic that was previously triggered
        # directly in the `do_filter_orders` method. Now, it just needs to call that method.
        self.queue_background_task('filter')

    def _apply_row_colors(self):
        """Apply alternating row colors to tree while preserving selections"""
        items = self.tree.get_children()
        selected_ids = [self.tree.item(item)['values'][0] for item in self.tree.selection()]
        
        # Configure tag styles if not already configured
        self.tree.tag_configure('evenrow', background='#FFFFFF')
        self.tree.tag_configure('oddrow', background='#F0F0F0')
        self.tree.tag_configure('selected', background='#e6f3ff')
        
        for i, item in enumerate(items):
            # Check if item is selected
            if self.tree.item(item)['values'][0] in selected_ids:
                self.tree.item(item, tags=['selected'])
            else:
                # Apply alternating row colors for non-selected items
                if i % 2 == 0:
                    self.tree.item(item, tags=['evenrow'])
                else:
                    self.tree.item(item, tags=['oddrow'])

def generate_order_form():
    try:
        # logger.info("Starting generate_order_form")
        main_window = OrderSelectionDialog()
        main_window.mainloop()
        
    except Exception as e:
        print(f"Error in generate_order_form: {str(e)}")
        messagebox.showerror("Lỗi", f"Lỗi khi tạo đơn hàng: {str(e)}")