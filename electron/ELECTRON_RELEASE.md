# Hướng dẫn Build, Release và Auto-Update (Electron)

## Tổng quan

| Thành phần | Mô tả |
|------------|--------|
| **Installer** | File `BangKeo_VinhThinh_Setup_X.Y.Z.exe` (NSIS) trong `electron/dist-installer/` |
| **Blockmap** | `BangKeo_VinhThinh_Setup_X.Y.Z.exe.blockmap` — cho phép tải cập nhật vi sai |
| **latest.yml** | Metadata cho auto-update (bắt buộc) |
| **GitHub Releases** | Phân phối installer cho người dùng |
| **Auto-update** | `electron-updater` kiểm tra lúc mở app, mỗi 24h + lệnh "Kiểm tra cập nhật" |
| **gh CLI** | Tạo release và upload file tự động |

Repository: [btduy13/Tape-inventory-Management](https://github.com/btduy13/Tape-inventory-Management)

---

## 1. Thiết lập lần đầu (máy developer)

### Cài GitHub CLI

```powershell
winget install --id GitHub.cli -e
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

## 2. Cấu hình kết nối (không đóng gói vào installer)

`config.local.json` (thông tin kết nối DB/email) **không còn được đóng gói** vào installer
(`extraResources` đã bỏ, `build.files` loại trừ `config.local.json`).

- Người dùng **nhập file cấu hình ở lần chạy đầu tiên** sau khi cài.
- Script release xoá `dist-installer/win-unpacked` trước khi build và **dừng lại** nếu
  `dist-installer/win-unpacked/resources/config.local.json` còn tồn tại sau khi build.
- Không bao giờ upload file cấu hình hay thông tin đăng nhập lên GitHub Releases.

---

## 3. Build installer (chỉ tạo file cài đặt)

```powershell
cd electron
npm install
npm run build:win
```

Kết quả (ví dụ version `1.5.21`):

- `electron/dist-installer/BangKeo_VinhThinh_Setup_1.5.21.exe` — gửi cho người dùng cài thủ công
- `electron/dist-installer/BangKeo_VinhThinh_Setup_1.5.21.exe.blockmap`
- `electron/dist-installer/latest.yml` — metadata cho auto-update

---

## 4. Tạo GitHub Release (draft → publish)

> **Release cả Python + Electron:** xem [`../RELEASE.md`](../RELEASE.md) và chạy `scripts/release-all.ps1`.

### Bước 1: Tăng version và commit

1. Sửa `version` trong `electron/package.json` (ví dụ `1.5.22`)
2. Commit (script yêu cầu git tree sạch với các file đã track trong `electron/`)

### Bước 2: Chạy script release

```powershell
cd electron
npm run release
```

Hoặc với ghi chú release:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/release.ps1 -Notes "Sửa lỗi thống kê, thêm nút xuất đơn"
```

Script `scripts/release.ps1` sẽ:

1. Kiểm tra `gh` đã cài và đã đăng nhập.
2. Kiểm tra `-Version` (nếu truyền) trùng với `version` trong `package.json`.
3. Yêu cầu git tree sạch (bỏ qua bằng `-Force`).
4. Chạy `npm test` và `npm run check` — dừng nếu lỗi.
5. Xoá `dist-installer/win-unpacked`, build bằng `npm run build:win` (bỏ qua bằng `-SkipBuild`).
6. Kiểm tra không có `resources/config.local.json` trong bản build.
7. Kiểm tra đủ `BangKeo_VinhThinh_Setup_X.Y.Z.exe`, `.exe.blockmap`, `latest.yml` và `version:` trong `latest.yml` trùng X.Y.Z.
8. Tạo release **draft** `vX.Y.Z`, upload exe + blockmap trước, `latest.yml` **cuối cùng** (chỉ khi các file trước thành công).

| Tham số | Ý nghĩa |
|---------|---------|
| `-Version X.Y.Z` | Phải trùng `package.json` (bỏ trống = lấy từ `package.json`) |
| `-Notes "..."` | Ghi chú release |
| `-SkipBuild` | Dùng lại bản build có sẵn |
| `-Force` | Bỏ qua kiểm tra git tree sạch |
| `-Publish` | Publish ngay sau khi upload (không để draft) |

### Bước 3: Kiểm tra rồi publish

Release draft **chưa** được người dùng nhìn thấy và auto-update chưa nhận.

1. Tải installer từ draft trên GitHub, cài thử và kiểm tra.
2. Publish:

```powershell
gh release edit vX.Y.Z --repo btduy13/Tape-inventory-Management --draft=false --latest
```

Hoặc mở [Releases](https://github.com/btduy13/Tape-inventory-Management/releases) và bấm **Publish release**.

---

## 5. Phân phối cho người dùng

1. Vào [Releases](https://github.com/btduy13/Tape-inventory-Management/releases)
2. Tải `BangKeo_VinhThinh_Setup_X.Y.Z.exe`
3. Chạy installer, rồi nhập file cấu hình ở lần chạy đầu tiên

Link trực tiếp (thay version):

```
https://github.com/btduy13/Tape-inventory-Management/releases/download/vX.Y.Z/BangKeo_VinhThinh_Setup_X.Y.Z.exe
```

---

## 6. Auto-update (người dùng cuối)

- Tự kiểm tra **8 giây** sau khi mở app, sau đó **mỗi 24 giờ** (lỗi kiểm tra nền chỉ ghi log, không báo lên giao diện)
- **Ctrl+K** → "Kiểm tra cập nhật": nếu có bản mới sẽ hiện hộp thoại **Tải ngay / Để sau**
- Trong lúc đang tải hoặc đã tải xong, app không kiểm tra/hỏi lại
- Tải xong: **Khởi động lại** để cài ngay, hoặc **Để sau** — bản cập nhật sẽ được cài khi thoát ứng dụng
- Chỉ hoạt động với bản cài từ installer (không phải `npm start`)

Release đã publish phải có đủ `.exe`, `.exe.blockmap` và `latest.yml`.
