$ErrorActionPreference = "Stop"

$envPath = Join-Path $PSScriptRoot ".env"

if (Test-Path -LiteralPath $envPath) {
    Get-Content -LiteralPath $envPath | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) {
            return
        }

        $parts = $line -split "=", 2
        if ($parts.Count -eq 2) {
            [Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
        }
    }
}

if ($env:SUPABASE_DB_PASSWORD -eq "PON_AQUI_TU_PASSWORD_DE_SUPABASE") {
    Write-Host "Configura SUPABASE_DB_PASSWORD en .env antes de ejecutar." -ForegroundColor Yellow
    exit 1
}

.\mvnw.cmd spring-boot:run
