# Phần Mềm Quản Lý Đơn Hàng

Ứng dụng quản lý đơn hàng được xây dựng bằng Python và Tkinter.

## Cấu trúc dự án

```
quanlydonhang/
├── src/                    # Mã nguồn chính
│   ├── ui/                 # Giao diện người dùng
│   │   ├── forms/         # Các form chính
│   │   └── tabs/          # Các tab trong form
│   ├── database/          # Xử lý cơ sở dữ liệu
│   ├── services/          # Các dịch vụ (báo cáo, nhập/xuất)
│   └── utils/             # Tiện ích và cấu hình
├── assets/                # Tài nguyên (hình ảnh, font)
├── logs/                  # File logs
├── tests/                 # Unit tests
└── build/                 # Build scripts và cấu hình
```

## Yêu cầu hệ thống

- Python 3.8 hoặc cao hơn
- PostgreSQL

## Cài đặt

1. Clone repository:
```bash
git clone <repository-url>
cd quanlydonhang
```

2. Cài đặt các thư viện phụ thuộc:
```bash
pip install -r requirements.txt
```

3. Cấu hình cơ sở dữ liệu:
- Mở file `src/utils/config.py`
- Cập nhật `DATABASE_URL` với thông tin kết nối PostgreSQL của bạn

## Chạy ứng dụng

```bash
python main.py
```

## Build ứng dụng

Để tạo file thực thi:
```bash
python build/build.py
```

## Tính năng

- Quản lý đơn hàng
- Xuất báo cáo
- Nhập/xuất dữ liệu Excel
- Theo dõi lịch sử

## Đóng góp

Vui lòng đọc [CONTRIBUTING.md](CONTRIBUTING.md) để biết thêm chi tiết về quy trình đóng góp.

## Giấy phép

[MIT License](LICENSE)