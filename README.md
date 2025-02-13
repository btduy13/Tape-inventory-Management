# Tape Inventory Management System

Hệ thống quản lý kho băng keo, đơn hàng và báo cáo.

## Yêu cầu hệ thống

- Python 3.8 trở lên
- PostgreSQL 12 trở lên
- Windows 10/11

## Cài đặt môi trường phát triển

1. Tạo môi trường ảo:
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
```

2. Cài đặt dependencies:
```bash
pip install -r requirements.txt
```

3. Cấu hình database:
- Tạo file `.env` từ `.env.example`
- Cập nhật thông tin kết nối database trong `.env`
- Chạy migrations:
```bash
alembic upgrade head
```

## Chạy ứng dụng

```bash
python main.py
```

## Build thành file thực thi

1. Cài đặt PyInstaller:
```bash
pip install pyinstaller
```

2. Build ứng dụng:
```bash
pyinstaller tape_inventory.spec
```

File thực thi sẽ được tạo trong thư mục `dist/TapeInventoryManagement.exe`

## Cấu trúc thư mục

```
Tape-inventory-Management/
├── main.py                     # Entry point
├── src/
│   ├── database/              # Database models & connection
│   ├── services/              # Business logic
│   ├── ui/                    # User interface
│   └── utils/                 # Utilities
├── migrations/                # Database migrations
└── alembic.ini               # Database config
```

## Tính năng chính

1. Quản lý đơn hàng:
   - Băng keo in
   - Trục in
   - Băng keo thường

2. Xuất báo cáo:
   - Đơn đặt hàng
   - Phiếu giao hàng
   - Báo cáo thống kê

3. Quản lý kho:
   - Nhập/xuất kho
   - Kiểm kê
   - Theo dõi tồn kho

## Hỗ trợ

Nếu gặp vấn đề, vui lòng tạo issue trên GitHub hoặc liên hệ qua email. 