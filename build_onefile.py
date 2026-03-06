import PyInstaller.__main__
import os
import sys
import shutil
from src.utils.config import APP_VERSION

def build_onefile():
    icon_path = os.path.join('assets', 'icon.ico')
    
    hidden_imports = [
        'babel.numbers',
        'sqlalchemy.sql.default_comparator',
        'PIL._tkinter_finder',
        'ttkthemes',
        'sqlalchemy.ext.baked',
        'sqlalchemy.ext.declarative',
        'requests',
        'psycopg2'
    ]
    
    datas = [
        ('assets', 'assets'),
        ('theme', 'theme'),
    ]
    
    options = [
        'main.py',
        f'--name=Bang_Keo_v{APP_VERSION}_Setup', # Tên để khớp với kỳ vọng của bản cũ
        '--onefile',                       # Tạo file đơn lẻ
        '--windowed',
        f'--icon={icon_path}',
        '--clean',
        '--noconfirm',
    ]
    
    for hi in hidden_imports:
        options.append(f'--hidden-import={hi}')
    
    for src, dst in datas:
        if os.path.exists(src):
            options.append(f'--add-data={src};{dst}')
    
    print(f"Building v{APP_VERSION} as ONEFILE...")
    PyInstaller.__main__.run(options)
    print("Build onefile completed!")

if __name__ == "__main__":
    build_onefile()
