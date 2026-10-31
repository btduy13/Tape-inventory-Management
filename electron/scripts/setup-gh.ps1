# Thiet lap GitHub CLI cho release
$ErrorActionPreference = "Stop"

Write-Host "=== Thiet lap GitHub CLI ===" -ForegroundColor Cyan

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  # winget se hoi dong y dieu khoan; nguoi dung tu xac nhan
  Write-Host "Dang cai GitHub CLI qua winget..." -ForegroundColor Yellow
  winget install --id GitHub.cli -e
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

gh --version

Write-Host ""
Write-Host "Buoc tiep theo: dang nhap GitHub (can trinh duyet)" -ForegroundColor Yellow
Write-Host "  gh auth login" -ForegroundColor White
Write-Host ""
Write-Host "Chon:" -ForegroundColor Gray
Write-Host "  - GitHub.com" -ForegroundColor Gray
Write-Host "  - HTTPS" -ForegroundColor Gray
Write-Host "  - Login with a web browser" -ForegroundColor Gray
Write-Host "  - Quyen: repo (de tao release)" -ForegroundColor Gray
Write-Host ""
Write-Host "Sau khi dang nhap, build va release:" -ForegroundColor Yellow
Write-Host "  cd electron" -ForegroundColor White
Write-Host "  npm run build:win          # Chi build installer" -ForegroundColor White
Write-Host "  npm run release            # Test + build + tao GitHub Release (draft)" -ForegroundColor White
Write-Host ""
Write-Host "Hoac tu thu muc electron:" -ForegroundColor Yellow
Write-Host "  powershell -ExecutionPolicy Bypass -File scripts/release.ps1 -Notes `"Sua loi, them tinh nang`"" -ForegroundColor White
Write-Host "  powershell -ExecutionPolicy Bypass -File scripts/release.ps1 -Publish   # Publish ngay, khong de draft" -ForegroundColor White
