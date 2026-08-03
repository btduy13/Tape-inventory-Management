# Quản lý Băng Keo Vĩnh Thịnh v1.5.15

## Kết nối cloud

- Đóng gói cấu hình kết nối cloud hiện tại vào installer để máy khách có thể kết nối ngay sau khi cài đặt.
- Giữ nguyên luồng nhập/xuất cấu hình dữ liệu để thay đổi credential hoặc chuyển máy an toàn hơn.

## Lưu ý bảo mật

- Installer có chứa thông tin kết nối riêng; chỉ chia sẻ cho khách hàng được ủy quyền.
- Không commit `config.local.json` vào Git và nên thay credential nếu installer bị chia sẻ ngoài phạm vi.
