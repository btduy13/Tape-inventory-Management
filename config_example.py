"""
Cấu hình mẫu cho auto-update system
Copy file này thành config.py và điền thông tin của bạn
"""

# GitHub Configuration
GITHUB_OWNER = "your-username"  # Thay bằng GitHub username của bạn
GITHUB_REPO = "tape-inventory-management"  # Thay bằng tên repository
GITHUB_TOKEN = "your_github_token_here"  # GitHub Personal Access Token

# Application Configuration
APP_VERSION = "1.0.0"
APP_NAME = "Tape Inventory Management"

# Update Configuration
CHECK_INTERVAL_HOURS = 24  # Kiểm tra cập nhật mỗi 24 giờ
AUTO_DOWNLOAD = True  # Tự động download khi có cập nhật
SHOW_NOTIFICATION = True  # Hiển thị thông báo khi có cập nhật

# Build Configuration
BUILD_DIR = "build"
DIST_DIR = "dist"
INSTALLER_DIR = "installer"
OUTPUT_FILENAME = "TapeInventoryManagement_Setup.exe"

# Security Configuration
VERIFY_SIGNATURE = False  # Xác thực chữ ký số (nếu có)
CHECK_HASH = True  # Kiểm tra hash của file download

# Logging Configuration
LOG_LEVEL = "INFO"  # DEBUG, INFO, WARNING, ERROR
LOG_FILE = "logs/update.log"
