import sys
import subprocess
import os
import tkinter as tk
from tkinter import ttk, messagebox
import winreg

class InstallerGUI:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Cài đặt Quản Lý Đơn Hàng")
        self.root.geometry("600x400")
        
        # Center window
        screen_width = self.root.winfo_screenwidth()
        screen_height = self.root.winfo_screenheight()
        x = (screen_width - 600) // 2
        y = (screen_height - 400) // 2
        self.root.geometry(f"600x400+{x}+{y}")
        
        self.create_widgets()
        
    def create_widgets(self):
        # Header
        header = ttk.Label(self.root, text="Cài đặt Phần mềm Quản Lý Đơn Hàng", font=("Segoe UI", 14, "bold"))
        header.pack(pady=20)
        
        # Progress
        self.progress_var = tk.StringVar(value="Đang kiểm tra hệ thống...")
        self.progress_label = ttk.Label(self.root, textvariable=self.progress_var)
        self.progress_label.pack(pady=10)
        
        self.progress = ttk.Progressbar(self.root, length=400, mode='determinate')
        self.progress.pack(pady=10)
        
        # Status
        self.status_text = tk.Text(self.root, height=10, width=50)
        self.status_text.pack(pady=10)
        
        # Install button
        self.install_btn = ttk.Button(self.root, text="Bắt đầu cài đặt", command=self.start_installation)
        self.install_btn.pack(pady=10)
        
    def log(self, message):
        self.status_text.insert(tk.END, message + "\n")
        self.status_text.see(tk.END)
        self.root.update()
        
    def check_python(self):
        try:
            python_version = sys.version_info
            if python_version.major == 3 and python_version.minor >= 8:
                self.log("✓ Python 3.8+ đã được cài đặt")
                return True
            else:
                self.log("✗ Cần Python phiên bản 3.8 trở lên")
                return False
        except:
            self.log("✗ Không tìm thấy Python")
            return False
            
    def install_requirements(self):
        requirements = [
            'ttkthemes',
            'pillow',
            'sqlalchemy',
            'pandas',
            'numpy',
            'openpyxl',
            'babel',
            'pywin32'
        ]
        
        total = len(requirements)
        for i, package in enumerate(requirements, 1):
            self.progress_var.set(f"Đang cài đặt {package}...")
            self.progress['value'] = (i / total) * 100
            self.root.update()
            
            try:
                subprocess.check_call([sys.executable, "-m", "pip", "install", package])
                self.log(f"✓ Đã cài đặt {package}")
            except subprocess.CalledProcessError:
                self.log(f"✗ Lỗi khi cài đặt {package}")
                return False
        return True
        
    def create_shortcut(self):
        try:
            # Create desktop shortcut
            desktop = os.path.join(os.path.expanduser("~"), "Desktop")
            shortcut_path = os.path.join(desktop, "QuanLyDonHang.lnk")
            
            import win32com.client
            shell = win32com.client.Dispatch("WScript.Shell")
            shortcut = shell.CreateShortCut(shortcut_path)
            shortcut.Targetpath = os.path.abspath("QuanLyDonHang.exe")
            shortcut.WorkingDirectory = os.path.abspath(os.path.dirname("QuanLyDonHang.exe"))
            shortcut.IconLocation = os.path.abspath("assets/icon.ico")
            shortcut.save()
            
            self.log("✓ Đã tạo shortcut trên Desktop")
            return True
        except:
            self.log("✗ Không thể tạo shortcut")
            return False
            
    def start_installation(self):
        self.install_btn.config(state='disabled')
        self.status_text.delete(1.0, tk.END)
        self.progress['value'] = 0
        
        # Check Python
        if not self.check_python():
            messagebox.showerror("Lỗi", "Vui lòng cài đặt Python 3.8 trở lên")
            self.root.destroy()
            return
            
        # Install requirements
        if not self.install_requirements():
            messagebox.showerror("Lỗi", "Có lỗi xảy ra trong quá trình cài đặt")
            return
            
        # Create shortcut
        self.create_shortcut()
        
        self.progress_var.set("Hoàn tất cài đặt!")
        self.progress['value'] = 100
        
        messagebox.showinfo("Thành công", 
            "Cài đặt hoàn tất!\n\n" + 
            "Shortcut đã được tạo trên Desktop.\n" +
            "Bạn có thể chạy chương trình ngay bây giờ.")
            
        self.root.destroy()
        
    def run(self):
        self.root.mainloop()

if __name__ == "__main__":
    installer = InstallerGUI()
    installer.run() 