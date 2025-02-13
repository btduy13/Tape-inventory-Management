import os

# Database configuration
DATABASE_URL = "postgresql://postgres.ctmkkxfheqjdmjahkheu:M4tkh%40u_11@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"

# Application settings
APP_NAME = "Phần Mềm Quản Lý Đơn Hàng"
APP_THEME = "azure"

# UI Style configurations
UI_STYLES = {
    'font': ('Segoe UI', 10),
    'heading_font': ('Segoe UI', 12, 'bold'),
    'button': {
        'background': '#0078D7',
        'foreground': 'white',
        'activebackground': '#005A9E',
        'activeforeground': 'white',
        'font': ('Segoe UI', 10),
        'borderwidth': 0,
        'padx': 15,
        'pady': 5
    },
    'entry': {
        'font': ('Segoe UI', 10),
        'borderwidth': 1,
        'relief': 'solid'
    },
    'treeview': {
        'background': 'white',
        'fieldbackground': 'white',
        'font': ('Segoe UI', 10),
        'rowheight': 25
    },
    'colors': {
        'primary': '#0078D7',
        'secondary': '#E6E6E6',
        'success': '#107C10',
        'warning': '#FDB515',
        'error': '#E81123',
        'text': '#333333',
        'text_secondary': '#666666'
    }
}

# Padding and spacing
UI_PADDING = {
    'small': 5,
    'medium': 10,
    'large': 15,
    'xlarge': 20
}

# Asset paths
ASSETS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "assets")
ICON_ICO = os.path.join(ASSETS_DIR, "icon.ico")
ICON_PNG = os.path.join(ASSETS_DIR, "icon.png")

# Logging configuration
LOG_DIR = "logs"
LOG_FORMAT = "%(asctime)s [%(levelname)s] %(message)s"
LOG_ENCODING = "utf-8" 