# ==============================================================================
# Script di Esecuzione Test Automatici per .NET Archaeologist
# ==============================================================================
param(
    [string]$Configuration = "Debug",
    [switch]$Detailed = $false
)

$ErrorActionPreference = "Stop"

Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host " [NET Archaeologist] Avvio suite di test automatici xUnit" -ForegroundColor Cyan
Write-Host " Configurazione: $Configuration" -ForegroundColor DarkGray
Write-Host "==============================================================" -ForegroundColor Cyan

$verbosity = if ($Detailed) { "detailed" } else { "normal" }

try {
    dotnet test --configuration $Configuration --logger "console;verbosity=$verbosity"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Uno o piu test sono falliti (exit code: $LASTEXITCODE)."
        exit $LASTEXITCODE
    }

    Write-Host ""
    Write-Host ">> Tutti i test automatici sono stati eseguiti con successo! <<" -ForegroundColor Green
    Write-Host "==============================================================" -ForegroundColor Cyan
}
catch {
    Write-Error "Errore durante l'esecuzione dei test: $_"
    exit 1
}
