#!/usr/bin/env python3
"""
Script tạo installer tự động
"""
import os
import sys
import shutil
import zipfile
from pathlib import Path

def create_installer():
    """Tạo installer từ file exe và thư mục _internal"""
    
    print("🔧 Tạo Installer cho Băng Keo App")
    print("="*40)
    
    # Kiểm tra file exe
    exe_path = Path("dist/TapeInventoryManagement/TapeInventoryManagement.exe")
    if not exe_path.exists():
        print(f"❌ Không tìm thấy file exe tại: {exe_path}")
        return False
    
    # Tạo thư mục installer
    installer_dir = Path("installer_package")
    if installer_dir.exists():
        shutil.rmtree(installer_dir)
    installer_dir.mkdir()
    
    print(f"✅ Tìm thấy file exe: {exe_path}")
    
    # Copy file exe
    shutil.copy2(exe_path, installer_dir / "TapeInventoryManagement.exe")
    print("✅ Copy file exe")
    
    # Copy thư mục _internal
    internal_dir = Path("dist/TapeInventoryManagement/_internal")
    if internal_dir.exists():
        shutil.copytree(internal_dir, installer_dir / "_internal")
        print("✅ Copy thư mục _internal")
    else:
        print("⚠️  Không tìm thấy thư mục _internal")
    
    # Copy assets nếu có
    assets_dir = Path("assets")
    if assets_dir.exists():
        shutil.copytree(assets_dir, installer_dir / "assets")
        print("✅ Copy thư mục assets")
    
    # Copy theme nếu có
    theme_dir = Path("theme")
    if theme_dir.exists():
        shutil.copytree(theme_dir, installer_dir / "theme")
        print("✅ Copy thư mục theme")
    
    # Tạo file README
    try:
        from src.utils.config import APP_VERSION
    except ImportError:
        APP_VERSION = "1.1.0"

    readme_content = f"""# Băng Keo App v{APP_VERSION}

## Hướng dẫn cài đặt:

1. Giải nén file này vào thư mục bạn muốn
2. Chạy file `TapeInventoryManagement.exe`
3. Lần đầu chạy có thể mất vài giây để khởi tạo

## Tính năng:
- Quản lý đơn hàng băng keo in, băng keo thường, trục in
- Thống kê và báo cáo chi tiết
- Dashboard tổng quan
- Lịch sử giao dịch
- Xuất đơn đặt hàng và phiếu giao hàng
- Tự động cập nhật

## Hỗ trợ:
Nếu gặp vấn đề, vui lòng liên hệ qua GitHub repository.
"""
    
    with open(installer_dir / "README.txt", "w", encoding="utf-8") as f:
        f.write(readme_content)
    print("✅ Tạo file README")
    
    # Tạo file batch để chạy app
    batch_content = """@echo off
echo Dang khoi dong Bang Keo App...
start "" "TapeInventoryManagement.exe"
"""
    
    with open(installer_dir / "Run_Bang_Keo_App.bat", "w", encoding="utf-8") as f:
        f.write(batch_content)
    print("✅ Tạo file batch")
    
    # Tạo file ZIP
    zip_path = Path(f"Bang_Keo_App_v{APP_VERSION}_Portable.zip")
    if zip_path.exists():
        zip_path.unlink()
    
    print("📦 Đang tạo file ZIP...")
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(installer_dir):
            for file in files:
                file_path = Path(root) / file
                arcname = file_path.relative_to(installer_dir)
                zipf.write(file_path, arcname)
    
    # Tính kích thước
    zip_size = zip_path.stat().st_size / (1024*1024)
    
    print("\n" + "="*50)
    print("🎉 TẠO INSTALLER THÀNH CÔNG!")
    print("="*50)
    print(f"📦 File installer: {zip_path}")
    print(f"📏 Kích thước: {zip_size:.1f} MB")
    print(f"📁 Thư mục tạm: {installer_dir}")
    print("="*50)
    print("\n💡 Hướng dẫn:")
    print("1. Phân phối file ZIP cho người dùng")
    print("2. Người dùng giải nén và chạy TapeInventoryManagement.exe")
    print("3. Hoặc chạy file Run_Bang_Keo_App.bat")
    
    return True

def create_simple_installer():
    """Tạo installer đơn giản chỉ copy file"""
    try:
        from src.utils.config import APP_VERSION
    except ImportError:
        APP_VERSION = "1.1.0"

    print("\n🔧 Tạo Simple Installer...")
    
    # Copy file exe ra ngoài
    exe_path = Path("dist/TapeInventoryManagement/TapeInventoryManagement.exe")
    simple_exe = Path(f"Bang_Keo_App_v{APP_VERSION}.exe")
    
    if exe_path.exists():
        shutil.copy2(exe_path, simple_exe)
        size = simple_exe.stat().st_size / (1024*1024)
        print(f"✅ Tạo file đơn giản: {simple_exe} ({size:.1f} MB)")
        print("⚠️  Lưu ý: File này cần thư mục _internal để chạy!")
        return True
    else:
        print("❌ Không tìm thấy file exe")
        return False

def main():
    print("🚀 Băng Keo App - Installer Creator")
    print("="*40)
    
    # Tạo installer đầy đủ
    success1 = create_installer()
    
    # Tạo installer đơn giản
    success2 = create_simple_installer()
    
    if success1 or success2:
        print("\n✅ Hoàn tất! Bạn có thể phân phối các file đã tạo.")
    else:
        print("\n❌ Có lỗi xảy ra.")

if __name__ == "__main__":
    main()

