# Start multiple servers on different ports
$ports = @(4321, 4322, 4323)

Write-Host "Starting BCPS Automation servers on multiple ports..." -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

foreach ($port in $ports) {
    Write-Host "`nStarting server on port $port..." -ForegroundColor Cyan
    $url = "http://localhost:$port"

    # Start new PowerShell window with the server
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; `$env:APP_PORT=$port; npm run app"

    Write-Host "Server starting on: $url" -ForegroundColor Yellow
    Start-Sleep -Seconds 2
}

Write-Host "`n================================================" -ForegroundColor Green
Write-Host "All servers started! Check the new windows above." -ForegroundColor Green
Write-Host "`nAccess URLs:" -ForegroundColor Green
foreach ($port in $ports) {
    Write-Host "  - http://localhost:$port" -ForegroundColor Cyan
}
