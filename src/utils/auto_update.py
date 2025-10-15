"""
Auto Update - Tự động kiểm tra và thông báo cập nhật
"""
import threading
import time
import logging
from datetime import datetime, timedelta
from src.utils.version_manager import VersionManager

class AutoUpdater:
    def __init__(self, version_manager: VersionManager, check_interval_hours: int = 24):
        self.version_manager = version_manager
        self.check_interval = timedelta(hours=check_interval_hours)
        self.last_check_file = "last_update_check.json"
        self.logger = logging.getLogger(__name__)
        self.check_thread = None
        self.is_running = False
        
    def should_check_for_updates(self) -> bool:
        """Kiểm tra xem có nên check update không"""
        try:
            import json
            import os
            
            if not os.path.exists(self.last_check_file):
                return True
            
            with open(self.last_check_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            last_check = datetime.fromisoformat(data.get('last_check', '2000-01-01T00:00:00'))
            return datetime.now() - last_check > self.check_interval
            
        except Exception as e:
            self.logger.error(f"Lỗi khi kiểm tra thời gian check update: {e}")
            return True
    
    def save_check_time(self):
        """Lưu thời gian check update cuối cùng"""
        try:
            import json
            
            data = {
                'last_check': datetime.now().isoformat(),
                'version_checked': self.version_manager.current_version
            }
            
            with open(self.last_check_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
                
        except Exception as e:
            self.logger.error(f"Lỗi khi lưu thời gian check update: {e}")
    
    def check_for_updates_silent(self) -> bool:
        """Kiểm tra cập nhật im lặng (không hiển thị dialog)"""
        try:
            if not self.should_check_for_updates():
                return False
            
            self.logger.info("Đang kiểm tra cập nhật tự động...")
            
            if self.version_manager.is_update_available():
                self.logger.info("Phát hiện phiên bản mới!")
                return True
            else:
                self.logger.info("Không có phiên bản mới")
                return False
                
        except Exception as e:
            self.logger.error(f"Lỗi khi kiểm tra cập nhật tự động: {e}")
            return False
        finally:
            self.save_check_time()
    
    def start_auto_check(self, callback=None):
        """Bắt đầu tự động kiểm tra cập nhật"""
        if self.is_running:
            return
        
        self.is_running = True
        
        def check_worker():
            try:
                # Chờ một chút để ứng dụng khởi động hoàn toàn
                time.sleep(5)
                
                while self.is_running:
                    try:
                        has_update = self.check_for_updates_silent()
                        
                        if has_update and callback:
                            # Gọi callback để hiển thị thông báo
                            callback()
                        
                        # Chờ interval trước khi check lại
                        time.sleep(self.check_interval.total_seconds())
                        
                    except Exception as e:
                        self.logger.error(f"Lỗi trong auto check thread: {e}")
                        time.sleep(3600)  # Chờ 1 giờ nếu có lỗi
                        
            except Exception as e:
                self.logger.error(f"Lỗi nghiêm trọng trong auto updater: {e}")
            finally:
                self.is_running = False
        
        self.check_thread = threading.Thread(target=check_worker, daemon=True)
        self.check_thread.start()
        self.logger.info("Auto updater đã khởi động")
    
    def stop_auto_check(self):
        """Dừng tự động kiểm tra"""
        self.is_running = False
        if self.check_thread and self.check_thread.is_alive():
            self.logger.info("Đang dừng auto updater...")
    
    def force_check_now(self) -> bool:
        """Buộc kiểm tra cập nhật ngay lập tức"""
        try:
            self.logger.info("Buộc kiểm tra cập nhật...")
            has_update = self.version_manager.is_update_available()
            self.save_check_time()
            return has_update
        except Exception as e:
            self.logger.error(f"Lỗi khi force check update: {e}")
            return False
