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

# ============================================================================
# GIT/GITHUB BEFEHLE
# ============================================================================

# Quick-Push: Stage alle Änderungen, committe und pushe zu GitHub
function Quick-GitPush {
    param(
        [string]$Message = "Update: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    )
    
    Set-Location "D:\Projekte\git\mp3-transcriber-app"
    Write-Host "`n📤 Quick-Push zu GitHub...`n" -ForegroundColor Cyan
    
    # Status anzeigen
    Write-Host "📊 Aktueller Status:" -ForegroundColor Yellow
    git status --short
    Write-Host ""
    
    # Stage alle Änderungen
    Write-Host "➕ Stage alle Änderungen..." -ForegroundColor Blue
    git add .
    
    # Commit
    Write-Host "💾 Commit mit Message: '$Message'" -ForegroundColor Blue
    git commit -m $Message
    
    # Push
    Write-Host "📤 Push zu GitHub..." -ForegroundColor Blue
    git push
    
    Write-Host "`n✅ Erfolgreich zu GitHub gepusht!`n" -ForegroundColor Green
}
Set-Alias -Name qpush -Value Quick-GitPush
Set-Alias -Name quick-push -Value Quick-GitPush

# Git Tag erstellen und zu GitHub pushen
function Create-GitTag {
    param(
        [Parameter(Mandatory=$true)]
        [string]$TagName,
        [string]$Message = ""
    )
    
    Set-Location "D:\Projekte\git\mp3-transcriber-app"
    Write-Host "`n🏷️  Erstelle Git Tag: $TagName`n" -ForegroundColor Cyan
    
    if ($Message -eq "") {
        $Message = "Release $TagName"
    }
    
    # Tag erstellen
    Write-Host "🏷️  Erstelle Tag..." -ForegroundColor Blue
    git tag -a $TagName -m $Message
    
    # Tag zu GitHub pushen
    Write-Host "📤 Pushe Tag zu GitHub..." -ForegroundColor Blue
    git push origin $TagName
    
    Write-Host "`n✅ Tag '$TagName' erfolgreich erstellt und gepusht!`n" -ForegroundColor Green
}
Set-Alias -Name create-tag -Value Create-GitTag

# Zeige alle Tags
function Show-GitTags {
    Set-Location "D:\Projekte\git\mp3-transcriber-app"
    Write-Host "`n🏷️  Alle Git Tags:`n" -ForegroundColor Cyan
    git tag -l
    Write-Host ""
}
Set-Alias -Name show-tags -Value Show-GitTags

# Git Status
function Show-GitStatus {
    Set-Location "D:\Projekte\git\mp3-transcriber-app"
    Write-Host "`n📊 Git Status:`n" -ForegroundColor Cyan
    git status
    Write-Host ""
}
Set-Alias -Name gst -Value Show-GitStatus
Set-Alias -Name git-status -Value Show-GitStatus

# Zeige Git Log (letzte 10 Commits)
function Show-GitLog {
    Set-Location "D:\Projekte\git\mp3-transcriber-app"
    Write-Host "`n📜 Letzte 10 Commits:`n" -ForegroundColor Cyan
    git log --oneline --graph --decorate -10
    Write-Host ""
}
Set-Alias -Name glog -Value Show-GitLog

# Pull von GitHub
function Pull-FromGitHub {
    Set-Location "D:\Projekte\git\mp3-transcriber-app"
    Write-Host "`n⬇️  Pull von GitHub...`n" -ForegroundColor Cyan
    git pull
    Write-Host "`n✅ Erfolgreich von GitHub gepullt!`n" -ForegroundColor Green
}
Set-Alias -Name gpull -Value Pull-FromGitHub

# ============================================================================
# ENDE GIT/GITHUB BEFEHLE
# ============================================================================

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
    Write-Host "  [1] 🔧 rebuild-gui" -ForegroundColor Blue -NoNewline
    Write-Host "       Rebuilt Frontend und deployed"
    Write-Host "  [2] 🔧 rebuild-all" -ForegroundColor Blue -NoNewline
    Write-Host "       Rebuilt ALLES (Dependencies + GUI + Deploy)"
    Write-Host "  [3] 🚀 start-server" -ForegroundColor Green -NoNewline
    Write-Host "      Startet Backend (Development) auf Port 5000"
    Write-Host "  [4] 🚀 start-prod" -ForegroundColor Green -NoNewline
    Write-Host "        Startet Backend (Production) auf Port 5000"
    Write-Host "  [5] 🛑 stop-server" -ForegroundColor Red -NoNewline
    Write-Host "       Stoppt alle Node.js Prozesse"
    Write-Host "  [6] 🛑 force-stop" -ForegroundColor Red -NoNewline
    Write-Host "        Stoppt alle Node.js Prozesse (Force)"
    Write-Host "  [7] 📊 view-db" -ForegroundColor Magenta -NoNewline
    Write-Host "          Zeigt PostgreSQL Datenbank-Inhalt"
    Write-Host "  [8] 📦 install-deps" -ForegroundColor Yellow -NoNewline
    Write-Host "      Installiert alle Dependencies"
    Write-Host "  [9] 📂 transcriber" -ForegroundColor Cyan -NoNewline
    Write-Host "        Wechselt zum Projekt-Verzeichnis"
    Write-Host ""
    Write-Host "  🌐 Git/GitHub Befehle:" -ForegroundColor White
    Write-Host "     • qpush [message]" -ForegroundColor DarkCyan -NoNewline
    Write-Host "    - Quick-Push (add + commit + push)"
    Write-Host "     • create-tag <name>" -ForegroundColor DarkCyan -NoNewline
    Write-Host "  - Tag erstellen und pushen"
    Write-Host "     • gst" -ForegroundColor DarkCyan -NoNewline
    Write-Host "               - Git Status anzeigen"
    Write-Host "     • glog" -ForegroundColor DarkCyan -NoNewline
    Write-Host "              - Letzte Commits anzeigen"
    Write-Host "     • gpull" -ForegroundColor DarkCyan -NoNewline
    Write-Host "             - Von GitHub pullen"
    Write-Host "     • show-tags" -ForegroundColor DarkCyan -NoNewline
    Write-Host "         - Alle Tags anzeigen"
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
                Rebuild-TranscriberGUI
                Write-Host ""
                Write-Host "Drücke Enter zum Fortfahren..." -ForegroundColor DarkGray
                Read-Host
                Show-TranscriberCommands
                return
            }
            "2" {
                Write-Host ""
                Rebuild-TranscriberAll
                Write-Host ""
                Write-Host "Drücke Enter zum Fortfahren..." -ForegroundColor DarkGray
                Read-Host
                Show-TranscriberCommands
                return
            }
            "3" {
                Write-Host ""
                Start-TranscriberServer
                return
            }
            "4" {
                Write-Host ""
                Start-TranscriberProdServer
                return
            }
            "5" {
                Write-Host ""
                Stop-TranscriberServer
                Write-Host ""
                Write-Host "Drücke Enter zum Fortfahren..." -ForegroundColor DarkGray
                Read-Host
                Show-TranscriberCommands
                return
            }
            "6" {
                Write-Host ""
                Stop-TranscriberForce
                Write-Host ""
                Write-Host "Drücke Enter zum Fortfahren..." -ForegroundColor DarkGray
                Read-Host
                Show-TranscriberCommands
                return
            }
            "7" {
                Write-Host ""
                Show-TranscriberDatabase
                Write-Host ""
                Write-Host "Drücke Enter zum Fortfahren..." -ForegroundColor DarkGray
                Read-Host
                Show-TranscriberCommands
                return
            }
            "8" {
                Write-Host ""
                Install-TranscriberDeps
                Write-Host ""
                Write-Host "Drücke Enter zum Fortfahren..." -ForegroundColor DarkGray
                Read-Host
                Show-TranscriberCommands
                return
            }
            "9" {
                Write-Host ""
                Set-TranscriberDirectory
                Write-Host ""
                Write-Host "Drücke Enter zum Fortfahren..." -ForegroundColor DarkGray
                Read-Host
                Show-TranscriberCommands
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
                Write-Host "  [1] 🔧 rebuild-gui" -ForegroundColor Blue -NoNewline
                Write-Host "       Rebuilt Frontend und deployed"
                Write-Host "  [2] 🔧 rebuild-all" -ForegroundColor Blue -NoNewline
                Write-Host "       Rebuilt ALLES (Dependencies + GUI + Deploy)"
                Write-Host "  [3] 🚀 start-server" -ForegroundColor Green -NoNewline
                Write-Host "      Startet Backend (Development) auf Port 5000"
                Write-Host "  [4] 🚀 start-prod" -ForegroundColor Green -NoNewline
                Write-Host "        Startet Backend (Production) auf Port 5000"
                Write-Host "  [5] 🛑 stop-server" -ForegroundColor Red -NoNewline
                Write-Host "       Stoppt alle Node.js Prozesse"
                Write-Host "  [6] 🛑 force-stop" -ForegroundColor Red -NoNewline
                Write-Host "        Stoppt alle Node.js Prozesse (Force)"
                Write-Host "  [7] 📊 view-db" -ForegroundColor Magenta -NoNewline
                Write-Host "          Zeigt PostgreSQL Datenbank-Inhalt"
                Write-Host "  [8] 📦 install-deps" -ForegroundColor Yellow -NoNewline
                Write-Host "      Installiert alle Dependencies"
                Write-Host "  [9] 📂 transcriber" -ForegroundColor Cyan -NoNewline
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
