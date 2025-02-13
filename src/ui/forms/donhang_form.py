# donhang_form.py
import tkinter as tk
from tkinter import ttk, font, messagebox, filedialog
from src.ui.tabs.bang_keo_in_tab import BangKeoInTab
from src.ui.tabs.truc_in_tab import TrucInTab
from src.ui.tabs.history_tab import HistoryTab
from src.ui.tabs.thong_ke_tab import ThongKeTab
from src.ui.tabs.bang_keo_tab import BangKeoTab
from src.ui.tabs.dashboard_tab import DashboardTab
from src.services.excel_import import export_template, import_data

class DonHangForm:
    def __init__(self, root, db_session):
        self.root = root
        self.db_session = db_session
        
        # Configure the root window
        self.root.title("Phần Mềm Quản Lý Đơn Hàng")
        window_width = 1024
        window_height = 850
        
        # Get screen dimensions
        screen_width = self.root.winfo_screenwidth()
        screen_height = self.root.winfo_screenheight()
        
        # Calculate position for center of screen
        center_x = int((screen_width - window_width) / 2)
        center_y = int((screen_height - window_height) / 2)
        
        # Set window size and position
        self.root.geometry(f"{window_width}x{window_height}+{center_x}+{center_y}")
        self.root.minsize(800, 600)  # Set minimum size
        
        # Create main container
        self.main_container = ttk.Frame(root)
        self.main_container.pack(fill=tk.BOTH, expand=True)
        
        # Create notebook
        self.notebook = ttk.Notebook(self.main_container)
        self.notebook.pack(fill=tk.BOTH, expand=True)
        
        # Create tabs
        self.thong_ke_tab = ThongKeTab(self.notebook, self)
        self.dashboard_tab = DashboardTab(self.notebook, self)
        self.bang_keo_in_tab = BangKeoInTab(self.notebook, self)
        self.bang_keo_tab = BangKeoTab(self.notebook, self)
        self.truc_in_tab = TrucInTab(self.notebook, self)
        self.history_tab = HistoryTab(self.notebook, self)
        
        # Create status bar
        self.status_bar = ttk.Label(self.main_container, text="", relief=tk.SUNKEN)
        self.status_bar.pack(side=tk.BOTTOM, fill=tk.X)
        
        # Create menu bar
        self.create_menu()

        # Apply style
        self.apply_style()

    def update_status(self, message):
        """Update status bar message"""
        self.status_bar.config(text=message)
        # Clear status after 3 seconds
        self.root.after(3000, lambda: self.status_bar.config(text=""))

    def create_menu(self):
        menu_bar = tk.Menu(self.root)

        # File Menu
        file_menu = tk.Menu(menu_bar, tearoff=0)
        
        # Export submenu
        export_menu = tk.Menu(file_menu, tearoff=0)
        export_menu.add_command(label="Xuất Template Băng Keo", command=lambda: self.export_template('bang_keo_in'))
        export_menu.add_command(label="Xuất Template Trục In", command=lambda: self.export_template('truc_in'))
        file_menu.add_cascade(label="Xuất Template", menu=export_menu)
        
        # Import submenu
        import_menu = tk.Menu(file_menu, tearoff=0)
        import_menu.add_command(label="Nhập Dữ Liệu Băng Keo", command=lambda: self.import_data('bang_keo_in'))
        import_menu.add_command(label="Nhập Dữ Liệu Trục In", command=lambda: self.import_data('truc_in'))
        file_menu.add_cascade(label="Nhập Dữ Liệu", menu=import_menu)
        
        file_menu.add_separator()
        file_menu.add_command(label="Thoát", command=self.root.quit)
        menu_bar.add_cascade(label="Tệp", menu=file_menu)

        # Help Menu
        help_menu = tk.Menu(menu_bar, tearoff=0)
        help_menu.add_command(label="Giới thiệu", command=self.show_about)
        menu_bar.add_cascade(label="Trợ giúp", menu=help_menu)

        self.root.config(menu=menu_bar)
        self.menu_bar = menu_bar

    def show_about(self):
        messagebox.showinfo("Giới thiệu", "Ứng dụng Đơn Hàng\nVersion 1.0")

    def apply_style(self):
        style = ttk.Style()
        style.configure('TLabel', font=('Helvetica', 10))
        style.configure('TEntry', font=('Helvetica', 10))
        style.configure('TButton', font=('Helvetica', 10))
        style.configure('TNotebook.Tab', padding=[10, 5])

        # Set window icon if desired
        # self.root.iconbitmap('path_to_icon.ico')

        # Set the window to be responsive
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)

    def on_resize(self, event):
        # Chỉ xử lý sự kiện từ root window
        if event.widget == self.root:
            # Hủy timer cũ nếu có
            if hasattr(self, 'resize_timer') and self.resize_timer is not None:
                self.root.after_cancel(self.resize_timer)
            
            # Đặt timer mới để cập nhật UI sau khi resize kết thúc
            self.resize_timer = self.root.after(100, self.update_ui)
    
    def update_ui(self):
        # Cập nhật lại UI sau khi resize
        self.notebook.update()
        # Reset timer
        self.resize_timer = None

    def export_template(self, order_type):
        file_path = filedialog.asksaveasfilename(defaultextension=".xlsx", filetypes=[("Excel files", "*.xlsx")])
        if file_path:
            export_template(file_path, order_type)
            self.update_status(f"Đã xuất template {order_type} thành công")

    def import_data(self, order_type):
        file_path = filedialog.askopenfilename(filetypes=[("Excel files", "*.xlsx")])
        if file_path:
            import_data(file_path, order_type, self.db_session)
            self.history_tab.refresh_data()  # Refresh history tab after import
            self.update_status(f"Đã nhập dữ liệu {order_type} thành công")
