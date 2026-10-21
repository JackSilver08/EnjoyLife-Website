$ErrorActionPreference = 'Continue'
Write-Host '== Enjoy Life prerequisite check ==' -ForegroundColor Cyan
$commands = @('docker', 'git', 'node', 'npm', 'go')
foreach ($name in $commands) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if ($cmd) { Write-Host "[OK] $name : $($cmd.Source)" }
  else { Write-Host "[MISSING] $name" -ForegroundColor Yellow }
}
if (Get-Command docker -ErrorAction SilentlyContinue) {
  docker version --format 'Docker client: {{.Client.Version}} | Engine: {{.Server.Version}}'
  docker compose version
}
Write-Host 'Docker Desktop is sufficient to run the complete development stack; local Node/Go are optional.'
