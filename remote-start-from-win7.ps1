# ============================================================================
# MP3 Transcriber Server Remote Start (von Win7 aus)
# ============================================================================
# Dieses Skript startet den MP3 Transcriber Server auf dem Win11 Rechner
# von deinem Win7 Rechner aus
# ============================================================================

$win11Computer = "192.168.178.20"
$credential = Get-Credential -Message "Gib die Anmeldedaten fuer den Win11 Rechner ein"

Write-Host ""
Write-Host "Verbinde mit $win11Computer..." -ForegroundColor Cyan

try {
    Invoke-Command -ComputerName $win11Computer -Credential $credential -ScriptBlock {
        Set-Location "D:\Projekte\git\mp3-transcriber-app"
        
        # Pruefe ob Server bereits laeuft
        $nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
        
        if ($nodeProcesses) {
            Write-Host "Server laeuft bereits!" -ForegroundColor Yellow
        } else {
            Write-Host "Starte Server..." -ForegroundColor Green
            Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd D:\Projekte\git\mp3-transcriber-app; npm run dev" -WindowStyle Normal
            Write-Host "Server gestartet!" -ForegroundColor Green
        }
    }
    
    Write-Host ""
    Write-Host "Fertig! Server sollte jetzt erreichbar sein:" -ForegroundColor Green
    Write-Host "  http://192.168.178.20:4000" -ForegroundColor Cyan
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "FEHLER: $_" -ForegroundColor Red
    Write-Host ""
}

Read-Host "Druecke Enter zum Beenden"
