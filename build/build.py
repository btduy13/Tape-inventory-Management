import PyInstaller.__main__
import os
import shutil
import time
import sys
import tempfile
from pathlib import Path
import ctypes
import locale

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
                for root, dirs, files in os.walk(path):
                    for dir in dirs:
                        try:
                            os.chmod(os.path.join(root, dir), 0o777)
                        except:
                            pass
                    for file in files:
                        try:
                            os.chmod(os.path.join(root, file), 0o777)
                        except:
                            pass
                shutil.rmtree(path, ignore_errors=True)
            elif os.path.isfile(path):
                try:
                    os.chmod(path, 0o777)
                    os.remove(path)
                except:
                    pass
            if not os.path.exists(path):
                return
        except Exception as e:
            if retry == max_retries - 1:
                print(f"Warning: Cannot delete {path}: {str(e)}")
            time.sleep(retry_delay)

def setup_environment():
    """Setup environment variables and encoding"""
    # Set default encoding
    if sys.platform.startswith('win'):
        if locale.getpreferredencoding().upper() != 'UTF-8':
            os.environ['PYTHONIOENCODING'] = 'utf-8'
    
    # Set environment variables
    os.environ['PYTHONLEGACYWINDOWSFSENCODING'] = '0'
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    os.environ['PYTHONOPTIMIZE'] = '0'  # Disable optimization
    os.environ['PYTHONDONTWRITEBYTECODE'] = '1'  # Don't write .pyc files

def build_app():
    try:
        print("Starting build process...")
        
        # Setup environment
        setup_environment()
        
        # Request admin privileges if not already granted
        run_as_admin()
        
        # Create necessary directories
        dist_dir = Path('dist')
        logs_dir = Path('logs')
        dist_dir.mkdir(exist_ok=True, parents=True)
        logs_dir.mkdir(exist_ok=True, parents=True)
        
        # Remove old directories
        print("Cleaning up old directories...")
        remove_dir('build')
        remove_dir('dist/QuanLyDonHang')
        
        # Create and use new temp directory
        temp_dir = tempfile.mkdtemp()
        os.environ['TEMP'] = temp_dir
        os.environ['TMP'] = temp_dir
        
        # Check required directories
        assets_dir = Path(__file__).parent / 'assets'
        if not assets_dir.exists():
            print("ERROR: Assets directory not found!")
            sys.exit(1)
            
        print("Preparing build...")
        
        # PyInstaller options
        opts = [
            'build_app.spec',  # Use spec file instead of main.py
            '--distpath=dist',
            '--workpath=build',
            '--clean',
            '--noconfirm',
        ]
        
        print("Building application...")
        PyInstaller.__main__.run(opts)
        
        # Create README file
        readme_content = """QuanLyDonHang - Phần mềm Quản lý đơn hàng

Hướng dẫn cài đặt:
1. Chạy file QuanLyDonHang.exe với quyền Administrator
2. Chờ chương trình khởi động lần đầu tiên
3. Sử dụng bình thường

Lưu ý:
- Cần quyền Administrator để chạy chương trình
- Không xóa các thư mục assets và logs
- Nếu có lỗi, vui lòng kiểm tra file logs"""
        
        with open(dist_dir / 'QuanLyDonHang' / 'README.txt', 'w', encoding='utf-8') as f:
            f.write(readme_content)
            
        print("Build completed successfully!")
        print(f"Executable is located in: {dist_dir.absolute() / 'QuanLyDonHang'}")
        
    except Exception as e:
        print(f"Error during build process: {str(e)}")
        print("Full error details:", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    build_app()