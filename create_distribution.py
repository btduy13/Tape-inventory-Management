import os
import shutil
import zipfile
from datetime import datetime

def create_distribution():
    """Tạo file phân phối cho Tape Inventory Management"""
    
    # Tên file phân phối
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_name = f"TapeInventoryManagement_v1.0.0_{timestamp}.zip"
    
    # Đường dẫn thư mục dist
    dist_dir = "dist/TapeInventoryManagement"
    
    if not os.path.exists(dist_dir):
        print(f"Lỗi: Thư mục {dist_dir} không tồn tại!")
        print("Vui lòng chạy build_installer.py trước để tạo file executable.")
        return
    
    # Tạo file ZIP
    print(f"Creating distribution file: {zip_name}")
    
    with zipfile.ZipFile(zip_name, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # Thêm tất cả file trong thư mục dist
        for root, dirs, files in os.walk(dist_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arc_path = os.path.relpath(file_path, dist_dir)
                zipf.write(file_path, arc_path)
                print(f"Added: {arc_path}")
    
    print(f"\nCompleted! Distribution file: {zip_name}")
    print(f"Size: {os.path.getsize(zip_name) / (1024*1024):.1f} MB")
    
    # Tạo file hướng dẫn
    readme_content = """
# Tape Inventory Management v1.0.0

## Hướng dẫn cài đặt

1. Giải nén file ZIP này vào thư mục mong muốn
2. Chạy file `TapeInventoryManagement.exe` để khởi động ứng dụng
3. Ứng dụng sẽ tự động tạo database và các thư mục cần thiết

## Yêu cầu hệ thống

- Windows 10/11 (64-bit)
- Không cần cài đặt Python hoặc các thư viện khác

## Tính năng chính

- Quản lý đơn hàng Băng Keo In, Trục In, Băng Keo
- Thống kê và báo cáo
- Xuất đơn đặt hàng PDF
- Import/Export Excel
- Giao diện tiếng Việt

## Hỗ trợ

Nếu gặp vấn đề, vui lòng liên hệ với nhà phát triển.

---
Tape Inventory Management v1.0.0
Ngày tạo: """ + datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    
    with open("README_DISTRIBUTION.txt", "w", encoding="utf-8") as f:
        f.write(readme_content)
    
    print("Created README_DISTRIBUTION.txt")

if __name__ == "__main__":
    create_distribution()
