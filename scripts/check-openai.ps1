# EnjoyLife AI local repair. Never echo or upload OpenAI API key values.
param([switch]$CheckOnly)
$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$envPath = Join-Path $root ".env"
if (-not (Test-Path $envPath)) { throw "Missing .env in project root. Copy .env.example and enter OPENAI_API_KEY privately." }
$raw = [System.IO.File]::ReadAllText($envPath)
$hasKey = [regex]::IsMatch($raw, '(?m)^(?:OPENAI_API_KEY|AI_API_KEY)=[^\s#][^\r\n]*$')
if (-not $hasKey) {
  Write-Warning "Neither OPENAI_API_KEY nor legacy AI_API_KEY is configured in the local .env. No API key is printed or generated."
}
if (-not $CheckOnly) {
  # The legacy starter model is not a public OpenAI API model; replace only
  # that exact obsolete example value, preserving any intentional custom model.
  if ([regex]::IsMatch($raw, '(?m)^AI_MODEL=gpt-6-luna[ \t]*$')) {
    $raw = [regex]::Replace($raw,'(?m)^AI_MODEL=gpt-6-luna[ \t]*$','AI_MODEL=gpt-4.1-mini')
    [System.IO.File]::WriteAllText($envPath, $raw, [System.Text.UTF8Encoding]::new($false))
    Write-Host "Updated obsolete example AI_MODEL to gpt-4.1-mini. OPENAI_API_KEY unchanged." -ForegroundColor Green
  }
  Push-Location $root
  try {
    docker compose up -d --wait --wait-timeout 180 --force-recreate api
    if ($LASTEXITCODE -ne 0) { throw "API not healthy. Check: docker compose logs --tail=80 api" }
  } finally { Pop-Location }
}
$urls = @("http://localhost:8081/api/v1/ai/status","http://localhost:3000/api/store/ai/status")
foreach ($uri in $urls) {
  $result = $null
  for($attempt=0;$attempt -lt 12;$attempt++) {
    try {
      $result = Invoke-RestMethod -Uri $uri -TimeoutSec 8 -ErrorAction Stop
      break
    } catch {
      if($attempt -eq 11) { throw "Unable to reach $uri. Run: docker compose ps ; docker compose logs --tail=80 api web" }
      Start-Sleep -Seconds 3
    }
  }
  if ($null -eq $result.configured -or -not $result.model) { throw "Unexpected diagnostics response from $uri" }
  Write-Host ("Status on " + $uri + ": configured=" + $result.configured + "; model=" + $result.model)
  if ($result.model -eq "gpt-6-luna") {
    Write-Warning "Old unsupported AI model still active. Replace AI_MODEL in .env and recreate the API."
  }
  if (-not $result.configured) {
    Write-Warning "API key not loaded by the Go container. Check .env and restart the API."
  }
}
Write-Host "Configuration checks only: these do not verify OpenAI account billing, model permissions, or a live chat completion."
