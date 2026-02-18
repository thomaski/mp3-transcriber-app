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

# Starte das Backend (serviert Frontend + API)
function Start-TranscriberServer {
    Set-Location "D:\Projekte\git\mp3-transcriber-app"
    Write-Host "`n🚀 Starte MP3 Transcriber Backend (Development)...`n" -ForegroundColor Green
    Write-Host "📌 WICHTIG: Öffne Browser auf http://localhost:5000" -ForegroundColor Yellow
    Write-Host "👤 Login: user=tom | pwd=MT9#Detomaso`n" -ForegroundColor Gray
    npm run dev
}
Set-Alias -Name start-server -Value Start-TranscriberServer

# Starte Production-Server
function Start-TranscriberProd {
    Set-Location "D:\Projekte\git\mp3-transcriber-app"
    Write-Host "`n🚀 Starte MP3 Transcriber Backend (Production)...`n" -ForegroundColor Green
    Write-Host "📌 WICHTIG: Öffne Browser auf http://localhost:5000" -ForegroundColor Yellow
    Write-Host "⚠️  Production-Modus: Keine Demo-Credentials!`n" -ForegroundColor Red
    npm run start-prod
}
Set-Alias -Name start-prod -Value Start-TranscriberProd

# Rebuild GUI (Frontend)
function Rebuild-TranscriberGUI {
    Set-Location "D:\Projekte\git\mp3-transcriber-app"
    Write-Host "`n🔧 Rebuilde Frontend und deploye...`n" -ForegroundColor Cyan
    npm run build-deploy
    Write-Host "`n✅ Frontend wurde neu gebaut und deployed!`n" -ForegroundColor Green
}
Set-Alias -Name rebuild-gui -Value Rebuild-TranscriberGUI

# Rebuild ALL (Dependencies + GUI + Deploy)
function Rebuild-TranscriberAll {
    Set-Location "D:\Projekte\git\mp3-transcriber-app"
    Write-Host "`n🔧 Rebuilde ALLES (Dependencies + Frontend + Deploy)...`n" -ForegroundColor Cyan
    npm run rebuild-all
    Write-Host "`n✅ Alles wurde neu gebaut!`n" -ForegroundColor Green
}
Set-Alias -Name rebuild-all -Value Rebuild-TranscriberAll

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

