import PyInstaller.__main__
import os
import sys
import shutil
import site

def get_site_packages():
    """Get the site-packages directory of the current Python"""
    # For venv, site.getsitepackages() works
    try:
        sp = site.getsitepackages()
        for p in sp:
            if 'site-packages' in p and os.path.isdir(p):
                return p
    except AttributeError:
        pass
    # Fallback for virtualenv
    return os.path.join(sys.prefix, 'Lib', 'site-packages')


def build_exe():
    site_packages = get_site_packages()
    print(f"Using site-packages: {site_packages}")

    # Đường dẫn đến icon
    icon_path = os.path.join('assets', 'icon.ico')

    # Các hidden imports cần thiết
    hidden_imports = [
        'babel.numbers',
        'sqlalchemy.sql.default_comparator',
        'sqlalchemy.ext.baked',
        'sqlalchemy.ext.declarative',
        'PIL._tkinter_finder',
        'ttkthemes',
        'requests',
        'psycopg2',
        'psycopg2._psycopg',
        'psycopg2.extensions',
        'psycopg2.extras',
        'psycopg2.pool',
        'psycopg2.sql',
        'psycopg2.tz',
        'psycopg2._json',
        'psycopg2._range',
        'psycopg2._ipaddress',
        'psycopg2.errorcodes',
        'psycopg2.errors',
    ]

    # Các data files cần bundle
    datas = [
        ('assets', 'assets'),
        ('theme', 'theme'),
    ]

    # Add psycopg2_binary.libs DLLs (critical for psycopg2-binary on Windows)
    psycopg2_libs = os.path.join(site_packages, 'psycopg2_binary.libs')
    if os.path.isdir(psycopg2_libs):
        datas.append((psycopg2_libs, 'psycopg2_binary.libs'))
        print(f"Added psycopg2_binary.libs: {psycopg2_libs}")
    else:
        print("WARNING: psycopg2_binary.libs not found!")

    # Build options
    options = [
        'main.py',
        '--name=TapeInventoryManagement',
        '--onedir',
        '--windowed',
        f'--icon={icon_path}',
        '--clean',
        '--noconfirm',
        '--collect-all=psycopg2',         # collect all psycopg2 modules + binaries
        '--collect-binaries=psycopg2',    # also collect native binaries explicitly
    ]

    # Add hidden imports
    for hi in hidden_imports:
        options.append(f'--hidden-import={hi}')

    # Add data files
    for src, dst in datas:
        if os.path.exists(src):
            options.append(f'--add-data={src};{dst}')
        else:
            print(f"Warning: {src} not found, skipping.")

    # Debug mode support
    if '--debug' in sys.argv:
        options.extend(['--debug=all', '--log-level=DEBUG'])

    print("Building with options:", options)
    PyInstaller.__main__.run(options)
    print("Build completed successfully!")


if __name__ == "__main__":
    build_exe()