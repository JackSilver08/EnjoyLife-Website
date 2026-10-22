# Configure a private local payOS payment channel for EnjoyLife.
# Credentials are entered in a masked terminal prompt and never pushed to Git.
param([switch]$NoRestart,[switch]$CheckOnly)
$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$envPath = Join-Path $root ".env"
$examplePath = Join-Path $root ".env.example"
function Read-GatewayStatus([string]$uri,[string]$label,[int]$attempts) {
  $lastError = ""
  for ($n=1; $n -le $attempts; $n++) {
    try {
      $data = Invoke-RestMethod -Uri $uri -TimeoutSec 8 -ErrorAction Stop
      if ($null -eq $data -or $null -eq $data.payos_enabled -or -not $data.status) {
        throw "Gateway returned no payment readiness status."
      }
      return $data
    } catch {
      $lastError = $_.Exception.Message
      if ($n -lt $attempts) { Start-Sleep -Seconds 3 }
    }
  }
  throw "$label was not ready after $attempts checks. Last error: $lastError"
}

if (-not $CheckOnly) {
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

} elseif (-not (Test-Path $envPath)) {
  throw "Private local .env is missing. Run the script without -CheckOnly first."
}
Push-Location $root
try {
  if (-not $CheckOnly -and -not $NoRestart) {
    Write-Host "Restarting and waiting for API Docker HEALTHY state..." -ForegroundColor Cyan
    docker compose up -d --build --force-recreate --wait --wait-timeout 180 api
    if ($LASTEXITCODE -ne 0) {
      throw "API healthcheck failed. Run: docker compose ps ; docker compose logs --tail=80 api"
    }
  } elseif ($NoRestart -and -not $CheckOnly) {
    Write-Host "Saved keys, restart API with: docker compose up -d --wait --force-recreate api"
    Write-Host "Then verify without re-entering keys: .\scripts\configure-payos.ps1 -CheckOnly"
    exit 0
  }
  Write-Host "Checking direct Go API (localhost:8081)..." -ForegroundColor Cyan
  try {
    $apiStatus = Read-GatewayStatus "http://localhost:8081/api/v1/payments/config" "Go API" 12
  } catch {
    Write-Warning $_.Exception.Message
    throw "API not available. Run: docker compose ps ; docker compose logs --tail=80 api"
  }
  Write-Host ("API payment status: " + $apiStatus.status)
  Write-Host "Checking Next.js proxy (localhost:3000)..." -ForegroundColor Cyan
  try {
    $webStatus = Read-GatewayStatus "http://localhost:3000/api/store/payments/config" "Website proxy" 15
  } catch {
    Write-Warning $_.Exception.Message
    throw "API is responding but website proxy is not. Run: docker compose up -d --wait web ; docker compose logs --tail=80 web"
  }
  if ($apiStatus.status -ne $webStatus.status -or $apiStatus.payos_enabled -ne $webStatus.payos_enabled) {
    throw "API and website report different payment states. Check Docker Compose services."
  }
  Write-Host ("Website payment status: " + $webStatus.status)
  if ($webStatus.payos_enabled) {
    Write-Host "payOS configuration enabled in API and website. Refresh Checkout." -ForegroundColor Green
    Write-Host "Configuration enabled does not verify merchant credentials or a bank transfer."
  } else {
    Write-Warning ("payOS not enabled, status: " + $webStatus.status + ". Check your private .env and restart API.")
  }
} finally {
  Pop-Location
}
Write-Host "Public payOS webhooks require an HTTPS domain, not localhost."
