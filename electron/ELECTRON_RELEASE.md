# Hướng dẫn Build, Release và Auto-Update (Electron)

## Tổng quan

| Thành phần | Mô tả |
|------------|--------|
| **Installer** | File `BangKeo_Setup_X.Y.Z.exe` (NSIS) trong `electron/dist-installer/` |
| **GitHub Releases** | Phân phối installer cho người dùng |
| **Auto-update** | `electron-updater` kiểm tra mỗi 24h + menu "Kiểm tra cập nhật" |
| **gh CLI** | Tạo release và upload file tự động |

Repository: [btduy13/Tape-inventory-Management](https://github.com/btduy13/Tape-inventory-Management)

---

## 1. Thiết lập lần đầu (máy developer)

### Cài GitHub CLI

```powershell
winget install GitHub.cli
# hoặc
powershell -ExecutionPolicy Bypass -File electron/scripts/setup-gh.ps1
```

### Đăng nhập GitHub

```powershell
gh auth login
```

Chọn: **GitHub.com** → **HTTPS** → **Login with a web browser** → quyền **repo**.

Kiểm tra:

```powershell
gh auth status
```

---

## 2. Build installer (chỉ tạo file cài đặt)

```powershell
cd electron
npm install
npm run build-win
```

Kết quả:

- `electron/dist-installer/BangKeo_Setup_1.2.0.exe` — gửi cho người dùng cài thủ công
- `electron/dist-installer/latest.yml` — metadata cho auto-update

---

## 3. Tạo GitHub Release

> **Release cả Python + Electron:** xem [`../RELEASE.md`](../RELEASE.md) và chạy `scripts/release-all.ps1`.

### Chỉ Electron

### Cách 1: Script tự động (khuyến nghị)

```powershell
cd electron
npm run release
```

Hoặc với ghi chú release:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/release.ps1 -Notes "Sửa lỗi thống kê, thêm nút xuất đơn"
```

### Cách 2: Tăng version trước khi release

1. Sửa `version` trong `electron/package.json` (ví dụ `1.2.1`)
2. Commit và push
3. Chạy `npm run release`

---

## 4. Phân phối cho người dùng

1. Vào [Releases](https://github.com/btduy13/Tape-inventory-Management/releases)
2. Tải `BangKeo_Setup_X.Y.Z.exe`
3. Chạy installer

Link trực tiếp (thay version):

```
https://github.com/btduy13/Tape-inventory-Management/releases/download/v1.2.0/BangKeo_Setup_1.2.0.exe
```

---

## 5. Auto-update (người dùng cuối)

- Tự kiểm tra **8 giây** sau khi mở app, sau đó **mỗi 24 giờ**
- **Ctrl+K** → "Kiểm tra cập nhật"
- Chỉ hoạt động với bản cài từ installer (không phải `npm start`)

Release phải có cả `.exe` và `latest.yml`.
