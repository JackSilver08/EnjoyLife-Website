# Configure a private local payOS payment channel for EnjoyLife.
# Credentials are entered in a masked terminal prompt and never pushed to Git.
param([switch]$NoRestart)
$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$envPath = Join-Path $root ".env"
$examplePath = Join-Path $root ".env.example"
if (-not (Test-Path $envPath)) {
  if (-not (Test-Path $examplePath)) { throw "Missing .env.example. Run this script from a full repository checkout." }
  Copy-Item $examplePath $envPath
}
Write-Host ""
Write-Host "EnjoyLife payOS local setup" -ForegroundColor Cyan
Write-Host "Your keys stay in the local git-ignored .env file, not GitHub."
Write-Warning "Enabling payOS may create real payment links. localhost does NOT receive public payOS webhooks."
Write-Host "Only use a real checkout after you verify the amount and payment reconciliation."
$approval = Read-Host "Type ENABLE to configure this local API for payOS (anything else cancels)"
if ($approval -cne "ENABLE") { Write-Host "No changes made."; exit 0 }

function Read-Secret([string]$label) {
  $secret = Read-Host $label -AsSecureString
  $value = [System.Net.NetworkCredential]::new("", $secret).Password
  if ([string]::IsNullOrWhiteSpace($value) -or $value -match "[\r\n]") { throw "Value for $label cannot be empty or contain line breaks." }
  return $value
}
$client = Read-Secret "payOS Client ID (hidden)"
$api = Read-Secret "payOS API Key (hidden)"
$checksum = Read-Secret "payOS Checksum Key (hidden)"
if ($client -notmatch '^[a-fA-F0-9-]{36}$') { throw "Invalid Client ID format." }
if ($checksum.Length -lt 32) { throw "Checksum key is too short." }

$raw = [System.IO.File]::ReadAllText($envPath)
$raw = $raw.Replace("`r`n","`n")
function Set-Env([string]$source,[string]$key,[string]$value) {
  $pattern = "(?m)^" + [regex]::Escape($key) + "=.*$"
  $line = "$key=$value"
  if ([regex]::IsMatch($source,$pattern)) { return [regex]::Replace($source,$pattern,[System.Text.RegularExpressions.MatchEvaluator]{param($m) $line}) }
  return $source.TrimEnd("`n") + "`n" + $line + "`n"
}
$raw = Set-Env $raw "PAYOS_CLIENT_ID" $client
$raw = Set-Env $raw "PAYOS_API_KEY" $api
$raw = Set-Env $raw "PAYOS_CHECKSUM_KEY" $checksum
$raw = Set-Env $raw "WEB_ORIGIN" "http://localhost:3000"
$raw = Set-Env $raw "PAYMENT_ENABLED" "true"
[System.IO.File]::WriteAllText($envPath,$raw.TrimEnd("`n")+"`n",[System.Text.UTF8Encoding]::new($false))
$client = $api = $checksum = $null
Write-Host "Saved private configuration in .env (values hidden)." -ForegroundColor Green

if (-not $NoRestart) {
  Push-Location $root
  try {
    docker compose up -d --build --force-recreate api
    if ($LASTEXITCODE -ne 0) { throw "Docker API restart failed. Check Docker Desktop and run: docker compose logs --tail=100 api" }
    Write-Host "Restarted API. Checking non-sensitive gateway readiness..." -ForegroundColor Cyan
    $result = Invoke-RestMethod "http://localhost:3000/api/store/payments/config" -TimeoutSec 20
    if ($result.payos_enabled) {
      Write-Host "payOS enabled. Reopen the Checkout page." -ForegroundColor Green
    } else {
      Write-Warning ("payOS remains unavailable; status: " + $result.status + ". Confirm the web container is running and has loaded the API.")
    }
  } finally { Pop-Location }
} else {
  Write-Host "Run: docker compose up -d --force-recreate api"
}
Write-Host "When hosting publicly, update WEB_ORIGIN to your HTTPS domain and register its payOS webhook."
