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
        self.venv_dir = self.build_dir / 'venv'
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
        subprocess.run([pip, 'install', '-U', 'pip', 'wheel', 'setuptools'])
        subprocess.run([pip, 'install', 'pyinstaller'])
        
        # Install project requirements
        subprocess.run([pip, 'install', '-e', '.'])

    def generate_requirements(self):
        """Generate requirements.txt"""
        logging.info("Generating requirements.txt...")
        pip = str(self.venv_dir / 'Scripts' / 'pip.exe')
        with open('requirements.txt', 'w') as f:
            subprocess.run([pip, 'freeze'], stdout=f)

    def build_exe(self):
        """Build executable using PyInstaller"""
        logging.info("Building executable...")
        python = str(self.venv_dir / 'Scripts' / 'python.exe')
        subprocess.run([python, 'build_installer.py'])

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

    def build_installer(self):
        """Build installer using Inno Setup"""
        # First update the version
        self.update_installer_version()
        
        logging.info("Building installer...")
        iscc = r'"C:\Program Files (x86)\Inno Setup 6\ISCC.exe"'
        subprocess.run(f'{iscc} installer.iss', shell=True)

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
            
            # Build executable
            self.build_exe()
            
            # Build installer
            self.build_installer()
            
            logging.info("Build completed successfully!")
            
        except Exception as e:
            logging.error(f"Build failed: {str(e)}")
            self.cleanup()
            sys.exit(1)

if __name__ == "__main__":
    builder = Builder()
    builder.run() 