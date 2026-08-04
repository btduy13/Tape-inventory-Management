# Quản lý Băng Keo Vĩnh Thịnh v1.5.17

## Bộ lọc bảng Thống kê

- Thêm nút **Bỏ chọn tất cả** để bỏ chọn toàn bộ giá trị của cột.
- Nút **Tất cả** chọn lại toàn bộ giá trị.
- Nút **Xóa lọc** chọn lại tất cả, xóa nội dung ô tìm kiếm và hiện lại toàn bộ danh sách.
- Trạng thái không chọn giá trị nào được xử lý riêng, không còn bị hiểu nhầm là không áp dụng bộ lọc.
- Menu lọc giữ nguyên trạng thái mở sau các thao tác để người dùng nhìn thấy kết quả.

## Cloud credentials

- Installer được đóng gói kèm `config.local.json` trong thư mục resources cạnh executable để kết nối cloud ngay sau khi cài đặt.
- Credential không được commit vào Git; chỉ được đưa vào artifact phát hành được ủy quyền.

## Kiểm thử

- Unit test: 30/30 đạt.
- Electron smoke test thực tế: đạt, gồm Bỏ chọn tất cả, Tất cả, Xóa lọc và xóa search bar.
- Kiểm tra cú pháp JavaScript và `git diff --check`: đạt.