# Zeige Datenbank-Inhalt
function Show-TranscriberDatabase {
    Set-Location "D:\Projekte\git\mp3-transcriber-app"
    Write-Host "📊 Zeige Datenbank-Inhalt..." -ForegroundColor Cyan
    node scripts/view-database-pg.js
}
Set-Alias -Name view-db -Value Show-TranscriberDatabase

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
    Write-Host "      Startet Backend (Development) auf Port 5000"
    Write-Host "  [2] 🛑 stop-server" -ForegroundColor Red -NoNewline
    Write-Host "       Stoppt alle Node.js Prozesse"
    Write-Host "  [3] 🛑 force-stop" -ForegroundColor Red -NoNewline
    Write-Host "        Stoppt alle Node.js Prozesse (Force)"
    Write-Host "  [4] 📦 install-deps" -ForegroundColor Yellow -NoNewline
    Write-Host "      Installiert alle Dependencies"
    Write-Host "  [5] 📊 view-db" -ForegroundColor Magenta -NoNewline
    Write-Host "          Zeigt PostgreSQL Datenbank-Inhalt"
    Write-Host "  [6] 📂 transcriber" -ForegroundColor Cyan -NoNewline
    Write-Host "        Wechselt zum Projekt-Verzeichnis"
    Write-Host "  [7] 🔧 rebuild-gui" -ForegroundColor Blue -NoNewline
    Write-Host "       Rebuilt Frontend und deployed"
    Write-Host "  [8] 🔧 rebuild-all" -ForegroundColor Blue -NoNewline
    Write-Host "       Rebuilt ALLES (Dependencies + GUI + Deploy)"
    Write-Host "  [9] 🚀 start-prod" -ForegroundColor Green -NoNewline
    Write-Host "        Startet Backend (Production) auf Port 5000"
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
                Write-Host "Wähle eine Option (0-9 oder ESC zum Beenden): " -NoNewline -ForegroundColor White
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
                return
            }
            "2" {
                Write-Host ""
                Stop-TranscriberServer
                Write-Host ""
                Write-Host "Drücke Enter zum Fortfahren..." -ForegroundColor DarkGray
                Read-Host
                Show-TranscriberCommands
                return
            }
            "3" {
                Write-Host ""
                Stop-TranscriberServer
                Write-Host ""
                Write-Host "Drücke Enter zum Fortfahren..." -ForegroundColor DarkGray
                Read-Host
                Show-TranscriberCommands
                return
            }
            "4" {
                Write-Host ""
                Install-TranscriberDeps
                Write-Host ""
                Write-Host "Drücke Enter zum Fortfahren..." -ForegroundColor DarkGray
                Read-Host
                Show-TranscriberCommands
                return
            }
            "5" {
                Write-Host ""
                Show-TranscriberDatabase
                Write-Host ""
                Write-Host "Drücke Enter zum Fortfahren..." -ForegroundColor DarkGray
                Read-Host
                Show-TranscriberCommands
                return
            }
            "6" {
                Write-Host ""
                Set-TranscriberDirectory
                Write-Host ""
                Write-Host "Drücke Enter zum Fortfahren..." -ForegroundColor DarkGray
                Read-Host
                Show-TranscriberCommands
                return
            }
            "7" {
                Write-Host ""
                Rebuild-TranscriberGUI
                Write-Host ""
                Write-Host "Drücke Enter zum Fortfahren..." -ForegroundColor DarkGray
                Read-Host
                Show-TranscriberCommands
                return
            }
            "8" {
                Write-Host ""
                Rebuild-TranscriberAll
                Write-Host ""
                Write-Host "Drücke Enter zum Fortfahren..." -ForegroundColor DarkGray
                Read-Host
                Show-TranscriberCommands
                return
            }
            "9" {
                Write-Host ""
                Start-TranscriberProd
                return
            }
            default {
                Write-Host ""
                Write-Host "❌ Ungültige Auswahl: $choice" -ForegroundColor Red
                Write-Host "   Bitte wähle eine Zahl zwischen 0 und 9." -ForegroundColor Yellow
                Write-Host ""
                Start-Sleep -Seconds 2
                # Loop wiederholt sich automatisch
                # Zeige Menü erneut
                Write-Host "`n════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
                Write-Host "  📋 MP3 Transcriber App - Verfügbare Commands" -ForegroundColor White
                Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
                Write-Host ""
                Write-Host "  [1] 🚀 start-server" -ForegroundColor Green -NoNewline
                Write-Host "      Startet Backend (serviert Frontend + API) auf Port 5000"
                Write-Host "  [2] 🛑 stop-server" -ForegroundColor Red -NoNewline
                Write-Host "       Stoppt alle Node.js Prozesse"
                Write-Host "  [3] 🛑 force-stop" -ForegroundColor Red -NoNewline
                Write-Host "        Stoppt alle Node.js Prozesse (Force)"
                Write-Host "  [4] 📦 install-deps" -ForegroundColor Yellow -NoNewline
                Write-Host "      Installiert alle Dependencies"
                Write-Host "  [5] 📊 view-db" -ForegroundColor Magenta -NoNewline
                Write-Host "          Zeigt Datenbank-Tabellen und Inhalt"
                Write-Host "  [6] 📂 transcriber" -ForegroundColor Cyan -NoNewline
                Write-Host "        Wechselt zum Projekt-Verzeichnis"
                Write-Host "  [7] 🔧 rebuild-gui" -ForegroundColor Blue -NoNewline
                Write-Host "       Rebuilt Frontend und deployed"
                Write-Host "  [8] 🔧 rebuild-all" -ForegroundColor Blue -NoNewline
                Write-Host "       Rebuilt ALLES (Dependencies + GUI + Deploy)"
                Write-Host "  [9] 🚀 start-prod" -ForegroundColor Green -NoNewline
                Write-Host "        Startet Backend (Production) auf Port 5000"
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
