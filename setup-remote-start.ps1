# ============================================================================
# Remote Start Setup fuer MP3 Transcriber App
# ============================================================================
# Dieses Skript richtet PowerShell Remoting ein, sodass der Server
# vom Win7 Rechner aus gestartet werden kann
#
# WICHTIG: Muss als Administrator ausgefuehrt werden!
#
# Usage: powershell -ExecutionPolicy Bypass -File setup-remote-start.ps1
# ============================================================================

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  MP3 Transcriber - Remote Start Setup" -ForegroundColor White
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

# Aktiviere PowerShell Remoting
Write-Host "Aktiviere PowerShell Remoting..." -ForegroundColor Cyan
try {
    Enable-PSRemoting -Force -SkipNetworkProfileCheck | Out-Null
    Write-Host "  PowerShell Remoting aktiviert" -ForegroundColor Green
} catch {
    Write-Host "  Warnung: $_" -ForegroundColor Yellow
}
Write-Host ""

# Erlaube Remoting im privaten Netzwerk
Write-Host "Konfiguriere WinRM fuer privates Netzwerk..." -ForegroundColor Cyan
try {
    Set-Item WSMan:\localhost\Client\TrustedHosts -Value "192.168.178.*" -Force
    Write-Host "  TrustedHosts konfiguriert (192.168.178.*)" -ForegroundColor Green
} catch {
    Write-Host "  Warnung: $_" -ForegroundColor Yellow
}
Write-Host ""

# Starte WinRM Service
Write-Host "Starte WinRM Service..." -ForegroundColor Cyan
try {
    Start-Service WinRM -ErrorAction SilentlyContinue
    Set-Service WinRM -StartupType Automatic
    Write-Host "  WinRM Service gestartet" -ForegroundColor Green
} catch {
    Write-Host "  Warnung: $_" -ForegroundColor Yellow
}
Write-Host ""

# Erstelle Remote-Start-Skript fuer Win7
Write-Host "Erstelle Remote-Start-Skript fuer Win7..." -ForegroundColor Cyan

$remoteStartScript = @'
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
'@

$scriptPath = "D:\Projekte\git\mp3-transcriber-app\remote-start-from-win7.ps1"
$remoteStartScript | Out-File -FilePath $scriptPath -Encoding UTF8 -Force
Write-Host "  Remote-Start-Skript erstellt: $scriptPath" -ForegroundColor Green
Write-Host ""

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  Setup abgeschlossen!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Naechste Schritte:" -ForegroundColor White
Write-Host ""
Write-Host "1. Kopiere das Skript auf den Win7 Rechner:" -ForegroundColor Yellow
Write-Host "   $scriptPath" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Auf dem Win7 Rechner ausfuehren:" -ForegroundColor Yellow
Write-Host "   powershell -ExecutionPolicy Bypass -File remote-start-from-win7.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Anmeldedaten eingeben (Win11 Benutzer + Passwort)" -ForegroundColor Yellow
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

Read-Host "Druecke Enter zum Beenden"
