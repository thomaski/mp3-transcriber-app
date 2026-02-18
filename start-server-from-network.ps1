# ============================================================================
# MP3 Transcriber Server Start (Shared Network Script)
# ============================================================================
# Dieses Skript kann vom Win7 Rechner aus ueber Netzwerk-Freigabe
# ausgefuehrt werden (wenn Schreibrechte vorhanden)
# ============================================================================

# Projekt-Pfad
$projectPath = "D:\Projekte\git\mp3-transcriber-app"

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  MP3 Transcriber Server - Start" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Pruefe ob Server bereits laeuft
Write-Host "Pruefe Server-Status..." -ForegroundColor Cyan
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue

if ($nodeProcesses) {
    Write-Host "  Server laeuft bereits!" -ForegroundColor Green
    Write-Host "  Anzahl Node-Prozesse: $($nodeProcesses.Count)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Server erreichbar unter:" -ForegroundColor Yellow
    Write-Host "  Local:   http://localhost:4000" -ForegroundColor Cyan
    Write-Host "  Network: http://192.168.178.20:4000" -ForegroundColor Cyan
} else {
    Write-Host "  Server laeuft nicht" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Starte Server..." -ForegroundColor Green
    
    Set-Location $projectPath
    
    # Starte Server in neuem Fenster
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectPath'; npm run dev" -WindowStyle Normal
    
    Write-Host ""
    Write-Host "Server wird gestartet..." -ForegroundColor Green
    Write-Host "Warte 10 Sekunden..." -ForegroundColor Gray
    Start-Sleep -Seconds 10
    
    Write-Host ""
    Write-Host "Server sollte jetzt erreichbar sein:" -ForegroundColor Yellow
    Write-Host "  Local:   http://localhost:4000" -ForegroundColor Cyan
    Write-Host "  Network: http://192.168.178.20:4000" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

Read-Host "Druecke Enter zum Beenden"
