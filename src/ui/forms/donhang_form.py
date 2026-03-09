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
from src.utils.ui_styles import apply_modern_style

class DonHangForm:
    def __init__(self, root, db_session, app_instance=None):
        self.root = root
        self.db_session = db_session
        self.app_instance = app_instance
        
        # Apply style first to get COLORS
        self.COLORS, self.FONTS = apply_modern_style(self.root)
        self.root.configure(background=self.COLORS['background'])

        # Main Layout
        self.main_container = tk.Frame(root, background=self.COLORS['background'])
        self.main_container.pack(fill=tk.BOTH, expand=True)
        
        # Sidebar
        self.sidebar = tk.Frame(self.main_container, background=self.COLORS['sidebar'], width=240)
        self.sidebar.pack(side=tk.LEFT, fill=tk.Y)
        self.sidebar.pack_propagate(False)
        
        # App Title in Sidebar
        self.app_title_label = tk.Label(
            self.sidebar, text="Vĩnh Thịnh", 
            font=('Segoe UI Bold', 20),
            background=self.COLORS['sidebar'],
            foreground=self.COLORS['primary'],
            pady=30
        )
        self.app_title_label.pack()
        
        # Content Area
        self.content_area = tk.Frame(self.main_container, background=self.COLORS['background'])
        self.content_area.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        # Create tabs/frames as children of content_area
        self.frames = {}
        self.init_frames()
        
        # Menu Items
        self.menu_buttons = {}
        self.create_sidebar_menu()
        
        # Show default frame
        self.show_frame("Dashboard")
        
        # Create status bar
        self.status_bar = tk.Label(
            self.main_container, text="", 
            font=self.FONTS['small'],
            background=self.COLORS['background'],
            foreground=self.COLORS['text_light'],
            pady=5
        )
        self.status_bar.pack(side=tk.BOTTOM, fill=tk.X)
        
        # Create menu bar (hidden but functional for shortcuts if needed)
        self.create_menu()

    def init_frames(self):
        """Initialize all tab views as frames in the content area"""
        from src.ui.tabs.thong_ke_tab import ThongKeTab
        from src.ui.tabs.dashboard_tab import DashboardTab
        from src.ui.tabs.bang_keo_in_tab import BangKeoInTab
        from src.ui.tabs.bang_keo_tab import BangKeoTab
        from src.ui.tabs.truc_in_tab import TrucInTab
        from src.ui.tabs.history_tab import HistoryTab

        frame_classes = {
            "Dashboard": DashboardTab,
            "Thống kê": ThongKeTab,
            "Băng Keo In": BangKeoInTab,
            "Băng Keo": BangKeoTab,
            "Trục In": TrucInTab,
            "Lịch sử": HistoryTab
        }

        for name, cls in frame_classes.items():
            # Create a container frame for each tab
            frame = tk.Frame(self.content_area, background=self.COLORS['background'])
            frame.pack(fill=tk.BOTH, expand=True)
            frame.pack_forget()  # Hide all initially
            cls(frame, self)
            self.frames[name] = frame  # Store the frame itself for show/hide

    def create_sidebar_menu(self):
        """Create the sidebar navigation items"""
        menu_items = [
            ("Dashboard", "📊"),
            ("Thống kê", "📈"),
            ("Băng Keo In", "📌"),
            ("Băng Keo", "🩹"),
            ("Trục In", "⚙"),
            ("Lịch sử", "📜")
        ]
        
        for name, icon in menu_items:
            # item_frame acts as the container for the menu item
            item_frame = tk.Frame(
                self.sidebar,
                background=self.COLORS['sidebar'],
                padx=5,
                cursor='hand2'
            )
            item_frame.pack(fill=tk.X, pady=2)
            
            # Container for the icon to ensure fixed width alignment
            icon_container = tk.Frame(item_frame, background=self.COLORS['sidebar'], width=45, height=45)
            icon_container.pack_propagate(False)
            icon_container.pack(side=tk.LEFT, padx=(15, 0))
            
            icon_lbl = tk.Label(
                icon_container, 
                text=icon,
                font=('Segoe UI Emoji', 13),
                background=self.COLORS['sidebar'],
                foreground=self.COLORS['text_light'],
                anchor='center',
                cursor='hand2'
            )
            icon_lbl.pack(expand=True, fill=tk.BOTH)
            
            text_lbl = tk.Label(
                item_frame, text=name,
                font=self.FONTS['normal'],
                background=self.COLORS['sidebar'],
                foreground=self.COLORS['text_light'],
                anchor='w',
                padx=5,
                cursor='hand2'
            )
            text_lbl.pack(side=tk.LEFT, fill=tk.X, expand=True)
            
            # Bind events to all parts for unified hover and click behavior
            widgets_to_bind = [item_frame, icon_container, icon_lbl, text_lbl]
            for widget in widgets_to_bind:
                widget.bind("<Button-1>", lambda e, n=name: self.show_frame(n))
                widget.bind("<Enter>", lambda e, f=item_frame, ic=icon_container, il=icon_lbl, tl=text_lbl: self._on_menu_enter_frame(f, ic, il, tl))
                widget.bind("<Leave>", lambda e, f=item_frame, ic=icon_container, il=icon_lbl, tl=text_lbl: self._on_menu_leave_frame(f, ic, il, tl))
            
            self.menu_buttons[name] = (item_frame, icon_container, icon_lbl, text_lbl)

    def show_frame(self, name):
        """Switch the visible frame in the content area"""
        # Update sidebar button styles
        for n, (frm, ic, il, tl) in self.menu_buttons.items():
            if n == name:
                frm.configure(background=self.COLORS['hover'])
                ic.configure(background=self.COLORS['hover'])
                il.configure(background=self.COLORS['hover'], foreground=self.COLORS['primary'])
                tl.configure(background=self.COLORS['hover'], foreground=self.COLORS['primary'], font=self.FONTS['bold'])
            else:
                frm.configure(background=self.COLORS['sidebar'])
                ic.configure(background=self.COLORS['sidebar'])
                il.configure(background=self.COLORS['sidebar'], foreground=self.COLORS['text_light'])
                tl.configure(background=self.COLORS['sidebar'], foreground=self.COLORS['text_light'], font=self.FONTS['normal'])
        
        # Hide all frames and show the selected one
        for f in self.frames.values():
            f.pack_forget()
        
        self.frames[name].pack(fill=tk.BOTH, expand=True, padx=30, pady=20)

    def _on_menu_enter_frame(self, frm, ic, il, tl):
        # Only highlight if not the active (primary) item
        if tl.cget('foreground') != self.COLORS['primary']:
            frm.configure(background=self.COLORS['hover'])
            ic.configure(background=self.COLORS['hover'])
            il.configure(background=self.COLORS['hover'])
            tl.configure(background=self.COLORS['hover'])

    def _on_menu_leave_frame(self, frm, ic, il, tl):
        if tl.cget('foreground') != self.COLORS['primary']:
            frm.configure(background=self.COLORS['sidebar'])
            ic.configure(background=self.COLORS['sidebar'])
            il.configure(background=self.COLORS['sidebar'])
            tl.configure(background=self.COLORS['sidebar'])

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
        help_menu.add_command(label="Kiểm tra cập nhật", command=self.check_for_updates)
        help_menu.add_command(label="Giới thiệu", command=self.show_about)
        menu_bar.add_cascade(label="Trợ giúp", menu=help_menu)

        self.root.config(menu=menu_bar)
        self.menu_bar = menu_bar

    def show_about(self):
        from src.utils.config import APP_VERSION
        messagebox.showinfo("Giới thiệu", f"Ứng dụng Đơn Hàng\nPhiên bản {APP_VERSION}")

    def check_for_updates(self):
        """Kiểm tra cập nhật thủ công"""
        if self.app_instance and hasattr(self.app_instance, 'check_for_updates'):
            self.app_instance.check_for_updates()
        else:
            messagebox.showinfo("Cập nhật", "Tính năng cập nhật chưa được khởi tạo.")

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
