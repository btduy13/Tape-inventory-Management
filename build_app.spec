# -*- mode: python ; coding: utf-8 -*-

import sys
import os
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

block_cipher = None

# Add fonts directory
fonts_dir = os.path.join('assets', 'fonts')
if not os.path.exists(fonts_dir):
    os.makedirs(fonts_dir)

hidden_imports = [
    'ttkthemes',
    'PIL',
    'PIL._tkinter_finder',
    'sqlalchemy',
    'sqlalchemy.sql.default_comparator',
    'pandas',
    'numpy',
    'openpyxl',
    'tkinter',
    'sqlite3',
    'datetime',
    'json',
    'logging',
    'encodings',
    'encodings.aliases',
    'encodings.utf_8',
    'encodings.ascii',
    'encodings.idna',
    'encodings.cp1252',
    'pkg_resources.py2_warn',
    'win32api',
    'win32con',
] + collect_submodules('pandas')

# Collect all font files
font_datas = []
if os.path.exists(fonts_dir):
    for root, dirs, files in os.walk(fonts_dir):
        for file in files:
            if file.lower().endswith(('.ttf', '.otf', '.ttc')):
                font_path = os.path.join(root, file)
                relative_path = os.path.relpath(root, '.')
                font_datas.append((font_path, relative_path))

a = Analysis(
    ['main.py'],
    pathex=[sys.path[0]],
    binaries=[],
    datas=[
        ('assets', 'assets'),
        ('logs', 'logs'),
    ] + collect_data_files('pandas') + font_datas,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

# Add system fonts
system_fonts = [
    ('C:\\Windows\\Fonts\\segoeui.ttf', 'fonts'),
    ('C:\\Windows\\Fonts\\segoeuib.ttf', 'fonts'),
    ('C:\\Windows\\Fonts\\arial.ttf', 'fonts'),
    ('C:\\Windows\\Fonts\\arialbd.ttf', 'fonts'),
]

for font_path, target_dir in system_fonts:
    if os.path.exists(font_path):
        a.datas.append((os.path.join(target_dir, os.path.basename(font_path)), font_path, 'DATA'))

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='QuanLyDonHang',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='assets/icon.ico',
    version='file_version_info.txt'
)

# Create collection
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='QuanLyDonHang'
) 