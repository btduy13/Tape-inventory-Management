import sys
import subprocess
import os
import tkinter as tk
from tkinter import ttk, messagebox
import tempfile
import shutil
from pathlib import Path
import ctypes
import win32com.client
import win32api
import win32con

def is_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False

def run_as_admin():
    if not is_admin():
        script = os.path.abspath(sys.argv[0])
        params = ' '.join([script] + sys.argv[1:])
        
        try:
            ret = ctypes.windll.shell32.ShellExecuteW(
                None, 
                "runas",
                sys.executable,
                params,
                None,
                1
            )
            if int(ret) > 32:
                return True
        except:
            return False
    return True

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
        
        # Set icon if available
        try:
            if os.path.exists("assets/icon.ico"):
                self.root.iconbitmap("assets/icon.ico")
        except:
            pass
            
        self.create_widgets()
        
    def create_widgets(self):
        # Header
        header = ttk.Label(
            self.root, 
            text="Cài đặt Phần mềm Quản Lý Đơn Hàng",
            font=("Segoe UI", 14, "bold")
        )
        header.pack(pady=20)
        
        # Progress
        self.progress_var = tk.StringVar(value="Sẵn sàng cài đặt")
        self.progress_label = ttk.Label(
            self.root,
            textvariable=self.progress_var,
            font=("Segoe UI", 10)
        )
        self.progress_label.pack(pady=10)
        
        self.progress = ttk.Progressbar(
            self.root,
            length=400,
            mode='determinate'
        )
        self.progress.pack(pady=10)
        
        # Status
        frame = ttk.Frame(self.root)
        frame.pack(pady=10, fill=tk.BOTH, expand=True, padx=20)
        
        self.status_text = tk.Text(
            frame,
            height=10,
            width=50,
            font=("Consolas", 9),
            wrap=tk.WORD
        )
        scrollbar = ttk.Scrollbar(frame, command=self.status_text.yview)
        self.status_text.configure(yscrollcommand=scrollbar.set)
        
        self.status_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Buttons
        btn_frame = ttk.Frame(self.root)
        btn_frame.pack(pady=10)
        
        self.install_btn = ttk.Button(
            btn_frame,
            text="Bắt đầu cài đặt",
            command=self.start_installation,
            width=20
        )
        self.install_btn.pack(side=tk.LEFT, padx=5)
        
        self.cancel_btn = ttk.Button(
            btn_frame,
            text="Thoát",
            command=self.root.destroy,
            width=20
        )
        self.cancel_btn.pack(side=tk.LEFT, padx=5)
        
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
        # Upgrade pip first
        try:
            self.log("Đang nâng cấp pip...")
            subprocess.check_call([
                sys.executable,
                "-m",
                "pip",
                "install",
                "--upgrade",
                "pip"
            ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        except:
            self.log("! Không thể nâng cấp pip, tiếp tục...")
        
        # Read requirements
        try:
            with open("requirements.txt", "r") as f:
                requirements = [line.strip() for line in f if line.strip()]
        except:
            self.log("✗ Không tìm thấy file requirements.txt")
            return False
            
        total = len(requirements)
        for i, package in enumerate(requirements, 1):
            self.progress_var.set(f"Đang cài đặt {package}...")
            self.progress['value'] = (i / total) * 100
            self.root.update()
            
            try:
                subprocess.check_call([
                    sys.executable,
                    "-m",
                    "pip",
                    "install",
                    "--upgrade",
                    package
                ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                self.log(f"✓ Đã cài đặt {package}")
            except subprocess.CalledProcessError as e:
                self.log(f"✗ Lỗi khi cài đặt {package}")
                self.log(f"  Chi tiết: {str(e)}")
                return False
        return True
        
    def copy_program_files(self):
        try:
            # Create program directory
            program_dir = os.path.expandvars("%LOCALAPPDATA%\\QuanLyDonHang")
            os.makedirs(program_dir, exist_ok=True)
            
            # Copy necessary files
            files_to_copy = [
                "main.py",
                "assets",
                "README.md"
            ]
            
            for file in files_to_copy:
                if os.path.exists(file):
                    if os.path.isdir(file):
                        dst = os.path.join(program_dir, file)
                        if os.path.exists(dst):
                            shutil.rmtree(dst)
                        shutil.copytree(file, dst)
                    else:
                        shutil.copy2(file, program_dir)
                        
            self.log("✓ Đã sao chép các file chương trình")
            return program_dir
        except Exception as e:
            self.log(f"✗ Lỗi khi sao chép file: {str(e)}")
            return None
            
    def create_shortcut(self, program_dir):
        try:
            # Create desktop shortcut
            desktop = os.path.join(os.path.expanduser("~"), "Desktop")
            shortcut_path = os.path.join(desktop, "QuanLyDonHang.lnk")
            
            shell = win32com.client.Dispatch("WScript.Shell")
            shortcut = shell.CreateShortCut(shortcut_path)
            
            # Set shortcut properties
            main_script = os.path.join(program_dir, "main.py")
            shortcut.Targetpath = sys.executable
            shortcut.Arguments = f'"{main_script}"'
            shortcut.WorkingDirectory = program_dir
            
            icon_path = os.path.join(program_dir, "assets", "icon.ico")
            if os.path.exists(icon_path):
                shortcut.IconLocation = icon_path
                
            shortcut.save()
            
            self.log("✓ Đã tạo shortcut trên Desktop")
            return True
        except Exception as e:
            self.log(f"✗ Không thể tạo shortcut: {str(e)}")
            return False
            
    def start_installation(self):
        if not is_admin():
            if run_as_admin():
                self.root.destroy()
                return
            else:
                messagebox.showerror(
                    "Lỗi",
                    "Không thể lấy quyền Administrator. Vui lòng chạy lại với quyền Administrator."
                )
                self.root.destroy()
                return
            
        self.install_btn.config(state='disabled')
        self.cancel_btn.config(state='disabled')
        self.status_text.delete(1.0, tk.END)
        self.progress['value'] = 0
        
        # Check Python
        if not self.check_python():
            messagebox.showerror(
                "Lỗi",
                "Vui lòng cài đặt Python 3.8 trở lên"
            )
            self.root.destroy()
            return
            
        # Install requirements
        self.progress_var.set("Đang cài đặt các thư viện...")
        if not self.install_requirements():
            messagebox.showerror(
                "Lỗi",
                "Có lỗi xảy ra trong quá trình cài đặt thư viện"
            )
            return
            
        # Copy program files
        self.progress_var.set("Đang sao chép file chương trình...")
        program_dir = self.copy_program_files()
        if not program_dir:
            messagebox.showerror(
                "Lỗi",
                "Có lỗi xảy ra khi sao chép file chương trình"
            )
            return
            
        # Create shortcut
        self.progress_var.set("Đang tạo shortcut...")
        self.create_shortcut(program_dir)
        
        self.progress_var.set("Hoàn tất cài đặt!")
        self.progress['value'] = 100
        
        messagebox.showinfo(
            "Thành công",
            "Cài đặt hoàn tất!\n\n" +
            "Shortcut đã được tạo trên Desktop.\n" +
            "Bạn có thể chạy chương trình ngay bây giờ."
        )
        
        self.root.destroy()
        
    def run(self):
        self.root.mainloop()

if __name__ == "__main__":
    if not is_admin():
        if run_as_admin():
            sys.exit(0)
    installer = InstallerGUI()
    installer.run() 