import PyInstaller.__main__
import os
import sys
import shutil

def build_exe():
    # Xóa thư mục build và dist cũ nếu tồn tại
    for dir_name in ['build', 'dist']:
        if os.path.exists(dir_name):
            shutil.rmtree(dir_name)

    # Đường dẫn đến icon
    icon_path = os.path.join('assets', 'icon.ico')
    
    # Các hidden imports cần thiết
    hidden_imports = [
        'babel.numbers',
        'sqlalchemy.sql.default_comparator',
        'PIL._tkinter_finder',
        'ttkthemes',
        'sqlalchemy.ext.baked',
        'sqlalchemy.ext.declarative'
    ]
    
    # Các data files cần bundle
    datas = [
        ('assets', 'assets'),  # Copy thư mục assets
        ('theme', 'theme'),    # Copy thư mục theme
    ]
    
    # Các options cho PyInstaller
    options = [
        'main.py',                        # Script chính
        '--name=TapeInventoryManagement', # Tên ứng dụng
        '--onedir',                       # Tạo thư mục chứa tất cả files
        '--windowed',                     # Không hiện console window
        f'--icon={icon_path}',            # Icon cho ứng dụng
        '--clean',                        # Clean cache
        '--noconfirm',                    # Không hỏi khi ghi đè
    ]
    
    # Thêm hidden imports
    for hidden_import in hidden_imports:
        options.append(f'--hidden-import={hidden_import}')
    
    # Thêm data files
    for src, dst in datas:
        if os.path.exists(src):
            options.append(f'--add-data={src};{dst}')
        else:
            print(f"Warning: {src} directory not found")
    
    # Thêm options cho debug nếu cần
    if '--debug' in sys.argv:
        options.extend([
            '--debug=all',
            '--log-level=DEBUG'
        ])

    print("Building with options:", options)
    # Build ứng dụng
    PyInstaller.__main__.run(options)

    print("Build completed successfully!")

if __name__ == "__main__":
    build_exe() 