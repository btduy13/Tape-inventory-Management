# main.py
from ttkthemes import ThemedTk
from tkinter import messagebox
from src.ui.forms.donhang_form import DonHangForm
from src.ui.forms.splash_screen import show_splash
from src.database.database import init_db, get_session
from src.utils.config import (
    LOG_DIR,
    LOG_FORMAT, 
    LOG_ENCODING,
    DATABASE_URL,
    APP_THEME,
    APP_NAME
)
from src.utils.ui_utils import set_window_icon, center_window
import os
import sys
import traceback
import logging
from datetime import datetime
import codecs
import io
from urllib.parse import urlparse
from src.services.report_gen import OrderSelectionDialog

# Set UTF-8 encoding for stdout if it's not None
if sys.stdout is not None:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding=LOG_ENCODING)

# Set up logging
def setup_logging():
    if not os.path.exists(LOG_DIR):
        os.makedirs(LOG_DIR)
    
    log_file = os.path.join(LOG_DIR, f"app_{datetime.now().strftime('%Y%m%d')}.log")
    
    # Configure root logger
    logger = logging.getLogger()
    logger.setLevel(logging.DEBUG)
    
    # File handler with UTF-8 encoding
    file_handler = logging.FileHandler(log_file, encoding=LOG_ENCODING)
    file_handler.setFormatter(logging.Formatter(LOG_FORMAT))
    logger.addHandler(file_handler)
    
    # Console handler with UTF-8 encoding
    console_handler = logging.StreamHandler(codecs.getwriter(LOG_ENCODING)(sys.stdout.buffer))
    console_handler.setFormatter(logging.Formatter(LOG_FORMAT))
    logger.addHandler(console_handler)
    
    return log_file

if __name__ == "__main__":
    try:
        print("Connecting to online PostgreSQL database (via connection pool)...")
        engine = init_db(DATABASE_URL)
        print("Successfully connected to PostgreSQL!")
            
        db_session = get_session(engine)
        
        root = ThemedTk(theme=APP_THEME)
        root.title(APP_NAME)
        
        # Set window icon
        set_window_icon(root)
        
        # Set window size and position
        window_width = 1024
        window_height = 850
        center_window(root, window_width, window_height)
        
        root.minsize(800, 600)  # Set minimum size
        
        app = DonHangForm(root, db_session)
        
        # Add report generation to the main window
        def open_report():
            try:
                dialog = OrderSelectionDialog(parent=root)
                root.wait_window(dialog)
            except Exception as e:
                messagebox.showerror("Lỗi", f"Không thể mở cửa sổ xuất đơn: {str(e)}")
        
        # Add report button to the main menu if it exists
        if hasattr(app, 'menu_bar'):
            app.menu_bar.add_command(label="Xuất Đơn Đặt Hàng / Phiếu Giao Hàng", command=open_report)
        
        def on_closing():
            try:
                if db_session:
                    # Rollback any pending transactions
                    db_session.rollback()
                    db_session.close()
                root.quit()
            except Exception as e:
                logging.error(f"Error during cleanup: {str(e)}")
                root.quit()
            
        root.protocol("WM_DELETE_WINDOW", on_closing)
        root.mainloop()
        
    except Exception as e:
        if 'db_session' in locals():
            try:
                db_session.rollback()
                db_session.close()
            except:
                pass
        error_msg = f"Unexpected error: {str(e)}\n\nStack trace:\n{traceback.format_exc()}"
        messagebox.showerror("Lỗi", error_msg)