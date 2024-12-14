import os

# Database configuration
DATABASE_URL = "postgresql://postgres.ctmkkxfheqjdmjahkheu:M4tkh%40u_11@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"

# Application settings
APP_NAME = "Phần Mềm Quản Lý Đơn Hàng"
APP_THEME = "none"

# Asset paths
ASSETS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "assets")
ICON_ICO = os.path.join(ASSETS_DIR, "icon.ico")
ICON_PNG = os.path.join(ASSETS_DIR, "icon.png")

# Logging configuration
LOG_DIR = "logs"
LOG_FORMAT = "%(asctime)s [%(levelname)s] %(message)s"
LOG_ENCODING = "utf-8" 