# Thiet lap GitHub CLI cho release
$ErrorActionPreference = "Stop"

Write-Host "=== Thiet lap GitHub CLI ===" -ForegroundColor Cyan

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Host "Dang cai GitHub CLI qua winget..." -ForegroundColor Yellow
  winget install --id GitHub.cli -e --accept-source-agreements --accept-package-agreements
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
Write-Host "  npm run build-win          # Chi build installer" -ForegroundColor White
Write-Host "  npm run release            # Build + tao GitHub Release" -ForegroundColor White
Write-Host ""
Write-Host "Hoac tu thu muc electron/scripts:" -ForegroundColor Yellow
Write-Host "  .\release.ps1 -Notes `"Sua loi, them tinh nang`"" -ForegroundColor White
