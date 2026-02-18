# Start Script für Cloudflare Tunnel

Write-Host "`n" -NoNewline
Write-Host "═" * 80 -ForegroundColor Cyan
Write-Host "  ☁️  MP3 Transcriber - Cloudflare Tunnel Setup" -ForegroundColor Yellow
Write-Host "═" * 80 -ForegroundColor Cyan

# Schritt 1: Prüfe ob cloudflared installiert ist
Write-Host "`n[1/4] Prüfe Cloudflare Installation..." -ForegroundColor Green

$cfInstalled = Get-Command cloudflared -ErrorAction SilentlyContinue
if (!$cfInstalled) {
    Write-Host "      ⚠️  cloudflared ist nicht installiert!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "      Bitte installieren Sie cloudflared:" -ForegroundColor Red
    Write-Host ""
    Write-Host "      winget install --id Cloudflare.cloudflared" -ForegroundColor White
    Write-Host ""
    Write-Host "      Oder download von:" -ForegroundColor Gray
    Write-Host "      https://github.com/cloudflare/cloudflared/releases" -ForegroundColor White
    Write-Host ""
    Write-Host "      Starten Sie dann dieses Script erneut!" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit
}

Write-Host "      ✓ cloudflared installiert!" -ForegroundColor Green

# Schritt 2: Prüfe ob Tunnel existiert
Write-Host "`n[2/4] Prüfe Tunnel-Konfiguration..." -ForegroundColor Green

$configFile = Join-Path $PSScriptRoot "cloudflared-config.yml"
if (!(Test-Path $configFile)) {
    Write-Host "      ⚠️  Tunnel noch nicht konfiguriert!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "      Bitte folgen Sie der Anleitung in:" -ForegroundColor Red
    Write-Host "      CLOUDFLARE_TUNNEL_SETUP.md" -ForegroundColor White
    Write-Host ""
    Write-Host "      Schnell-Setup:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "      1. cloudflared tunnel login" -ForegroundColor White
    Write-Host "      2. cloudflared tunnel create mp3-transcriber" -ForegroundColor White
    Write-Host "      3. Erstellen Sie cloudflared-config.yml (siehe Anleitung)" -ForegroundColor White
    Write-Host "      4. cloudflared tunnel route dns mp3-transcriber mp3-app.cfargotunnel.com" -ForegroundColor White
    Write-Host "      5. cloudflared tunnel route dns mp3-transcriber mp3-api.cfargotunnel.com" -ForegroundColor White
    Write-Host ""
    Write-Host "      Starten Sie dann dieses Script erneut!" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit
}

Write-Host "      ✓ Konfiguration gefunden!" -ForegroundColor Green

# Schritt 3: Starte Frontend + Backend (falls nicht bereits laufend)
Write-Host "`n[3/4] Prüfe ob Frontend und Backend laufen..." -ForegroundColor Green

$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue | Measure-Object | Select-Object -ExpandProperty Count
if ($nodeProcesses -lt 5) {
    Write-Host "      Starte Frontend + Backend..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm run dev"
    Write-Host "      ✓ Warte 15 Sekunden auf Initialisierung..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15
} else {
    Write-Host "      ✓ Bereits laufend!" -ForegroundColor Green
}

# Schritt 4: Starte Cloudflare Tunnel
Write-Host "`n[4/4] Starte Cloudflare Tunnel..." -ForegroundColor Green

Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
Write-Host '`n' -NoNewline
Write-Host '═' * 80 -ForegroundColor Cyan
Write-Host '  ☁️  Cloudflare Tunnel läuft...' -ForegroundColor Yellow
Write-Host '═' * 80 -ForegroundColor Cyan
Write-Host ''
cd '$PSScriptRoot'
cloudflared tunnel --config cloudflared-config.yml run mp3-transcriber
"@

Start-Sleep -Seconds 3
Write-Host "      ✓ Tunnel gestartet!" -ForegroundColor Green

# Finale Anleitung
Write-Host ""
Write-Host "═" * 80 -ForegroundColor Cyan
Write-Host "  ✅ CLOUDFLARE TUNNEL LÄUFT!" -ForegroundColor Yellow
Write-Host "═" * 80 -ForegroundColor Cyan
Write-Host ""
Write-Host "  🌐 IHRE KUNDEN-URL:" -ForegroundColor White
Write-Host ""
Write-Host "  https://mp3-app.cfargotunnel.com" -ForegroundColor Green
Write-Host "  (oder die URL die Sie in cloudflared-config.yml konfiguriert haben)" -ForegroundColor Gray
Write-Host ""
Write-Host "═" * 80 -ForegroundColor Cyan
Write-Host "  ⚙️  FRONTEND-KONFIGURATION:" -ForegroundColor Yellow
Write-Host "═" * 80 -ForegroundColor Cyan
Write-Host ""
Write-Host "  Stellen Sie sicher, dass client\.env.local existiert:" -ForegroundColor Gray
Write-Host ""
Write-Host "  REACT_APP_API_URL=https://mp3-api.cfargotunnel.com/api" -ForegroundColor White
Write-Host ""
Write-Host "  (oder Ihre Backend-URL aus cloudflared-config.yml)" -ForegroundColor Gray
Write-Host ""
Write-Host "  Falls geändert: Frontend NEU starten!" -ForegroundColor Yellow
Write-Host ""
Write-Host "═" * 80 -ForegroundColor Cyan
Write-Host "  🔐 LOGIN-DATEN FÜR KUNDEN:" -ForegroundColor Yellow
Write-Host "═" * 80 -ForegroundColor Cyan
Write-Host ""
Write-Host "  Benutzername: test" -ForegroundColor White
Write-Host "  Passwort:     test" -ForegroundColor White
Write-Host ""
Write-Host "═" * 80 -ForegroundColor Cyan
Write-Host "  💡 TIPP:" -ForegroundColor Yellow
Write-Host "═" * 80 -ForegroundColor Cyan
Write-Host ""
Write-Host "  Der Cloudflare Tunnel bleibt aktiv, bis Sie Ctrl+C drücken." -ForegroundColor Gray
Write-Host "  Die URLs bleiben immer gleich - kein zufälliger Name!" -ForegroundColor Gray
Write-Host ""
Write-Host "═" * 80 -ForegroundColor Cyan
Write-Host ""
