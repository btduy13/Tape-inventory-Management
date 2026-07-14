# Build installer NSIS và tạo GitHub Release bằng gh CLI
param(
  [string]$Version = "",
  [string]$Notes = "",
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$ElectronDir = Split-Path $PSScriptRoot -Parent
$RepoRoot = Split-Path $ElectronDir -Parent

function Get-PackageVersion {
  $pkg = Get-Content (Join-Path $ElectronDir "package.json") -Raw | ConvertFrom-Json
  return [string]$pkg.version
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Host "Chua cai GitHub CLI. Chay: winget install GitHub.cli" -ForegroundColor Red
  exit 1
}

$authStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "Chua dang nhap GitHub. Chay: gh auth login" -ForegroundColor Yellow
  Write-Host $authStatus
  exit 1
}

if (-not $Version) {
  $Version = Get-PackageVersion
}

$tag = "v$Version"
$distDir = Join-Path $ElectronDir "dist-installer"

if (-not $SkipBuild) {
  Write-Host "Dang build installer v$Version ..." -ForegroundColor Cyan
  Push-Location $ElectronDir
  npm run build-win
  if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
  Pop-Location
}

if (-not (Test-Path $distDir)) {
  Write-Host "Khong tim thay thu muc: $distDir" -ForegroundColor Red
  exit 1
}

$installer = Get-ChildItem $distDir -Filter "*.exe" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
$latestYml = Join-Path $distDir "latest.yml"

if (-not $installer) {
  Write-Host "Khong tim thay file .exe trong $distDir" -ForegroundColor Red
  exit 1
}

$assets = @($installer.FullName)
if (Test-Path $latestYml) {
  $assets += $latestYml
}

Write-Host "Installer: $($installer.Name)" -ForegroundColor Green
if (Test-Path $latestYml) { Write-Host "Metadata: latest.yml" -ForegroundColor Green }

$existing = gh release view $tag 2>$null
if ($LASTEXITCODE -eq 0) {
  Write-Host "Release $tag da ton tai. Dang upload them asset..." -ForegroundColor Yellow
  foreach ($asset in $assets) {
    gh release upload $tag $asset --clobber
  }
} else {
  if (-not $Notes) {
    $Notes = "Phien ban $Version - Quan ly Don hang Bang Keo (Electron)"
  }
  gh release create $tag $assets `
    --repo "btduy13/Tape-inventory-Management" `
    --title "Quan ly Bang Keo v$Version" `
    --notes $Notes
}

if ($LASTEXITCODE -ne 0) {
  Write-Host "Loi khi tao/upload release." -ForegroundColor Red
  exit $LASTEXITCODE
}

$url = "https://github.com/btduy13/Tape-inventory-Management/releases/tag/$tag"
Write-Host ""
Write-Host "Hoan thanh!" -ForegroundColor Green
Write-Host "Link release: $url"
Write-Host "Link tai installer: https://github.com/btduy13/Tape-inventory-Management/releases/download/$tag/$($installer.Name)"
