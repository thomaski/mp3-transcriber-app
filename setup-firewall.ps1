# ============================================================================
# Windows Firewall Konfiguration fuer MP3 Transcriber App
# ============================================================================
# Dieses Skript erstellt Firewall-Regeln fuer den Netzwerk-Zugriff
#
# WICHTIG: Muss als Administrator ausgefuehrt werden!
#
# Usage: powershell -ExecutionPolicy Bypass -File setup-firewall.ps1
# ============================================================================

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  MP3 Transcriber - Firewall Setup" -ForegroundColor White
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

# Entferne alte Regeln falls vorhanden
Write-Host "Pruefe auf existierende Regeln..." -ForegroundColor Cyan
$existingRules = Get-NetFirewallRule -DisplayName "*MP3 Transcriber*" -ErrorAction SilentlyContinue

if ($existingRules) {
    Write-Host "Alte Regeln gefunden, entferne sie..." -ForegroundColor Yellow
    $existingRules | Remove-NetFirewallRule
    Write-Host "Alte Regeln entfernt" -ForegroundColor Green
} else {
    Write-Host "Keine alten Regeln gefunden" -ForegroundColor Gray
}
Write-Host ""

# Erstelle neue Firewall-Regeln
Write-Host "Erstelle Firewall-Regeln..." -ForegroundColor Cyan
Write-Host ""

# Port 3000 - React Frontend
Write-Host "  Port 3000 (React Frontend)..." -NoNewline
try {
    New-NetFirewallRule -DisplayName "MP3 Transcriber Frontend (Port 3000)" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -Profile Private -Description "Erlaubt Zugriff auf das React Frontend der MP3 Transcriber App im lokalen Netzwerk" -ErrorAction Stop | Out-Null
    Write-Host " OK" -ForegroundColor Green
} catch {
    Write-Host " FEHLER" -ForegroundColor Red
    Write-Host "    $_" -ForegroundColor Red
}

# Port 5000 - Backend API
Write-Host "  Port 5000 (Backend API)..." -NoNewline
try {
    New-NetFirewallRule -DisplayName "MP3 Transcriber Backend (Port 5000)" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow -Profile Private -Description "Erlaubt Zugriff auf das Backend API der MP3 Transcriber App im lokalen Netzwerk" -ErrorAction Stop | Out-Null
    Write-Host " OK" -ForegroundColor Green
} catch {
    Write-Host " FEHLER" -ForegroundColor Red
    Write-Host "    $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  Firewall-Setup abgeschlossen!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Zeige erstellte Regeln
Write-Host "Erstellte Firewall-Regeln:" -ForegroundColor White
Write-Host ""
Get-NetFirewallRule -DisplayName "*MP3 Transcriber*" | Select-Object DisplayName, Enabled, Direction, Action, Profile | Format-Table -AutoSize

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  Naechste Schritte:" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Starte den Server: npm run dev" -ForegroundColor Yellow
Write-Host "  2. Oeffne im Browser (Win7): http://192.168.178.20:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

Read-Host "Druecke Enter zum Beenden"
