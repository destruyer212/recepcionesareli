$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$apiDir = Join-Path $root "areli-api"
$webDir = Join-Path $root "areli-web"

function Stop-Port($port) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($connection in $connections) {
        Stop-Process -Id $connection.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

Stop-Port 8083
Stop-Port 5173

Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c .\mvnw.cmd spring-boot:run" `
    -WorkingDirectory $apiDir `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $apiDir "areli-api-8083.out.log") `
    -RedirectStandardError (Join-Path $apiDir "areli-api-8083.err.log")

Start-Sleep -Seconds 3

Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c npm run dev -- --host localhost --port 5173" `
    -WorkingDirectory $webDir `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $webDir "areli-web-5173.out.log") `
    -RedirectStandardError (Join-Path $webDir "areli-web-5173.err.log")

Write-Host "Backend:  http://localhost:8083/api/health"
Write-Host "Frontend: http://localhost:5173 (tambien http://127.0.0.1:5173 si CORS lo permite)"
