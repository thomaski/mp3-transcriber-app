# ============================================================================
# PowerShell Aliase für MP3 Transcriber App
# ============================================================================
# Um diese Aliase automatisch zu laden, füge folgende Zeile zu deinem 
# PowerShell Profil hinzu (öffne mit: notepad $PROFILE):
#
#   . "D:\Projekte\git\mp3-transcriber-app\.powershell-aliases.ps1"
#
# ============================================================================

# Wechsle zum Projekt-Verzeichnis
function Set-TranscriberDirectory {
    Set-Location "D:\Projekte\git\mp3-transcriber-app"
    Write-Host "📂 Wechsle zu: MP3 Transcriber App" -ForegroundColor Cyan
}
Set-Alias -Name transcriber -Value Set-TranscriberDirectory

# Starte den Development Server (Frontend + Backend)
function Start-TranscriberServer {
    Set-Location "D:\Projekte\git\mp3-transcriber-app"
    Write-Host "🚀 Starte MP3 Transcriber Server..." -ForegroundColor Green
    npm run dev
}
Set-Alias -Name start-server -Value Start-TranscriberServer

# Stoppe alle Node.js Prozesse (Force Stop)
function Stop-TranscriberServer {
    Write-Host "🛑 Stoppe alle Node.js Prozesse..." -ForegroundColor Yellow
    Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "✅ Alle Node.js Prozesse wurden gestoppt." -ForegroundColor Green
}
Set-Alias -Name force-stop -Value Stop-TranscriberServer
Set-Alias -Name stop-server -Value Stop-TranscriberServer

# Installiere alle Dependencies
function Install-TranscriberDeps {
    Set-Location "D:\Projekte\git\mp3-transcriber-app"
    Write-Host "📦 Installiere Dependencies..." -ForegroundColor Cyan
    npm run install-all
}
Set-Alias -Name install-deps -Value Install-TranscriberDeps

