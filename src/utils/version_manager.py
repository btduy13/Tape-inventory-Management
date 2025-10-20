"""
Version Manager - Quản lý phiên bản và auto-update
"""
import os
import json
import requests
import tempfile
import subprocess
import shutil
from pathlib import Path
from typing import Optional, Dict, Any
import logging

class VersionManager:
    def __init__(self, current_version: str = "1.0.0"):
        self.current_version = current_version
        self.version_file = "version.json"
        self.update_url = "https://api.github.com/repos/{owner}/{repo}/releases/latest"
        self.owner = "btduy13"  # Thay đổi thành GitHub username của bạn
        self.repo = "Tape-inventory-Management"  # Thay đổi thành tên repo
        self.logger = logging.getLogger(__name__)
        
    def get_latest_version_info(self) -> Optional[Dict[str, Any]]:
        """Lấy thông tin phiên bản mới nhất từ GitHub"""
        try:
            url = self.update_url.format(owner=self.owner, repo=self.repo)
            headers = {}
            # Uncomment và thêm token nếu repository là private
            # headers['Authorization'] = 'token YOUR_PERSONAL_ACCESS_TOKEN'
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            return {
                'version': data['tag_name'].lstrip('v'),
                'download_url': self._get_download_url(data['assets']),
                'release_notes': data['body'],
                'published_at': data['published_at']
            }
        except Exception as e:
            self.logger.error(f"Không thể lấy thông tin phiên bản mới: {e}")
            return None
    
    def _get_download_url(self, assets: list) -> Optional[str]:
        """Tìm URL download của installer"""
        for asset in assets:
            if asset['name'].endswith('_Setup.exe'):
                return asset['browser_download_url']
        return None
    
    def is_update_available(self) -> bool:
        """Kiểm tra xem có phiên bản mới không"""
        latest_info = self.get_latest_version_info()
        if not latest_info:
            return False
        
        latest_version = latest_info['version']
        return self._compare_versions(latest_version, self.current_version) > 0
    
    def _compare_versions(self, version1: str, version2: str) -> int:
        """So sánh 2 phiên bản. Trả về 1 nếu v1 > v2, -1 nếu v1 < v2, 0 nếu bằng"""
        v1_parts = [int(x) for x in version1.split('.')]
        v2_parts = [int(x) for x in version2.split('.')]
        
        # Đảm bảo cùng độ dài
        max_len = max(len(v1_parts), len(v2_parts))
        v1_parts.extend([0] * (max_len - len(v1_parts)))
        v2_parts.extend([0] * (max_len - len(v2_parts)))
        
        for v1, v2 in zip(v1_parts, v2_parts):
            if v1 > v2:
                return 1
            elif v1 < v2:
                return -1
        return 0
    
    def download_update(self, download_url: str, progress_callback=None) -> Optional[str]:
        """Download bản cập nhật"""
        try:
            self.logger.info(f"Bắt đầu download update từ: {download_url}")
            
            response = requests.get(download_url, stream=True, timeout=30)
            response.raise_for_status()
            
            total_size = int(response.headers.get('content-length', 0))
            
            # Tạo file tạm
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.exe')
            
            downloaded = 0
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    temp_file.write(chunk)
                    downloaded += len(chunk)
                    
                    if progress_callback and total_size > 0:
                        progress = (downloaded / total_size) * 100
                        progress_callback(progress)
            
            temp_file.close()
            self.logger.info("Download update thành công")
            return temp_file.name
            
        except Exception as e:
            self.logger.error(f"Lỗi khi download update: {e}")
            return None
    
    def install_update(self, installer_path: str) -> bool:
        """Cài đặt bản cập nhật"""
        try:
            self.logger.info("Bắt đầu cài đặt update...")
            
            # Chạy installer với quyền admin và tự động cài đặt
            cmd = [installer_path, '/SILENT', '/NORESTART']
            
            # Chờ installer hoàn thành
            process = subprocess.run(cmd, capture_output=True, text=True)
            
            if process.returncode == 0:
                self.logger.info("Cài đặt update thành công")
                return True
            else:
                self.logger.error(f"Lỗi khi cài đặt: {process.stderr}")
                return False
                
        except Exception as e:
            self.logger.error(f"Lỗi khi cài đặt update: {e}")
            return False
    
    def save_version_info(self, version_info: Dict[str, Any]):
        """Lưu thông tin phiên bản vào file"""
        try:
            with open(self.version_file, 'w', encoding='utf-8') as f:
                json.dump(version_info, f, ensure_ascii=False, indent=2)
        except Exception as e:
            self.logger.error(f"Không thể lưu thông tin phiên bản: {e}")
    
    def load_version_info(self) -> Optional[Dict[str, Any]]:
        """Đọc thông tin phiên bản từ file"""
        try:
            if os.path.exists(self.version_file):
                with open(self.version_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            self.logger.error(f"Không thể đọc thông tin phiên bản: {e}")
        return None
