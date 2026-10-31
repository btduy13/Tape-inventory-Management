# Build installer NSIS va tao GitHub Release (draft) bang gh CLI
#
# Cach dung (tu thu muc electron):
#   npm run release
#   powershell -ExecutionPolicy Bypass -File scripts/release.ps1 -Notes "Sua loi..."
#   powershell -ExecutionPolicy Bypass -File scripts/release.ps1 -Publish
#
# Tham so:
#   -Version   Phai trung voi "version" trong package.json (bo trong = lay tu package.json)
#   -Notes     Ghi chu release
#   -SkipBuild Dung lai installer da build trong dist-installer
#   -Force     Bo qua kiem tra git tree sach
#   -Publish   Publish release ngay sau khi upload (mac dinh: de o dang draft)
param(
  [string]$Version = "",
  [string]$Notes = "",
  [switch]$SkipBuild,
  [switch]$Force,
  [switch]$Publish
)

$ErrorActionPreference = "Stop"
$ElectronDir = Split-Path $PSScriptRoot -Parent
$Repo = "btduy13/Tape-inventory-Management"

function Get-PackageVersion {
  $pkg = Get-Content (Join-Path $ElectronDir "package.json") -Raw | ConvertFrom-Json
  return [string]$pkg.version
}

function Fail([string]$Message, [int]$Code = 1) {
  Write-Host $Message -ForegroundColor Red
  exit $Code
}

# Chay lenh native ma khong de stderr lam dung script (ErrorActionPreference = Stop)
function Invoke-Native([scriptblock]$Command) {
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    & $Command
  } finally {
    $ErrorActionPreference = $prev
  }
}

# --- 1. gh CLI + dang nhap ---
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Fail "Chua cai GitHub CLI. Chay: powershell -ExecutionPolicy Bypass -File scripts/setup-gh.ps1"
}

$authStatus = Invoke-Native { gh auth status 2>&1 }
if ($LASTEXITCODE -ne 0) {
  Write-Host "Chua dang nhap GitHub. Chay: gh auth login" -ForegroundColor Yellow
  Write-Host ($authStatus | Out-String)
  exit 1
}

# --- 2. Version ---
$pkgVersion = Get-PackageVersion
if (-not $Version) {
  $Version = $pkgVersion
} elseif ($Version -ne $pkgVersion) {
  Fail "-Version $Version khac version trong package.json ($pkgVersion). Sua package.json truoc khi release."
}

$tag = "v$Version"
$distDir = Join-Path $ElectronDir "dist-installer"
$unpackedDir = Join-Path $distDir "win-unpacked"
$bundledConfig = Join-Path $unpackedDir "resources\config.local.json"

# --- 3. Git tree sach (chi file tracked trong electron/) ---
$dirty = Invoke-Native { git -C $ElectronDir status --porcelain --untracked-files=no -- . 2>&1 }
if ($LASTEXITCODE -ne 0) {
  Fail "Khong doc duoc trang thai git: $($dirty | Out-String)"
}
if ($dirty) {
  Write-Host "Co thay doi chua commit trong electron/:" -ForegroundColor Yellow
  Write-Host ($dirty | Out-String)
  if (-not $Force) {
    Fail "Hay commit/stash truoc khi release (hoac chay lai voi -Force)."
  }
  Write-Host "Tiep tuc vi co -Force." -ForegroundColor Yellow
}

# --- 4. Test + kiem tra cu phap ---
Push-Location $ElectronDir
try {
  Write-Host "Dang chay npm test ..." -ForegroundColor Cyan
  Invoke-Native { npm test }
  if ($LASTEXITCODE -ne 0) { Fail "npm test that bai." $LASTEXITCODE }

  Write-Host "Dang chay npm run check ..." -ForegroundColor Cyan
  Invoke-Native { npm run check }
  if ($LASTEXITCODE -ne 0) { Fail "npm run check that bai." $LASTEXITCODE }

  # --- 5. Build ---
  if (-not $SkipBuild) {
    # Xoa win-unpacked cu de khong bao gio ship lai resources/config.local.json cu
    if (Test-Path $unpackedDir) {
      Write-Host "Xoa thu muc build cu: $unpackedDir" -ForegroundColor Gray
      Remove-Item -LiteralPath $unpackedDir -Recurse -Force
    }
    Write-Host "Dang build installer v$Version ..." -ForegroundColor Cyan
    Invoke-Native { npm run build:win }
    if ($LASTEXITCODE -ne 0) { Fail "Build that bai." $LASTEXITCODE }
  }
} finally {
  Pop-Location
}

# --- 6. Kiem tra artifact ---
if (-not (Test-Path $distDir)) {
  Fail "Khong tim thay thu muc: $distDir"
}

