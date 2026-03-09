# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_dynamic_libs
from PyInstaller.utils.hooks import collect_all

datas = [('assets', 'assets'), ('theme', 'theme')]
binaries = []
hiddenimports = ['babel.numbers', 'sqlalchemy.sql.default_comparator', 'sqlalchemy.ext.baked', 'sqlalchemy.ext.declarative', 'PIL._tkinter_finder', 'ttkthemes', 'requests', 'psycopg2', 'psycopg2._psycopg', 'psycopg2.extensions', 'psycopg2.extras', 'psycopg2.pool', 'psycopg2.sql', 'psycopg2.tz', 'psycopg2._json', 'psycopg2._range', 'psycopg2._ipaddress', 'psycopg2.errorcodes', 'psycopg2.errors']
binaries += collect_dynamic_libs('psycopg2')
tmp_ret = collect_all('psycopg2')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]


a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='TapeInventoryManagement',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['assets\\icon.ico'],
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='TapeInventoryManagement',
)
