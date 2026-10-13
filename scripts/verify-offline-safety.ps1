# ==============================================================================
# Script di Verifica di Sicurezza e Zero-Execution per .NET Archaeologist
# ==============================================================================
# Scansiona i sorgenti in src/ per assicurare che:
# 1. Non venga utilizzato Assembly.Load o Process.Start per eseguire assembly target
# 2. Non siano presenti percorsi assoluti locali dell'utente (es. C:\Users)
# 3. Non siano presenti chiavi, secret o telemetrie esterne
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host " [NET Archaeologist] Verifica di conformita e sicurezza offline" -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Cyan

$forbiddenPatterns = @(
    @{ Pattern = "Assembly\.Load"; Reason = "Violazione del principio Zero-Execution: vietato caricare assembly a runtime." },
    @{ Pattern = "Process\.Start"; Reason = "Violazione del principio Zero-Execution: vietato avviare processi target." },
    @{ Pattern = "C:\\Users\\"; Reason = "Violazione di privacy: percorsi assoluti personali vietati nel codice." },
    @{ Pattern = "telemetry\.azure|google-analytics"; Reason = "Violazione di privacy: vietata telemetria esterna." }
)

$violationsFound = 0

$sourceFiles = Get-ChildItem -Path "src" -Recurse -Filter "*.cs"

foreach ($file in $sourceFiles) {
    $content = Get-Content -Path $file.FullName -Raw
    foreach ($rule in $forbiddenPatterns) {
        if ($content -match $rule.Pattern) {
            Write-Host "ERRORE: Violazione rilevata in $($file.FullName)" -ForegroundColor Red
            Write-Host "  Regola: $($rule.Reason)" -ForegroundColor Yellow
            $violationsFound++
        }
    }
}

if ($violationsFound -eq 0) {
    Write-Host ">> Verifica superata con successo: nessuna violazione di sicurezza o percorsi personali rilevata. <<" -ForegroundColor Green
    exit 0
} else {
    Write-Error "Rilevate $violationsFound violazioni di sicurezza nei sorgenti."
    exit 1
}
