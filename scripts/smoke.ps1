$ErrorActionPreference = 'Stop'
Write-Host '== Enjoy Life smoke tests ==' -ForegroundColor Cyan
$api = 'http://localhost:8081/api/v1'
Write-Host '[1] Containers'
docker compose ps
Write-Host '[2] Go API ready'
Invoke-RestMethod "$api/health" | ConvertTo-Json
Write-Host '[3] Catalog records'
$catalog = Invoke-RestMethod "$api/products"
if ($catalog.items.Count -lt 1) { throw 'Missing seeded catalog!' }
$catalog.items | Select-Object -First 4 name, slug, price_vnd | Format-Table
Write-Host '[4] Product variants'
$first = Invoke-RestMethod "$api/products/$($catalog.items[0].slug)"
if ($first.variants.Count -lt 1) { throw 'Missing product variants!' }
Write-Host "Variants: $($first.variants.Count)"
Write-Host '[5] Web page'
$page = Invoke-WebRequest 'http://localhost:3000/' -UseBasicParsing
if ($page.StatusCode -ne 200) { throw 'Storefront is not responding' }
Write-Host '[PASS] Storefront, API and database responded.' -ForegroundColor Green
Write-Host 'Checkout/payment are NOT tested by this smoke script.' -ForegroundColor Yellow
