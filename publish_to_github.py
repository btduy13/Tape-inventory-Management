"""
Script để tự động build và publish ứng dụng lên GitHub Releases
"""
import os
import sys
import subprocess
import requests
import json
import time
from pathlib import Path

class GitHubPublisher:
    def __init__(self, owner, repo, token):
        self.owner = owner
        self.repo = repo
        self.token = token
        self.api_url = f"https://api.github.com/repos/{owner}/{repo}"
        self.headers = {
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github.v3+json"
        }
        
    def build_application(self):
        """Build ứng dụng thành installer"""
        print("🔨 Đang build ứng dụng...")
        
        try:
            # Chạy script build
            result = subprocess.run([sys.executable, "build_release.py"], 
                                  capture_output=True, text=True, cwd=".")
            
            if result.returncode != 0:
                print(f"❌ Lỗi khi build: {result.stderr}")
                return False
                
            print("✅ Build thành công!")
            return True
            
        except Exception as e:
            print(f"❌ Lỗi khi build: {e}")
            return False
    
    def get_version(self):
        """Lấy version từ setup.py hoặc version file"""
        try:
            # Đọc từ setup.py
            with open("setup.py", "r", encoding="utf-8") as f:
                content = f.read()
                for line in content.split("\n"):
                    if "version" in line and "=" in line:
                        version = line.split('"')[1]
                        return version
        except:
            pass
            
        # Fallback to default
        return "1.0.0"
    
    def create_release(self, version, release_notes=""):
        """Tạo release trên GitHub"""
        print(f"📦 Đang tạo release v{version}...")
        
        release_data = {
            "tag_name": f"v{version}",
            "target_commitish": "master",
            "name": f"Tape Inventory Management v{version}",
            "body": release_notes or f"Cập nhật phiên bản {version}",
            "draft": False,
            "prerelease": False
        }
        
        try:
            response = requests.post(
                f"{self.api_url}/releases",
                headers=self.headers,
                json=release_data
            )
            
            if response.status_code == 201:
                print("✅ Tạo release thành công!")
                return response.json()
            else:
                print(f"❌ Lỗi khi tạo release: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Lỗi khi tạo release: {e}")
            return None
    
    def upload_asset(self, release_id, file_path):
        """Upload file lên release"""
        print(f"📤 Đang upload {file_path}...")
        
        try:
            # Đọc file
            with open(file_path, "rb") as f:
                file_data = f.read()
            
            # Upload
            upload_url = f"https://uploads.github.com/repos/{self.owner}/{self.repo}/releases/{release_id}/assets"
            params = {"name": os.path.basename(file_path)}
            
            response = requests.post(
                upload_url,
                headers={**self.headers, "Content-Type": "application/octet-stream"},
                params=params,
                data=file_data
            )
            
            if response.status_code == 201:
                print("✅ Upload thành công!")
                return True
            else:
                print(f"❌ Lỗi khi upload: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Lỗi khi upload: {e}")
            return False
    
    def publish(self, release_notes=""):
        """Publish ứng dụng lên GitHub"""
        print("🚀 Bắt đầu publish ứng dụng lên GitHub...")
        
        # 1. Build ứng dụng
        if not self.build_application():
            return False
        
        # 2. Lấy version
        version = self.get_version()
        print(f"📋 Phiên bản: {version}")
        
        # 3. Tạo release
        release = self.create_release(version, release_notes)
        if not release:
            return False
        
        # 4. Upload installer
        installer_path = "installer/TapeInventoryManagement_Setup.exe"
        if os.path.exists(installer_path):
            if not self.upload_asset(release["id"], installer_path):
                return False
        else:
            print(f"⚠️  Không tìm thấy installer tại: {installer_path}")
        
        print("🎉 Publish thành công!")
        print(f"🔗 Link download: {release['html_url']}")
        return True

def main():
    """Main function"""
    print("=== GitHub Publisher for Tape Inventory Management ===")
    
    # Cấu hình
    owner = input("GitHub username/organization: ").strip()
    repo = input("Repository name: ").strip()
    token = input("GitHub Personal Access Token: ").strip()
    release_notes = input("Release notes (tùy chọn): ").strip()
    
    if not all([owner, repo, token]):
        print("❌ Vui lòng nhập đầy đủ thông tin!")
        return
    
    # Tạo publisher và publish
    publisher = GitHubPublisher(owner, repo, token)
    
    if publisher.publish(release_notes):
        print("\n✅ Hoàn thành! Ứng dụng đã được publish lên GitHub.")
    else:
        print("\n❌ Có lỗi xảy ra trong quá trình publish.")

if __name__ == "__main__":
    main()