# Chi kiem tra su ton tai, KHONG doc noi dung file cau hinh
if (Test-Path -LiteralPath $bundledConfig) {
  Fail "NGUY HIEM: $bundledConfig ton tai trong ban build. Khong release. Xoa dist-installer/win-unpacked va build lai."
}

$installerName = "BangKeo_VinhThinh_Setup_$Version.exe"
$installerPath = Join-Path $distDir $installerName
$blockmapPath = "$installerPath.blockmap"
$latestYml = Join-Path $distDir "latest.yml"

if (-not (Test-Path -LiteralPath $installerPath)) { Fail "Khong tim thay installer: $installerPath" }
if (-not (Test-Path -LiteralPath $blockmapPath)) { Fail "Khong tim thay blockmap: $blockmapPath" }
if (-not (Test-Path -LiteralPath $latestYml)) { Fail "Khong tim thay latest.yml (bat buoc cho auto-update): $latestYml" }

$ymlVersionLine = Select-String -LiteralPath $latestYml -Pattern '^version:\s*(.+?)\s*$' | Select-Object -First 1
if (-not $ymlVersionLine) { Fail "latest.yml khong co dong version." }
$ymlVersion = $ymlVersionLine.Matches[0].Groups[1].Value.Trim("'`"")
if ($ymlVersion -ne $Version) {
  Fail "latest.yml co version $ymlVersion, khac $Version. Build lai truoc khi release."
}

Write-Host "Installer: $installerName" -ForegroundColor Green
Write-Host "Blockmap:  $(Split-Path $blockmapPath -Leaf)" -ForegroundColor Green
Write-Host "Metadata:  latest.yml (version $ymlVersion)" -ForegroundColor Green

# --- 7. Tao release draft (neu chua co) ---
Invoke-Native { gh release view $tag --repo $Repo 2>$null | Out-Null }
$releaseExists = ($LASTEXITCODE -eq 0)

if ($releaseExists) {
  Write-Host "Release $tag da ton tai. Dang upload (ghi de) asset..." -ForegroundColor Yellow
} else {
  if (-not $Notes) {
    $Notes = "Phien ban $Version - Quan ly Don hang Bang Keo (Electron)"
  }
  Write-Host "Dang tao release draft $tag ..." -ForegroundColor Cyan
  Invoke-Native {
    gh release create $tag --repo $Repo --draft --title "Quan ly Bang Keo v$Version" --notes $Notes
  }
  if ($LASTEXITCODE -ne 0) { Fail "Loi khi tao release $tag." $LASTEXITCODE }
}

# --- 8. Upload: exe + blockmap truoc, latest.yml cuoi cung ---
foreach ($asset in @($installerPath, $blockmapPath)) {
  Write-Host "Upload $(Split-Path $asset -Leaf) ..." -ForegroundColor Cyan
  Invoke-Native { gh release upload $tag $asset --repo $Repo --clobber }
  if ($LASTEXITCODE -ne 0) {
    Fail "Loi upload $(Split-Path $asset -Leaf). Chua upload latest.yml de tranh client cap nhat loi." $LASTEXITCODE
  }
}

Write-Host "Upload latest.yml ..." -ForegroundColor Cyan
Invoke-Native { gh release upload $tag $latestYml --repo $Repo --clobber }
if ($LASTEXITCODE -ne 0) { Fail "Loi upload latest.yml." $LASTEXITCODE }

# --- 9. Publish (tuy chon) ---
if ($Publish) {
  Write-Host "Dang publish release $tag ..." -ForegroundColor Cyan
  Invoke-Native { gh release edit $tag --repo $Repo --draft=false --latest }
  if ($LASTEXITCODE -ne 0) { Fail "Loi khi publish release $tag." $LASTEXITCODE }
}

$url = "https://github.com/$Repo/releases/tag/$tag"
Write-Host ""
Write-Host "Hoan thanh!" -ForegroundColor Green
if ($Publish) {
  Write-Host "Release da publish: $url"
  Write-Host "Link tai installer: https://github.com/$Repo/releases/download/$tag/$installerName"
} else {
  Write-Host "Release dang o dang DRAFT (nguoi dung chua nhan duoc cap nhat)." -ForegroundColor Yellow
  Write-Host "Buoc tiep theo:" -ForegroundColor Yellow
  Write-Host "  1. Tai installer tu draft tren GitHub, cai thu va kiem tra."
  Write-Host "  2. Publish khi da on:"
  Write-Host "     gh release edit $tag --repo $Repo --draft=false --latest" -ForegroundColor White
  Write-Host "     (hoac mo https://github.com/$Repo/releases va bam Publish release)"
}
