# splash_screen.py
import tkinter as tk
from tkinter import ttk
from PIL import Image, ImageTk
import os
import time

def show_splash(root):
    # Hide the main window temporarily
    root.withdraw()
    
    # Create splash window
    splash = tk.Toplevel(root)
    splash.title("")
    
    # Remove window decorations
    splash.overrideredirect(True)
    
    try:
        # Try to load and display logo
        script_dir = os.path.dirname(os.path.abspath(__file__))
        logo_path = os.path.join(script_dir, "assets", "logo.png")
        
        if os.path.exists(logo_path):
            # Load and resize image
            logo = Image.open(logo_path)
            logo = logo.resize((300, 200), Image.Resampling.LANCZOS)
            logo_img = ImageTk.PhotoImage(logo)
            
            # Create and pack logo label
            logo_label = tk.Label(splash, image=logo_img)
            logo_label.image = logo_img
            logo_label.pack(pady=10)
    except Exception:
        # If logo loading fails, show text instead
        tk.Label(splash, text="Phần Mềm Quản Lý Đơn Hàng", 
                font=('Helvetica', 16, 'bold')).pack(pady=20)

    # Add loading bar
    progress = ttk.Progressbar(splash, length=300, mode='determinate')
    progress.pack(pady=10)
    
    # Add status label
    status_label = tk.Label(splash, text="Đang khởi động...", font=('Helvetica', 10))
    status_label.pack(pady=5)
    
    # Center splash screen
    splash.update_idletasks()
    width = splash.winfo_width()
    height = splash.winfo_height()
    x = (splash.winfo_screenwidth() // 2) - (width // 2)
    y = (splash.winfo_screenheight() // 2) - (height // 2)
    splash.geometry(f'+{x}+{y}')
    
    # Function to update progress
    def update_progress():
        for i in range(101):
            time.sleep(0.02)
            progress['value'] = i
            if i < 30:
                status_label.config(text="Đang khởi tạo giao diện...")
            elif i < 60:
                status_label.config(text="Đang tải dữ liệu...")
            elif i < 90:
                status_label.config(text="Chuẩn bị hoàn tất...")
            else:
                status_label.config(text="Hoàn thành!")
            splash.update()
        
        # Destroy splash and show main window
        splash.destroy()
        root.deiconify()
    
    # Schedule the progress update
    splash.after(200, update_progress)
