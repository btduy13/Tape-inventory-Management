"""
Update Dialog - Giao diện cập nhật ứng dụng
"""
import tkinter as tk
from tkinter import ttk, messagebox
import threading
import os
from src.utils.version_manager import VersionManager

class UpdateDialog:
    def __init__(self, parent, version_manager: VersionManager):
        self.parent = parent
        self.version_manager = version_manager
        self.dialog = None
        self.progress_var = None
        self.status_var = None
        self.download_thread = None
        self.installer_path = None
        
    def show_update_check(self):
        """Hiển thị dialog kiểm tra cập nhật"""
        self.dialog = tk.Toplevel(self.parent)
        self.dialog.title("Kiểm tra cập nhật")
        self.dialog.geometry("500x300")
        self.dialog.resizable(False, False)
        self.dialog.transient(self.parent)
        self.dialog.grab_set()
        
        # Center dialog
        self.dialog.geometry("+%d+%d" % (
            self.parent.winfo_rootx() + 50,
            self.parent.winfo_rooty() + 50
        ))
        
        # Main frame
        main_frame = ttk.Frame(self.dialog, padding="20")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Title
        title_label = ttk.Label(
            main_frame, 
            text="Kiểm tra cập nhật", 
            font=('Segoe UI', 16, 'bold')
        )
        title_label.pack(pady=(0, 20))
        
        # Status
        self.status_var = tk.StringVar(value="Đang kiểm tra phiên bản mới...")
        status_label = ttk.Label(main_frame, textvariable=self.status_var)
        status_label.pack(pady=(0, 20))
        
        # Progress bar
        self.progress_var = tk.DoubleVar()
        progress_bar = ttk.Progressbar(
            main_frame, 
            variable=self.progress_var,
            mode='indeterminate'
        )
        progress_bar.pack(fill=tk.X, pady=(0, 20))
        progress_bar.start()
        
        # Buttons
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(fill=tk.X)
        
        self.cancel_button = ttk.Button(
            button_frame, 
            text="Hủy", 
            command=self.cancel_update
        )
        self.cancel_button.pack(side=tk.RIGHT, padx=(10, 0))
        
        # Start checking in background
        self.check_update_thread()
    
    def check_update_thread(self):
        """Kiểm tra cập nhật trong thread riêng"""
        def check_update():
            try:
                if self.version_manager.is_update_available():
                    latest_info = self.version_manager.get_latest_version_info()
                    if latest_info:
                        self.parent.after(0, lambda: self.show_update_available(latest_info))
                    else:
                        self.parent.after(0, lambda: self.show_no_update())
                else:
                    self.parent.after(0, lambda: self.show_no_update())
            except Exception as e:
                self.parent.after(0, lambda: self.show_error(f"Lỗi khi kiểm tra cập nhật: {str(e)}"))
        
        thread = threading.Thread(target=check_update, daemon=True)
        thread.start()
    
    def show_update_available(self, latest_info):
        """Hiển thị dialog có cập nhật mới"""
        self.dialog.destroy()
        
        self.dialog = tk.Toplevel(self.parent)
        self.dialog.title("Cập nhật có sẵn")
        self.dialog.geometry("600x400")
        self.dialog.resizable(False, False)
        self.dialog.transient(self.parent)
        self.dialog.grab_set()
        
        # Center dialog
        self.dialog.geometry("+%d+%d" % (
            self.parent.winfo_rootx() + 50,
            self.parent.winfo_rooty() + 50
        ))
        
        # Main frame
        main_frame = ttk.Frame(self.dialog, padding="20")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Title
        title_label = ttk.Label(
            main_frame, 
            text=f"Phiên bản {latest_info['version']} có sẵn", 
            font=('Segoe UI', 16, 'bold')
        )
        title_label.pack(pady=(0, 10))
        
        # Current version
        current_label = ttk.Label(
            main_frame, 
            text=f"Phiên bản hiện tại: {self.version_manager.current_version}"
        )
        current_label.pack(pady=(0, 10))
        
        # Release notes
        notes_frame = ttk.LabelFrame(main_frame, text="Thông tin cập nhật", padding="10")
        notes_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 20))
        
        notes_text = tk.Text(
            notes_frame, 
            height=10, 
            wrap=tk.WORD,
            font=('Segoe UI', 9)
        )
        notes_text.pack(fill=tk.BOTH, expand=True)
        notes_text.insert(tk.END, latest_info.get('release_notes', 'Không có thông tin chi tiết'))
        notes_text.config(state=tk.DISABLED)
        
        # Buttons
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(fill=tk.X)
        
        ttk.Button(
            button_frame, 
            text="Cập nhật ngay", 
            command=lambda: self.start_download(latest_info)
        ).pack(side=tk.LEFT)
        
        ttk.Button(
            button_frame, 
            text="Cập nhật sau", 
            command=self.dialog.destroy
        ).pack(side=tk.RIGHT)
    
    def show_no_update(self):
        """Hiển thị thông báo không có cập nhật"""
        self.dialog.destroy()
        messagebox.showinfo(
            "Kiểm tra cập nhật", 
            "Bạn đang sử dụng phiên bản mới nhất!",
            parent=self.parent
        )
    
    def show_error(self, error_message):
        """Hiển thị lỗi"""
        self.dialog.destroy()
        messagebox.showerror(
            "Lỗi kiểm tra cập nhật", 
            error_message,
            parent=self.parent
        )
    
    def start_download(self, latest_info):
        """Bắt đầu download cập nhật"""
        self.dialog.destroy()
        self.show_download_dialog(latest_info)
    
    def show_download_dialog(self, latest_info):
        """Hiển thị dialog download"""
        self.dialog = tk.Toplevel(self.parent)
        self.dialog.title("Đang tải cập nhật")
        self.dialog.geometry("500x200")
        self.dialog.resizable(False, False)
        self.dialog.transient(self.parent)
        self.dialog.grab_set()
        
        # Center dialog
        self.dialog.geometry("+%d+%d" % (
            self.parent.winfo_rootx() + 50,
            self.parent.winfo_rooty() + 50
        ))
        
        # Main frame
        main_frame = ttk.Frame(self.dialog, padding="20")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Title
        title_label = ttk.Label(
            main_frame, 
            text="Đang tải cập nhật...", 
            font=('Segoe UI', 14, 'bold')
        )
        title_label.pack(pady=(0, 20))
        
        # Status
        self.status_var = tk.StringVar(value="Đang tải file cài đặt...")
        status_label = ttk.Label(main_frame, textvariable=self.status_var)
        status_label.pack(pady=(0, 10))
        
        # Progress bar
        self.progress_var = tk.DoubleVar()
        progress_bar = ttk.Progressbar(
            main_frame, 
            variable=self.progress_var,
            maximum=100
        )
        progress_bar.pack(fill=tk.X, pady=(0, 20))
        
        # Cancel button
        self.cancel_button = ttk.Button(
            main_frame, 
            text="Hủy", 
            command=self.cancel_update
        )
        self.cancel_button.pack()
        
        # Start download
        self.download_thread = threading.Thread(
            target=self.download_update,
            args=(latest_info,),
            daemon=True
        )
        self.download_thread.start()
    
    def download_update(self, latest_info):
        """Download cập nhật"""
        try:
            def progress_callback(progress):
                self.parent.after(0, lambda: self.progress_var.set(progress))
                self.parent.after(0, lambda: self.status_var.set(f"Đang tải... {progress:.1f}%"))
            
            self.installer_path = self.version_manager.download_update(
                latest_info['download_url'], 
                progress_callback
            )
            
            if self.installer_path:
                self.parent.after(0, lambda: self.start_installation())
            else:
                self.parent.after(0, lambda: self.show_error("Không thể tải file cập nhật"))
                
        except Exception as e:
            self.parent.after(0, lambda: self.show_error(f"Lỗi khi tải cập nhật: {str(e)}"))
    
    def start_installation(self):
        """Bắt đầu cài đặt"""
        self.status_var.set("Đang cài đặt...")
        self.progress_var.set(100)
        self.cancel_button.config(state=tk.DISABLED)
        
        # Cài đặt trong thread riêng
        install_thread = threading.Thread(
            target=self.install_update,
            daemon=True
        )
        install_thread.start()
    
    def install_update(self):
        """Cài đặt cập nhật"""
        try:
            if self.version_manager.install_update(self.installer_path):
                self.parent.after(0, lambda: self.show_success())
            else:
                self.parent.after(0, lambda: self.show_error("Lỗi khi cài đặt cập nhật"))
        except Exception as e:
            self.parent.after(0, lambda: self.show_error(f"Lỗi khi cài đặt: {str(e)}"))
    
    def show_success(self):
        """Hiển thị thông báo thành công"""
        self.dialog.destroy()
        result = messagebox.askyesno(
            "Cập nhật thành công",
            "Cập nhật đã được cài đặt thành công!\n\nBạn có muốn khởi động lại ứng dụng ngay bây giờ?",
            parent=self.parent
        )
        
        if result:
            # Restart application
            os.system("shutdown /r /t 0")
    
    def cancel_update(self):
        """Hủy cập nhật"""
        if self.download_thread and self.download_thread.is_alive():
            # Không thể hủy download đang diễn ra, chỉ đóng dialog
            pass
        
        if self.dialog:
            self.dialog.destroy()
