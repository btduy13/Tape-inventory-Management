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

    def build_installer(self):
        """Build installer using Inno Setup"""
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