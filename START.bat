@echo off
setlocal
cd /d "%~dp0"
where docker >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Docker CLI not found. Install and open Docker Desktop first.
  pause
  exit /b 1
)
docker info >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Docker Engine is not running. Open Docker Desktop and retry.
  pause
  exit /b 1
)
if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo [INFO] Created .env from development example. Change secrets before any public deployment.
)
echo [INFO] Validating Docker Compose configuration...
docker compose config --quiet
if errorlevel 1 (
  echo [ERROR] Invalid Compose or .env configuration. Fix the reported values first.
  pause
  exit /b 1
)
echo [INFO] Building and starting Enjoy Life...
docker compose up --build --wait --wait-timeout 300
if errorlevel 1 (
  echo [ERROR] Compose failed. Container status and web startup log follow:
  docker compose ps
  docker compose logs --tail=120 web
  pause
  exit /b 1
)
echo.
echo Storefront: http://localhost:3000
echo Catalog:   http://localhost:3000/shop
echo API:       http://localhost:8081/api/v1/health
echo.
echo On first launch, image and dependency downloads require Internet.
start "" "http://localhost:3000"
pause