# Zeige verfügbare Commands mit interaktivem Menü
function Show-TranscriberCommands {
    param(
        [switch]$NonInteractive
    )
    
    # Zeige Menü
    Write-Host "`n════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  📋 MP3 Transcriber App - Verfügbare Commands" -ForegroundColor White
    Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  [1] 🚀 start-server" -ForegroundColor Green -NoNewline
    Write-Host "      Startet Frontend + Backend Development Server"
    Write-Host "  [2] 🛑 stop-server" -ForegroundColor Red -NoNewline
    Write-Host "       Stoppt alle Node.js Prozesse"
    Write-Host "  [3] 🛑 force-stop" -ForegroundColor Red -NoNewline
    Write-Host "        Stoppt alle Node.js Prozesse (Force)"
    Write-Host "  [4] 📦 install-deps" -ForegroundColor Yellow -NoNewline
    Write-Host "      Installiert alle Dependencies"
    Write-Host "  [5] 📂 transcriber" -ForegroundColor Cyan -NoNewline
    Write-Host "        Wechselt zum Projekt-Verzeichnis"
    Write-Host ""
    Write-Host "  [0] ❌ Exit" -ForegroundColor White -NoNewline
    Write-Host "             Zurück zum Prompt"
    Write-Host ""
    Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    
    # Wenn NonInteractive, nur Menü anzeigen
    if ($NonInteractive) {
        Write-Host ""
        Write-Host "💡 Tippe 'cmds' für interaktives Menü" -ForegroundColor DarkGray
        Write-Host ""
        return
    }
    
    # Interaktive Eingabe-Schleife
    while ($true) {
        Write-Host ""
        
        # Prüfe ob wir in einem interaktiven Terminal sind
        if ([Environment]::UserInteractive -and -not [Environment]::GetCommandLineArgs().Contains('-NonInteractive')) {
            try {
                Write-Host "Wähle eine Option (0-5 oder ESC zum Beenden): " -NoNewline -ForegroundColor White
                $choice = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
                
                # ESC-Taste gedrückt?
                if ($choice.VirtualKeyCode -eq 27) {
                    Write-Host "ESC" -ForegroundColor DarkGray
                    Write-Host ""
                    Write-Host "👋 Zurück zum Prompt..." -ForegroundColor Yellow
                    Write-Host ""
                    return
                }
                
                # Zeige die gedrückte Taste
                Write-Host $choice.Character
                $choice = $choice.Character
            }
            catch {
                Write-Host "❌ Fehler bei der Eingabe. Zurück zum Prompt..." -ForegroundColor Red
                Write-Host ""
                return
            }
        }
        else {
            # Nicht-interaktiver Modus
            Write-Host "💡 Tippe 'cmds' für interaktives Menü" -ForegroundColor DarkGray
            Write-Host ""
            return
        }
        
        # 0 oder Enter zum Beenden
        if ($choice -eq "" -or $choice -eq "0" -or $choice -eq "`r") {
            Write-Host "👋 Zurück zum Prompt..." -ForegroundColor Yellow
            Write-Host ""
            return
        }
        
        # Führe gewählten Command aus
        switch ($choice) {
            "1" {
                Write-Host ""
                Start-TranscriberServer
                return  # Start-Server läuft lange, danach zurück zum Prompt
            }
            "2" {
                Write-Host ""
                Stop-TranscriberServer
                Write-Host ""
                Write-Host "Drücke Enter zum Fortfahren..." -ForegroundColor DarkGray
                Read-Host
                # Zeige Menü erneut
                Show-TranscriberCommands
                return
            }
            "3" {
                Write-Host ""
                Stop-TranscriberServer
                Write-Host ""
                Write-Host "Drücke Enter zum Fortfahren..." -ForegroundColor DarkGray
                Read-Host
                # Zeige Menü erneut
                Show-TranscriberCommands
                return
            }
            "4" {
                Write-Host ""
                Install-TranscriberDeps
                Write-Host ""
                Write-Host "Drücke Enter zum Fortfahren..." -ForegroundColor DarkGray
                Read-Host
                # Zeige Menü erneut
                Show-TranscriberCommands
                return
            }
            "5" {
                Write-Host ""
                Set-TranscriberDirectory
                Write-Host ""
                Write-Host "Drücke Enter zum Fortfahren..." -ForegroundColor DarkGray
                Read-Host
                # Zeige Menü erneut
                Show-TranscriberCommands
                return
            }
            default {
                Write-Host ""
                Write-Host "❌ Ungültige Auswahl: $choice" -ForegroundColor Red
                Write-Host "   Bitte wähle eine Zahl zwischen 0 und 5." -ForegroundColor Yellow
                Write-Host ""
                Start-Sleep -Seconds 2
                # Loop wiederholt sich automatisch
                # Zeige Menü erneut
                Write-Host "`n════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
                Write-Host "  📋 MP3 Transcriber App - Verfügbare Commands" -ForegroundColor White
                Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
                Write-Host ""
                Write-Host "  [1] 🚀 start-server" -ForegroundColor Green -NoNewline
                Write-Host "      Startet Frontend + Backend Development Server"
                Write-Host "  [2] 🛑 stop-server" -ForegroundColor Red -NoNewline
                Write-Host "       Stoppt alle Node.js Prozesse"
                Write-Host "  [3] 🛑 force-stop" -ForegroundColor Red -NoNewline
                Write-Host "        Stoppt alle Node.js Prozesse (Force)"
                Write-Host "  [4] 📦 install-deps" -ForegroundColor Yellow -NoNewline
                Write-Host "      Installiert alle Dependencies"
                Write-Host "  [5] 📂 transcriber" -ForegroundColor Cyan -NoNewline
                Write-Host "        Wechselt zum Projekt-Verzeichnis"
                Write-Host ""
                Write-Host "  [0] ❌ Exit" -ForegroundColor White -NoNewline
                Write-Host "             Zurück zum Prompt"
                Write-Host ""
                Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
            }
        }
    }
}

Set-Alias -Name cmds -Value Show-TranscriberCommands

# Zeige Willkommensnachricht beim Laden
Write-Host ""
Write-Host "✅ MP3 Transcriber Aliase geladen!" -ForegroundColor Green
Write-Host ""

# Starte automatisch das interaktive Menü
Show-TranscriberCommands
