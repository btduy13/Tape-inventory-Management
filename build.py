import PyInstaller.__main__
import os
import shutil
import time
import sys
import tempfile
from pathlib import Path
import ctypes

def is_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False

def run_as_admin():
    if not is_admin():
        print("Requesting Administrator privileges...")
        ctypes.windll.shell32.ShellExecuteW(None, "runas", sys.executable, " ".join(sys.argv), None, 1)
        sys.exit()

def remove_dir(path):
    """Remove directory with access rights handling"""
    if not os.path.exists(path):
        return
        
    max_retries = 3
    retry_delay = 1  # seconds
    
    for retry in range(max_retries):
        try:
            if os.path.isdir(path):
                # Set access rights for all files
                for root, dirs, files in os.walk(path):
                    for dir in dirs:
                        os.chmod(os.path.join(root, dir), 0o777)
                    for file in files:
                        os.chmod(os.path.join(root, file), 0o777)
                shutil.rmtree(path, ignore_errors=True)
            elif os.path.isfile(path):
                os.chmod(path, 0o777)
                os.remove(path)
            if not os.path.exists(path):
                return
        except Exception as e:
            if retry == max_retries - 1:
                print(f"Cannot delete {path}: {str(e)}")
                print("Please close all applications using this directory and try again")
                sys.exit(1)
            time.sleep(retry_delay)

def build_app():
    try:
        print("Starting build process...")
        
        # Request admin privileges if not already granted
        run_as_admin()
        
        # Create dist directory if it doesn't exist
        dist_dir = Path('dist')
        dist_dir.mkdir(exist_ok=True, parents=True)
        
        # Remove old directories
        print("Cleaning up old directories...")
        remove_dir('build')
        remove_dir('dist/QuanLyDonHang')
        
        # Create and use new temp directory
        temp_dir = tempfile.mkdtemp()
        os.environ['TEMP'] = temp_dir
        os.environ['TMP'] = temp_dir
        
        # Path to assets directory
        assets_dir = Path(__file__).parent / 'assets'
        if not assets_dir.exists():
            print("WARNING: Assets directory not found!")
            
        print("Preparing build...")
        
        # PyInstaller options
        opts = [
            'main.py',  # Main script
            '--name=QuanLyDonHang',  # Executable name
            '--windowed',  # No console window
            '--noconfirm',  # Don't ask when overwriting
            '--clean',  # Clean cache
            f'--add-data={assets_dir};assets',  # Copy assets directory
            '--icon=assets/icon.ico',  # Executable icon
            '--hidden-import=PIL._tkinter_finder',  # Required hidden import
            '--hidden-import=ttkthemes',
            '--hidden-import=sqlalchemy.sql.default_comparator',
            '--collect-all=ttkthemes',  # Collect all ttkthemes files
            f'--workpath={temp_dir}/build',  # Use temp dir for build
            f'--distpath={temp_dir}/dist',  # Use temp dir for dist
            '--specpath=.',  # Spec file in current directory
        ]
        
        print("Building application...")
        PyInstaller.__main__.run(opts)
        
        # Move results from temp directory
        temp_dist = Path(temp_dir) / 'dist' / 'QuanLyDonHang'
        if temp_dist.exists():
            if dist_dir.exists():
                shutil.rmtree(dist_dir)
            shutil.copytree(temp_dist, dist_dir / 'QuanLyDonHang')
        
        # Cleanup
        try:
            shutil.rmtree(temp_dir)
        except:
            pass
            
        print("Build completed!")
        print(f"Executable is located in: {dist_dir.absolute() / 'QuanLyDonHang'}")
        
    except Exception as e:
        print(f"Error during build process: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    build_app()