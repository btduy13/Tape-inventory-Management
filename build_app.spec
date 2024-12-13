# -*- mode: python ; coding: utf-8 -*-

import sys
import os
from PyInstaller.utils.hooks import collect_data_files

block_cipher = None

# Add fonts directory
fonts_dir = os.path.join('assets', 'fonts')
if not os.path.exists(fonts_dir):
    os.makedirs(fonts_dir)

# Required imports for installer
hidden_imports = [
    'tkinter',
    'tkinter.ttk',
    '_tkinter',
    'win32com.client',
    'win32com.shell',
    'win32api',
    'win32con',
    'pythoncom'
]

# Collect all font files
font_datas = []
if os.path.exists(fonts_dir):
    for root, dirs, files in os.walk(fonts_dir):
        for file in files:
            if file.lower().endswith(('.ttf', '.otf', '.ttc')):
                font_path = os.path.join(root, file)
                relative_path = os.path.relpath(root, '.')
                font_datas.append((font_path, relative_path))

# Get all Python files
python_files = []
for root, dirs, files in os.walk('.'):
    for file in files:
        if file.endswith('.py') and not file.startswith('build'):
            full_path = os.path.join(root, file)
            if not any(exclude in full_path for exclude in ['build', 'dist', '__pycache__']):
                python_files.append((full_path, '.'))

a = Analysis(
    ['installer.py'],
    pathex=[sys.path[0]],
    binaries=[],
    datas=[
        ('assets', 'assets'),
        ('requirements.txt', '.'),
        ('README.md', '.'),
    ] + python_files,
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

# Add system DLLs
a.binaries += [
    ('python3.dll', os.path.join(sys.base_prefix, 'python3.dll'), 'BINARY'),
    ('python310.dll', os.path.join(sys.base_prefix, 'python310.dll'), 'BINARY')
]

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='QuanLyDonHang_Setup',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,  # Set to True for debugging
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
    name='QuanLyDonHang_Setup'
) 