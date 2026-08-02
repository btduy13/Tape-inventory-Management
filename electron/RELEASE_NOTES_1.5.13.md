# Phiên bản 1.5.13

## Giao diện bán hàng

- Đồng bộ giao diện của Băng Keo In, Băng Keo Thường và Gia Công Trục In với module Báo Giá.
- Tách Tên hàng, Khách hàng và thời gian giao thành các khu vực rõ ràng.
- Phân riêng trường kê khai và kết quả tính toán để tránh nhầm lẫn khi nhập đơn.
- Chia phần kê khai theo nhóm nghiệp vụ: quy cách, sản lượng, giá và phụ phí, thanh toán và cộng tác viên.

## Trục in và báo giá

- Tách kê khai trục mới và kết quả tính toán của trục thành hai khu vực riêng.
- Hiển thị VAT của trục mới trong nhóm giá và VAT trục.
- Thay lựa chọn loại trục bằng switch Trục cũ/Trục mới trên cả Bán hàng và Báo giá.
- Cải thiện bố cục responsive cho các nhóm kê khai và kết quả.

## Kiểm thử

- Bổ sung smoke test Electron xác nhận cả ba form Bán hàng dùng đúng cấu trúc mới.
- Kiểm tra trường nhập không bị trộn với trường kết quả chỉ đọc.
- Toàn bộ unit test, UI smoke test và integration test đều đạt.
