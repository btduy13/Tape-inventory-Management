# Quản lý Băng Keo Vĩnh Thịnh v1.5.16

## Thay đổi chính

- Sửa lỗi đổi nội dung trục làm phát sinh thêm một trục và tạo hai dòng trục trong PDF báo giá.
- Trục đã lưu và trục đang nhập được quản lý tách biệt; sửa trục sẽ cập nhật đúng bản ghi hiện có.
- VAT được nhập theo phần trăm và tự tính trên tổng thành tiền, bao gồm VAT riêng của trục mới.
- Bỏ ngày giao dự kiến khỏi báo giá; đơn bán hàng vẫn giữ ngày giao.
- Thêm cửa sổ xem trước báo giá A4 trước khi xuất PDF.
- Giữ nguyên form báo giá sau khi xem trước để có thể tiếp tục chỉnh sửa đúng báo giá vừa lưu.
- Cập nhật Excel, công nợ, chỉnh sửa đơn và dữ liệu cũ để tương thích với VAT phần trăm.

## Kiểm thử

- 30 unit test đạt.
- Smoke test giao diện Electron đạt, gồm báo giá nhiều kích thước và nhiều trục.
- Kiểm thử hồi quy xác nhận đổi tên một trục không tạo bản sao trong dữ liệu hoặc PDF.
- Integration test database đạt và rollback không làm thay đổi dữ liệu sản xuất.
- `npm audit`: 0 lỗ hổng.
