# main.py
from ttkthemes import ThemedTk
from tkinter import messagebox
from donhang_form import DonHangForm
from splash_screen import show_splash
from database import init_db, get_session
import os
import sys
import traceback
import logging
from datetime import datetime
from PIL import Image, ImageTk
from openpyxl import Workbook, load_workbook
import codecs
import io
from urllib.parse import urlparse

# Set UTF-8 encoding for stdout if it's not None
if sys.stdout is not None:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Set up logging
def setup_logging():
    log_dir = "logs"
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    
    log_file = os.path.join(log_dir, f"app_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log")
    
    # Configure root logger
    logger = logging.getLogger()
    logger.setLevel(logging.DEBUG)
    
    # File handler with UTF-8 encoding
    file_handler = logging.FileHandler(log_file, encoding='utf-8')
    file_handler.setFormatter(logging.Formatter('%(asctime)s [%(levelname)s] %(message)s'))
    logger.addHandler(file_handler)
    
    # Console handler with UTF-8 encoding
    console_handler = logging.StreamHandler(codecs.getwriter('utf-8')(sys.stdout.buffer))
    console_handler.setFormatter(logging.Formatter('%(asctime)s [%(levelname)s] %(message)s'))
    logger.addHandler(console_handler)
    
    return log_file

if __name__ == "__main__":
    # log_file = setup_logging()
    # logging.info("Starting application...")
    
    try:
        # Database connection string (using connection pooling)
        database_url = "postgresql://postgres.ctmkkxfheqjdmjahkheu:M4tkh%40u_11@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
        
        print("Connecting to online PostgreSQL database (via connection pool)...")
        engine = init_db(database_url)
        print("Successfully connected to PostgreSQL!")
            
        db_session = get_session(engine)
        
        root = ThemedTk(theme="none")
        root.title("Phần Mềm Quản Lý Đơn Hàng")
        # logging.info("Created main window")
        
        # Set window icon
        try:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            icon_path = os.path.join(sys._MEIPASS, "assets", "icon.ico")
            # logging.debug(f"Attempting to load icon from: {icon_path}")
            
            if os.path.exists(icon_path):
                root.iconbitmap(icon_path)
                # logging.debug("Successfully loaded .ico icon")
            else:
                png_path = os.path.join(script_dir, "assets", "icon.png")
                if os.path.exists(png_path):
                    icon_image = ImageTk.PhotoImage(file=png_path)
                    root.iconphoto(True, icon_image)
                    # logging.debug("Successfully loaded .png icon") 
                else:
                    # logging.warning("No icon file found")
                    pass
        except Exception as e:
            # logging.warning(f"Failed to load icon: {str(e)}")
            pass
            
        show_splash(root)
        # logging.info("Showed splash screen")
        
        app = DonHangForm(root, db_session)
        # logging.info("Created main form")
        
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
        

