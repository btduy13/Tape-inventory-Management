# Phần mềm Quản Lý Đơn Hàng

## Yêu cầu hệ thống
- Windows 10 trở lên
- Python 3.8 trở lên

## Hướng dẫn cài đặt

### Cách 1: Sử dụng trình cài đặt tự động
1. Tải và cài đặt Python 3.8 trở lên từ [python.org](https://www.python.org/downloads/)
2. Chạy file `installer.py`
3. Nhấn nút "Bắt đầu cài đặt" và chờ quá trình cài đặt hoàn tất
4. Sau khi cài đặt xong, chạy shortcut trên Desktop để khởi động chương trình

### Cách 2: Cài đặt thủ công
1. Tải và cài đặt Python 3.8 trở lên từ [python.org](https://www.python.org/downloads/)
2. Mở Command Prompt với quyền Administrator
3. Cài đặt các thư viện cần thiết:
   ```
   pip install -r requirements.txt
   ```
4. Chạy chương trình:
   ```
   python main.py
   ```

## Các thư viện sử dụng
- ttkthemes: Giao diện đồ họa
- pillow: Xử lý hình ảnh
- sqlalchemy: Quản lý cơ sở dữ liệu
- pandas: Xử lý dữ liệu
- numpy: Tính toán số học
- openpyxl: Đọc/ghi file Excel
- babel: Định dạng số và ngày tháng
- pywin32: Tương tác với Windows

## Ghi chú
- Nếu gặp lỗi trong quá trình cài đặt, vui lòng kiểm tra file log trong thư mục `logs`
- Đảm bảo máy tính được kết nối internet trong quá trình cài đặt
- Cần quyền Administrator để cài đặt các thư viện