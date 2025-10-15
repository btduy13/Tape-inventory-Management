# 🚀 Hướng Dẫn Deploy và Auto-Update

## 📋 Tổng Quan

Hệ thống này cho phép bạn:
- ✅ Tự động build và publish ứng dụng lên GitHub
- ✅ Tự động kiểm tra và cập nhật ứng dụng
- ✅ Phân phối ứng dụng dễ dàng đến người dùng cuối

## 🛠️ Thiết Lập Ban Đầu

### 1. Tạo GitHub Repository

```bash
# Chạy script thiết lập
python setup_github_release.py
```

Script này sẽ:
- Tạo `.gitignore` phù hợp
- Tạo `README.md` với hướng dẫn
- Thiết lập Git repository
- Push code lên GitHub

### 2. Tạo GitHub Personal Access Token

1. Vào GitHub → Settings → Developer settings → Personal access tokens
2. Tạo token mới với quyền `repo` (Full control of private repositories)
3. Copy token để sử dụng trong bước tiếp theo

### 3. Cấu Hình Version Manager

Sửa file `src/utils/version_manager.py`:

```python
class VersionManager:
    def __init__(self, current_version: str = "1.0.0"):
        self.owner = "YOUR_GITHUB_USERNAME"  # Thay đổi này
        self.repo = "YOUR_REPO_NAME"         # Thay đổi này
```

## 📦 Publish Ứng Dụng

### Cách 1: Sử dụng Script Tự Động (Khuyến nghị)

```bash
python publish_to_github.py
```

Nhập thông tin:
- GitHub username/organization
- Repository name  
- GitHub Personal Access Token
- Release notes (tùy chọn)

### Cách 2: Manual Process

1. **Build ứng dụng:**
   ```bash
   python build_release.py
   ```

2. **Tạo release trên GitHub:**
   - Vào GitHub repository
   - Click "Releases" → "Create a new release"
   - Tạo tag mới (ví dụ: v1.0.1)
   - Upload file `installer/TapeInventoryManagement_Setup.exe`

## 🔄 Cách Thức Hoạt Động

### Auto-Update System

1. **Kiểm tra tự động:** Ứng dụng tự động kiểm tra cập nhật mỗi 24h
2. **Thông báo:** Hiển thị popup khi có phiên bản mới
3. **Download:** Tự động tải installer từ GitHub Releases
4. **Cài đặt:** Tự động cài đặt với quyền admin
5. **Restart:** Khởi động lại ứng dụng sau khi cài đặt

### Version Checking

- Ứng dụng so sánh version hiện tại với version mới nhất trên GitHub
- Format version: `MAJOR.MINOR.PATCH` (ví dụ: 1.0.1)
- Chỉ cập nhật khi version mới > version hiện tại

## 👥 Phân Phối Đến Người Dùng

### Cách 1: GitHub Releases (Khuyến nghị)

1. **Chia sẻ link GitHub repository**
2. **Hướng dẫn người dùng:**
   - Vào tab "Releases"
   - Download file `TapeInventoryManagement_Setup.exe`
   - Chạy installer với quyền Administrator

### Cách 2: Direct Download

1. **Tạo link trực tiếp đến file installer:**
   ```
   https://github.com/username/repo/releases/download/v1.0.1/TapeInventoryManagement_Setup.exe
   ```

2. **Chia sẻ link này với người dùng**

### Cách 3: Website

1. **Tạo trang web đơn giản với nút download**
2. **Link trực tiếp đến GitHub Releases**

## 🔧 Cập Nhật Ứng Dụng

### Cho Developer

1. **Sửa code và test**
2. **Cập nhật version trong `setup.py`:**
   ```python
   version="1.0.1"  # Tăng version
   ```

3. **Commit và push:**
   ```bash
   git add .
   git commit -m "Update to v1.0.1"
   git push
   ```

4. **Publish release:**
   ```bash
   python publish_to_github.py
   ```

### Cho End User

- **Tự động:** Ứng dụng sẽ thông báo khi có cập nhật
- **Thủ công:** Menu → "Kiểm tra cập nhật"

## 🛡️ Bảo Mật

### GitHub Token

- **Không commit token vào code**
- **Sử dụng environment variables:**
  ```bash
  set GITHUB_TOKEN=your_token_here
  ```

### Installer

- **Sign installer với certificate** (tùy chọn)
- **Virus scan** trước khi publish
- **Hash verification** để đảm bảo file không bị modify

## 📊 Monitoring

### Logs

- **Application logs:** `logs/app_YYYYMMDD.log`
- **Update logs:** Trong application logs
- **Error tracking:** Tất cả lỗi được ghi vào log

### Analytics

Có thể thêm tracking:
- Số lần check update
- Số lần download update  
- Version distribution
- Error rates

## 🔍 Troubleshooting

### Lỗi Thường Gặp

1. **"Không thể kiểm tra cập nhật"**
   - Kiểm tra kết nối internet
   - Kiểm tra GitHub repository settings
   - Kiểm tra GitHub token permissions

2. **"Lỗi khi download"**
   - Kiểm tra file size (có thể quá lớn)
   - Kiểm tra firewall/antivirus
   - Thử download thủ công

3. **"Lỗi khi cài đặt"**
   - Chạy với quyền Administrator
   - Kiểm tra Windows Defender
   - Kiểm tra disk space

### Debug Mode

Thêm vào `main.py`:
```python
logging.getLogger().setLevel(logging.DEBUG)
```

## 🚀 Advanced Features

### Scheduled Updates

Có thể cấu hình update vào thời gian cụ thể:
```python
auto_updater = AutoUpdater(version_manager, check_interval_hours=12)
```

### Custom Update Server

Thay vì GitHub, có thể sử dụng server riêng:
```python
version_manager = VersionManager("1.0.0")
version_manager.update_url = "https://your-server.com/api/version"
```

### Rollback Feature

Có thể thêm tính năng rollback về version cũ nếu version mới có lỗi.

## 📝 Checklist Deploy

- [ ] Cấu hình GitHub repository
- [ ] Tạo Personal Access Token
- [ ] Sửa version manager settings
- [ ] Test build locally
- [ ] Publish lần đầu
- [ ] Test auto-update
- [ ] Chia sẻ với người dùng
- [ ] Monitor logs và feedback

## 🎯 Best Practices

1. **Version Management:**
   - Sử dụng Semantic Versioning (1.0.1)
   - Changelog rõ ràng
   - Test kỹ trước khi release

2. **User Experience:**
   - Thông báo update không quá intrusive
   - Cho phép postpone update
   - Backup data trước khi update

3. **Security:**
   - Verify installer integrity
   - Use HTTPS cho mọi communication
   - Regular security updates

---

**🎉 Chúc bạn deploy thành công!**
