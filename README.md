# Phần Mềm Quản Lý Đơn Hàng

## Cấu trúc thư mục
```
QuanLyDonHang/
├── assets/
│   ├── icon.ico
│   └── fonts/
├── main.py
├── database.py
├── donhang_form.py
├── history_tab.py
├── tab_base.py
├── excel_import.py
├── build.py
├── requirements.txt
└── README.md
```

## Yêu cầu hệ thống
- Windows 10 trở lên
- 4GB RAM trở lên
- 500MB dung lượng ổ cứng trống

## Hướng dẫn build
1. Cài đặt Python 3.8 trở lên
2. Cài đặt các thư viện cần thiết:
```bash
pip install -r requirements.txt
```
3. Chạy script build:
```bash
python build.py
```
4. File exe sẽ được tạo trong thư mục `dist`

## Hướng dẫn sử dụng
1. Copy toàn bộ thư mục `dist` đến máy đích
2. Chạy file `QuanLyDonHang.exe`
3. Lần đầu chạy, chương trình sẽ tự tạo file database `orders.db`

## Lưu ý
- Không xóa thư mục `assets` trong thư mục `dist`
- File database `orders.db` sẽ được tạo trong cùng thư mục với file exe
- Nếu muốn backup dữ liệu, copy file `orders.db` 