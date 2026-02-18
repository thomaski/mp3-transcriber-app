# ============================================================================
# Autostart Setup fuer MP3 Transcriber App
# ============================================================================
# Dieses Skript erstellt eine geplante Aufgabe, die den Server automatisch
# beim Systemstart startet
#
# WICHTIG: Muss als Administrator ausgefuehrt werden!
#
# Usage: powershell -ExecutionPolicy Bypass -File setup-autostart.ps1
# ============================================================================

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  MP3 Transcriber - Autostart Setup" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Pruefe Admin-Rechte
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "FEHLER: Dieses Skript muss als Administrator ausgefuehrt werden!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Bitte:" -ForegroundColor Yellow
    Write-Host "  1. Rechtsklick auf PowerShell" -ForegroundColor Yellow
    Write-Host "  2. Als Administrator ausfuehren" -ForegroundColor Yellow
    Write-Host "  3. Skript erneut ausfuehren" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Druecke Enter zum Beenden"
    exit 1
}

Write-Host "Admin-Rechte erkannt" -ForegroundColor Green
Write-Host ""

# Projekt-Pfad
$projectPath = "D:\Projekte\git\mp3-transcriber-app"
$taskName = "MP3 Transcriber Server"

# Pruefe ob Node.js installiert ist
Write-Host "Pruefe Node.js Installation..." -ForegroundColor Cyan
try {
    $nodeVersion = node --version
    Write-Host "  Node.js gefunden: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  FEHLER: Node.js nicht gefunden!" -ForegroundColor Red
    Write-Host "  Bitte installiere Node.js zuerst." -ForegroundColor Yellow
    Read-Host "Druecke Enter zum Beenden"
    exit 1
}
Write-Host ""

# Entferne alte Aufgabe falls vorhanden
Write-Host "Pruefe auf existierende Aufgabe..." -ForegroundColor Cyan
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if ($existingTask) {
    Write-Host "  Alte Aufgabe gefunden, entferne sie..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "  Alte Aufgabe entfernt" -ForegroundColor Green
} else {
    Write-Host "  Keine alte Aufgabe gefunden" -ForegroundColor Gray
}
Write-Host ""

# Erstelle Start-Skript
Write-Host "Erstelle Start-Skript..." -ForegroundColor Cyan
$startScript = @"
# MP3 Transcriber Server Auto-Start
Set-Location "$projectPath"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Normal
"@

$startScriptPath = Join-Path $projectPath "start-server-autostart.ps1"
$startScript | Out-File -FilePath $startScriptPath -Encoding UTF8 -Force
Write-Host "  Start-Skript erstellt: $startScriptPath" -ForegroundColor Green
Write-Host ""

# Erstelle geplante Aufgabe
Write-Host "Erstelle geplante Aufgabe..." -ForegroundColor Cyan

# Action: PowerShell ausfuehren mit Start-Skript
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$startScriptPath`""

# Trigger: Beim Anmelden
$trigger = New-ScheduledTaskTrigger -AtLogOn

# Principal: Als aktueller Benutzer mit hoechsten Rechten
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Highest

# Settings
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Registriere Aufgabe
try {
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Startet den MP3 Transcriber Server automatisch beim Anmelden" | Out-Null
    Write-Host "  Geplante Aufgabe erfolgreich erstellt!" -ForegroundColor Green
} catch {
    Write-Host "  FEHLER beim Erstellen der Aufgabe: $_" -ForegroundColor Red
    Read-Host "Druecke Enter zum Beenden"
    exit 1
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  Autostart-Setup abgeschlossen!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Zeige erstellte Aufgabe
Write-Host "Erstellte Aufgabe:" -ForegroundColor White
Write-Host ""
Get-ScheduledTask -TaskName $taskName | Select-Object TaskName, State, @{Name="NextRunTime";Expression={($_ | Get-ScheduledTaskInfo).NextRunTime}} | Format-Table -AutoSize

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  Informationen:" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Der Server wird automatisch gestartet:" -ForegroundColor Yellow
Write-Host "    - Beim Anmelden am Win11 Rechner" -ForegroundColor Gray
Write-Host ""
Write-Host "  Manuell starten:" -ForegroundColor Yellow
Write-Host "    Start-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
Write-Host ""
Write-Host "  Manuell stoppen:" -ForegroundColor Yellow
Write-Host "    Stop-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
Write-Host ""
Write-Host "  Aufgabe entfernen:" -ForegroundColor Yellow
Write-Host "    Unregister-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Frage ob Aufgabe jetzt gestartet werden soll
Write-Host "Moechtest du den Server jetzt starten? (J/N): " -NoNewline -ForegroundColor Yellow
$response = Read-Host

if ($response -eq "J" -or $response -eq "j" -or $response -eq "Y" -or $response -eq "y") {
    Write-Host ""
    Write-Host "Starte Server..." -ForegroundColor Cyan
    Start-ScheduledTask -TaskName $taskName
    Start-Sleep -Seconds 2
    Write-Host "Server wurde gestartet!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Pruefe Status in 5 Sekunden..." -ForegroundColor Gray
    Start-Sleep -Seconds 5
    
    Write-Host ""
    Write-Host "  Local:      http://localhost:4000" -ForegroundColor Cyan
    Write-Host "  Network:    http://192.168.178.20:4000" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  Setup abgeschlossen!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

Read-Host "Druecke Enter zum Beenden"
