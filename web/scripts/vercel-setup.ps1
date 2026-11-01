# One-time Vercel setup for the web app. Run from web/ in YOUR terminal:
#   pwsh -File scripts/vercel-setup.ps1            (all steps)
#   pwsh -File scripts/vercel-setup.ps1 -From 4    (resume at step 4)
# Secrets never appear on screen: Supabase keys are piped from the Supabase CLI straight into
# the Vercel CLI, IP_HASH_SALT is generated, and keys you type are read as SecureString.
param([int]$From = 1)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

$ProjectRef = "ctmkkxfheqjdmjahkheu"
$SupabaseCli = "node node_modules/supabase/dist/supabase.js --workdir .."

function Set-VercelEnv([string]$Name, [string]$Value, [string[]]$Targets) {
  foreach ($t in $Targets) {
    vercel env rm $Name $t --yes 2>$null | Out-Null
    # NEXT_PUBLIC_* values are shipped to the browser anyway: store as config, the rest as secret.
    $type = if ($Name.StartsWith("NEXT_PUBLIC_")) { "config" } else { "secret" }
    # --yes: no "Git branch?" prompt (preview applies to all branches); without it a piped add is skipped.
    $Value | vercel env add $Name --environment $t --type $type --yes | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "vercel env add $Name $t failed" }
  }
  Write-Host "  set $Name -> $($Targets -join ', ')"
}

function Read-Secret([string]$Prompt) {
  $s = Read-Host -AsSecureString $Prompt
  [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
}

$both = @("production", "preview")
if ($From -le 1) {
Write-Host "1/4 Vercel login + link (browser opens)"
vercel whoami 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { vercel login }
vercel link --yes
if ($LASTEXITCODE -ne 0) { throw "vercel link failed" }

}
if ($From -le 2) {
Write-Host "2/4 Supabase keys (piped, not shown)"
$keys = Invoke-Expression "$SupabaseCli projects api-keys --project-ref $ProjectRef -o json" | ConvertFrom-Json
$anon = ($keys | Where-Object name -eq "anon").api_key
$service = ($keys | Where-Object name -eq "service_role").api_key
if (-not $anon -or -not $service) { throw "Could not read Supabase API keys (run: supabase login)" }
Set-VercelEnv "NEXT_PUBLIC_SUPABASE_URL" "https://$ProjectRef.supabase.co" $both
Set-VercelEnv "NEXT_PUBLIC_SUPABASE_ANON_KEY" $anon $both
Set-VercelEnv "SUPABASE_SERVICE_ROLE_KEY" $service $both
Remove-Variable anon, service, keys

}
if ($From -le 3) {
Write-Host "3/4 Generated + site settings"
$salt = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
Set-VercelEnv "IP_HASH_SALT" $salt $both
# jsdom (isomorphic-dompurify) require()s an ES module; Vercel's Node 22 needs this flag for it.
Set-VercelEnv "NODE_OPTIONS" "--experimental-require-module" $both
Remove-Variable salt
$site = Read-Host "Site URL (vd https://bangkeo.vn, Enter = bo qua, dat sau khi gan domain)"
if ($site) { Set-VercelEnv "NEXT_PUBLIC_SITE_URL" $site.TrimEnd("/") @("production") }
$notify = Read-Host "Email nhan thong bao don moi (cach nhau dau phay, Enter = bo qua)"
if ($notify) { Set-VercelEnv "ADMIN_NOTIFY_EMAILS" $notify $both }

}
Write-Host "4/4 Turnstile + Resend"
# Preview deployments may use Cloudflare's always-pass test keys; production refuses them.
Set-VercelEnv "NEXT_PUBLIC_TURNSTILE_SITE_KEY" "1x00000000000000000000AA" @("preview")
Set-VercelEnv "TURNSTILE_SECRET_KEY" "1x0000000000000000000000000000000AA" @("preview")
$tsSite = Read-Host "Turnstile SITE key that (Enter = bo qua, production chua chay duoc)"
if ($tsSite) {
  Set-VercelEnv "NEXT_PUBLIC_TURNSTILE_SITE_KEY" $tsSite @("production")
  Set-VercelEnv "TURNSTILE_SECRET_KEY" (Read-Secret "Turnstile SECRET key") @("production")
}
$resend = Read-Secret "Resend API key (Enter = bo qua, email chi ghi log)"
if ($resend) {
  Set-VercelEnv "RESEND_API_KEY" $resend $both
  $from = Read-Host "EMAIL_FROM (vd: Bang Keo <no-reply@bangkeo.vn>)"
  if ($from) { Set-VercelEnv "EMAIL_FROM" $from $both }
}
Remove-Variable resend -ErrorAction SilentlyContinue

vercel env ls preview
Write-Host "Xong. Deploy thu (preview): vercel deploy"
