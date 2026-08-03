# Quản lý Băng Keo Vĩnh Thịnh v1.5.14

## Sửa lỗi

- Hoàn thiện nút **Xóa lọc** trong bộ lọc cột của bảng Thống kê: khôi phục toàn bộ dòng, xóa trạng thái lọc trên tiêu đề và đóng menu đúng cách.
- Ngăn listener click bên ngoài bị tích lũy sau nhiều lần mở/đóng bộ lọc, tránh giao diện bị khóa hoặc phản hồi sai.
- Bổ sung trường **VAT** cho đơn Băng keo in và Băng keo thường.
- Công nợ khách của đơn Băng keo in có trục mới nay tính đủ VAT đơn và VAT trục; khi tất toán, công nợ đơn và trục đều bằng 0.
- Đồng bộ lại trigger công nợ PostgreSQL khi ứng dụng khởi động để dữ liệu lưu thực tế khớp với phép tính trên giao diện.

## Kiểm thử

- Unit test: 26/26 đạt.
- Electron UI smoke test: đạt, gồm nhập VAT và luồng lọc/Xóa lọc.
- Integration test PostgreSQL: đạt 7 luồng đơn hàng/báo giá, VAT, trục, tất toán, mở lại công nợ và truy vấn thống kê.
- Bản đóng gói Windows được chạy lại bằng chính executable đã build trước khi phát hành.
