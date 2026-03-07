import os
import sys
import subprocess
import shutil
import venv
import logging
from pathlib import Path

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('build.log'),
        logging.StreamHandler()
    ]
)

class Builder:
    def __init__(self):
        self.root_dir = Path.cwd()
        self.build_dir = self.root_dir / 'build'
        self.dist_dir = self.root_dir / 'dist'
        self.venv_dir = self.root_dir / 'venv_build'
        self.installer_dir = self.root_dir / 'installer'

    def create_venv(self):
        """Create a virtual environment for building"""
        logging.info("Creating virtual environment...")
        venv.create(self.venv_dir, with_pip=True)

    def install_requirements(self):
        """Install all required packages"""
        logging.info("Installing requirements...")
        pip = str(self.venv_dir / 'Scripts' / 'pip.exe')
        
        # Install basic requirements
        subprocess.run([pip, 'install', 'wheel', 'setuptools'], check=True)
        subprocess.run([pip, 'install', 'pyinstaller'], check=True)
        
        # Install project requirements
        subprocess.run([pip, 'install', '-e', '.'], check=True)

    def generate_requirements(self):
        """Generate requirements.txt"""
        logging.info("Generating requirements.txt...")
        pip = str(self.venv_dir / 'Scripts' / 'pip.exe')
        with open('requirements.txt', 'w') as f:
            subprocess.run([pip, 'freeze'], stdout=f, check=True)

    def build_exe(self):
        """Build executable using PyInstaller"""
        logging.info("Building executable...")
        python = str(self.venv_dir / 'Scripts' / 'python.exe')
        subprocess.run([python, 'build_installer.py'], check=True)

    def update_installer_version(self):
        """Update version in installer.iss from config.py"""
        logging.info("Updating installer version...")
        try:
            from src.utils.config import APP_VERSION
            
            iss_path = self.root_dir / 'installer.iss'
            if not iss_path.exists():
                logging.warning("installer.iss not found")
                return

            with open(iss_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()

            with open(iss_path, 'w', encoding='utf-8') as f:
                for line in lines:
                    if line.startswith('#define MyAppVersion'):
                        f.write(f'#define MyAppVersion "{APP_VERSION}"\n')
                    else:
                        f.write(line)
            logging.info(f"Updated installer.iss to version {APP_VERSION}")
        except Exception as e:
            logging.error(f"Failed to update installer version: {e}")

    def build_onefile_updater(self):
        """Build a single-file executable for the update process"""
        logging.info("Building single-file updater...")
        python = str(self.venv_dir / 'Scripts' / 'python.exe')
        
        # We use a custom script for onefile to ensure correct renaming and bundling
        with open('build_onefile_tmp.py', 'w', encoding='utf-8') as f:
            f.write(f'''
import PyInstaller.__main__
import os
from src.utils.config import APP_VERSION

def build():
    icon_path = os.path.join('assets', 'icon.ico')
    hidden_imports = [
        'babel.numbers', 'sqlalchemy.sql.default_comparator', 
        'PIL._tkinter_finder', 'ttkthemes', 'sqlalchemy.ext.baked',
        'sqlalchemy.ext.declarative', 'requests', 'psycopg2'
    ]
    datas = [('assets', 'assets'), ('theme', 'theme')]
    
    options = [
        'main.py',
        f'--name=Bang_Keo_v{{APP_VERSION}}_Setup',
        '--onefile',
        '--windowed',
        f'--icon={{icon_path}}',
        '--noconfirm',
        '--collect-all=numpy',
        '--collect-all=pandas'
    ]
    for hi in hidden_imports: options.append(f'--hidden-import={{hi}}')
    for src, dst in datas:
        if os.path.exists(src): options.append(f'--add-data={{src}};{{dst}}')
    
    PyInstaller.__main__.run(options)

if __name__ == "__main__":
    build()
''')
        
        subprocess.run([python, 'build_onefile_tmp.py'], check=True)
        os.remove('build_onefile_tmp.py')
        
        # Copy the onefile result to root for easy access
        from src.utils.config import APP_VERSION
        onefile_name = f"Bang_Keo_v{APP_VERSION}_Setup.exe"
        generated_onefile = self.dist_dir / onefile_name
        if generated_onefile.exists():
            shutil.copy2(generated_onefile, self.root_dir / onefile_name)
            logging.info(f"Successfully created single-file updater: {onefile_name}")

    def build_installer(self):
        """Build installer using Inno Setup (or fallback to ZIP)"""
        # First update the version
        self.update_installer_version()
        
        logging.info("Building installer...")
        iscc_paths = [
            r"C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
            r"C:\Program Files\Inno Setup 6\ISCC.exe",
            r"C:\Program Files (x86)\Inno Setup 5\ISCC.exe",
        ]
        
        iscc = None
        for path in iscc_paths:
            if os.path.exists(path):
                iscc = f'"{path}"'
                break
        
        if iscc:
            logging.info(f"Using ISCC at {iscc}")
            subprocess.run(f'{iscc} installer.iss', shell=True, check=True)
        else:
            logging.warning("ISCC.exe not found. Skipping Inno Setup installer creation.")
            logging.info("Falling back to ZIP/Portable creator...")
            python = str(self.venv_dir / 'Scripts' / 'python.exe')
            subprocess.run([python, 'create_installer.py'], check=True)

    def cleanup(self):
        """Clean up temporary files"""
        logging.info("Cleaning up...")
        if self.build_dir.exists():
            shutil.rmtree(self.build_dir)
        if self.dist_dir.exists():
            shutil.rmtree(self.dist_dir)

    def run(self):
        """Run the complete build process"""
        try:
            logging.info("Starting build process...")
            
            # Clean up old files
            self.cleanup()
            
            # Create build environment
            self.create_venv()
            
            # Install dependencies
            self.install_requirements()
            
            # Generate requirements.txt
            self.generate_requirements()
            
            # Build executable (onedir)
            self.build_exe()
            
            # Build onefile updater (for clients without Inno Setup installer)
            self.build_onefile_updater()
            
            # Build installer (Inno Setup or Portable ZIP)
            self.build_installer()
            
            logging.info("Build completed successfully!")
            
        except Exception as e:
            logging.error(f"Build failed: {str(e)}")
            # self.cleanup()  # Don't cleanup on failure to allow debugging
            sys.exit(1)

if __name__ == "__main__":
    builder = Builder()
    builder.run() 