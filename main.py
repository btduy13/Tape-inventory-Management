# main.py
import os
import sys
import traceback
import logging
from datetime import datetime
from tkinter import messagebox
from ttkthemes import ThemedTk
from urllib.parse import urlparse
from src.ui.forms.donhang_form import DonHangForm
from src.ui.forms.splash_screen import show_splash
from src.database.database import init_db, get_session
from src.utils.config import (
    LOG_DIR,
    LOG_FORMAT, 
    LOG_ENCODING,
    DATABASE_URL,
    APP_THEME,
    APP_NAME,
    UI_STYLES
)
from src.utils.ui_utils import set_window_icon, center_window
from src.utils.ui_styles import apply_modern_style
from src.services.report_gen import OrderSelectionDialog

class Application:
    def __init__(self):
        self.root = None
        self.engine = None
        self.db_session = None
        self.log_file = None

    def setup_logging(self):
        """Configure logging system with file and console handlers"""
        try:
            if not os.path.exists(LOG_DIR):
                os.makedirs(LOG_DIR, exist_ok=True)

            self.log_file = os.path.join(LOG_DIR, f"app_{datetime.now().strftime('%Y%m%d')}.log")
            
            logger = logging.getLogger()
            logger.setLevel(logging.DEBUG)

            # Clear existing handlers
            for handler in logger.handlers[:]:
                logger.removeHandler(handler)

            # Configure matplotlib logger to ignore font debug messages
            logging.getLogger('matplotlib.font_manager').setLevel(logging.WARNING)
            logging.getLogger('PIL.PngImagePlugin').setLevel(logging.WARNING)

            # File handler
            
            file_handler = logging.FileHandler(self.log_file, encoding=LOG_ENCODING)
            file_handler.setFormatter(logging.Formatter(LOG_FORMAT))
            logger.addHandler(file_handler)

            # Console handler
            console_handler = logging.StreamHandler()
            console_handler.setFormatter(logging.Formatter(LOG_FORMAT))
            logger.addHandler(console_handler)

            logging.info("Logging system initialized")

        except Exception as e:
            sys.stderr.write(f"Failed to initialize logging: {str(e)}\n")
            raise

    def setup_database(self):
        """Initialize database connection pool"""
        try:
            logging.info("Initializing database connection...")
            self.engine = init_db(DATABASE_URL)
            logging.info("Database connection established successfully")
        except Exception as e:
            logging.error("Database connection failed: %s", str(e))
            raise

    def setup_gui(self):
        """Initialize the main application window"""
        try:
            # Configure root window
            self.root.title(APP_NAME)
            
            # Apply modern styling
            COLORS, FONTS = apply_modern_style(self.root)
            
            # Window configuration
            set_window_icon(self.root)
            center_window(self.root, 1200, 800)  # Increased window size
            self.root.minsize(1000, 700)  # Increased minimum size
            
            # Set window background
            self.root.configure(background=COLORS['background'])
            
            # Initialize main form with session
            self.db_session = get_session(self.engine)
            self.donhang_form = DonHangForm(self.root, self.db_session)
            
            # Add report button with new style
            self._add_report_button()
            
            # Window close handler
            self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
            
            logging.info("GUI initialized successfully")
        except Exception as e:
            logging.error("GUI initialization failed: %s", str(e))
            raise

    def _add_report_button(self):
        """Add report generation button to menu"""
        try:
            if hasattr(self.donhang_form, 'menu_bar'):
                self.donhang_form.menu_bar.add_command(
                    label="Xuất Đơn Đặt Hàng / Phiếu Giao Hàng",
                    command=self.open_report_dialog,
                    font=('Segoe UI', 10),
                    background='#2196F3',
                    foreground='white'
                )
        except Exception as e:
            logging.warning("Failed to add report button: %s", str(e))

    def open_report_dialog(self):
        """Handle report generation dialog"""
        try:
            dialog = OrderSelectionDialog(parent=self.root, session=self.db_session)
            self.root.wait_window(dialog)
        except Exception as e:
            logging.error("Report dialog error: %s", str(e))
            messagebox.showerror(
                "Lỗi",
                f"Không thể mở cửa sổ xuất đơn: {str(e)}",
                parent=self.root
            )

    def on_closing(self):
        """Handle application shutdown"""
        try:
            logging.info("Application shutdown initiated")
            if self.db_session:
                try:
                    self.db_session.rollback()
                except Exception as rollback_error:
                    logging.warning("Session rollback error: %s", str(rollback_error))
                finally:
                    self.db_session.close()
                    logging.info("Database session closed")
            
            if self.root:
                self.root.quit()
                logging.info("Application terminated")
        except Exception as e:
            logging.error("Shutdown error: %s", str(e))
            if self.root:
                self.root.quit()

    def run(self):
        """Main application entry point"""
        try:
            self.setup_logging()
            self.setup_database()
            
            # Create root window but don't setup GUI yet
            self.root = ThemedTk(theme=APP_THEME)
            self.root.withdraw()  # Hide main window initially
            
            # Show splash screen first
            show_splash(self.root)
            
            # Setup GUI while splash screen is showing
            self.setup_gui()
            
            self.root.mainloop()
        except Exception as e:
            logging.critical("Critical application error: %s", str(e))
            traceback.print_exc()
            messagebox.showerror(
                "Lỗi nghiêm trọng",
                f"Không thể khởi động ứng dụng:\n{str(e)}\n\nXem log để biết chi tiết: {self.log_file}"
            )
            self.on_closing()

if __name__ == "__main__":
    app = Application()
    app.run()