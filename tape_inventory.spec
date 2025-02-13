# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('src/services/vuArial.ttf', 'src/services'),
        ('src/ui/assets/*', 'src/ui/assets'),
        ('alembic.ini', '.'),
        ('migrations', 'migrations'),
    ],
    hiddenimports=[
        'babel.numbers',
        'sqlalchemy.sql.default_comparator',
        'tkinter',
        'tkinter.ttk',
        'ttkthemes',
        'PIL',
        'reportlab',
        'pandas',
        'matplotlib',
        'seaborn',
        'openpyxl',
        'tkcalendar',
        'schedule'
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(
    a.pure,
    a.zipped_data,
    cipher=block_cipher
)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='TapeInventoryManagement',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='src/ui/assets/icon.ico'
) 