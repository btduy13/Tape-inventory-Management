# main.py
from ttkthemes import ThemedTk
from tkinter import messagebox
from src.ui.forms.donhang_form import DonHangForm
from src.ui.forms.splash_screen import show_splash
from src.database.database import init_db, get_session
from src.utils.config import (
    DATABASE_URL, APP_NAME, APP_THEME, 
    ICON_ICO, ICON_PNG, LOG_DIR, LOG_FORMAT, LOG_ENCODING
)
import os
import sys
import traceback
import logging
from datetime import datetime
from PIL import Image, ImageTk
import codecs
import io
from urllib.parse import urlparse
from src.services.report_gen import generate_order_form, OrderSelectionDialog

# Set UTF-8 encoding for stdout if it's not None
if sys.stdout is not None:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding=LOG_ENCODING)

# Set up logging
def setup_logging():
    if not os.path.exists(LOG_DIR):
        os.makedirs(LOG_DIR)
    
    log_file = os.path.join(LOG_DIR, f"app_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log")
    
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
    # log_file = setup_logging()
    # logging.info("Starting application...")
    
    try:
        print("Connecting to online PostgreSQL database (via connection pool)...")
        engine = init_db(DATABASE_URL)
        print("Successfully connected to PostgreSQL!")
            
        db_session = get_session(engine)
        
        root = ThemedTk(theme=APP_THEME)
        root.title(APP_NAME)
        # logging.info("Created main window")
        
        # Set window icon
        try:
            if os.path.exists(ICON_ICO):
                root.iconbitmap(ICON_ICO)
                # logging.debug("Successfully loaded .ico icon")
            elif os.path.exists(ICON_PNG):
                icon_image = ImageTk.PhotoImage(file=ICON_PNG)
                root.iconphoto(True, icon_image)
                # logging.debug("Successfully loaded .png icon") 
            else:
                # logging.warning("No icon file found")
                pass
        except Exception as e:
            # logging.warning(f"Failed to load icon: {str(e)}")
            pass
            
        # show_splash(root)
        # logging.info("Showed splash screen")
        
        app = DonHangForm(root, db_session)
        # logging.info("Created main form")
        
        # Add report generation to the main window
        def open_report():
            try:
                dialog = OrderSelectionDialog(parent=root)
                root.wait_window(dialog)
            except Exception as e:
                messagebox.showerror("Lỗi", f"Không thể mở cửa sổ xuất đơn: {str(e)}")
        
        # Add report button to the main menu if it exists
        if hasattr(app, 'menu_bar'):
            app.menu_bar.add_command(label="Xuất đơn đặt hàng", command=open_report)
        
        def on_closing():
            try:
                # logging.info("Application closing...")
                db_session.close()
                # logging.info("Database session closed")
                root.quit()
            except Exception as e:
                # logging.error(f"Error during shutdown: {str(e)}")
                root.quit()
            
        root.protocol("WM_DELETE_WINDOW", on_closing)
        
        # logging.info("Starting main loop")
        root.mainloop()
        
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}\n\nStack trace:\n{traceback.format_exc()}"
        # logging.error(f"Critical error: {str(e)}\n{traceback.format_exc()}")
        messagebox.showerror("Lỗi", error_msg)
        

