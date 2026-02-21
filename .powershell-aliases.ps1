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

# Rebuild GUI (Frontend) - CLEAN
function Rebuild-TranscriberGUI {
    Set-Location "D:\Projekte\git\mp3-transcriber-app"
    Write-Host "`n🔧 Rebuilde Frontend (CLEAN) und deploye...`n" -ForegroundColor Cyan
    Write-Host "🧹 Lösche Build-Ordner und Cache..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force client\build,client\node_modules\.cache,server\public -ErrorAction SilentlyContinue
    Write-Host "✅ Clean abgeschlossen`n" -ForegroundColor Green
    npm run build-deploy
    Write-Host "`n✅ Frontend wurde neu gebaut und deployed!`n" -ForegroundColor Green
}
Set-Alias -Name rebuild-gui -Value Rebuild-TranscriberGUI

# Rebuild ALL (Clean + Dependencies + GUI + Deploy)
function Rebuild-TranscriberAll {
    Set-Location "D:\Projekte\git\mp3-transcriber-app"
    Write-Host "`n🔧 Rebuilde ALLES (CLEAN + Dependencies + Frontend + Deploy)...`n" -ForegroundColor Cyan
    Write-Host "🧹 Lösche Build-Ordner und Cache..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force client\build,client\node_modules\.cache,server\public -ErrorAction SilentlyContinue
    Write-Host "✅ Clean abgeschlossen`n" -ForegroundColor Green
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
# PM2 SERVER-MANAGEMENT
# ============================================================================

# PM2 Status anzeigen
function Show-ServerStatus {
    Set-Location "D:\Projekte\git\mp3-transcriber-app"
    Write-Host "`n📊 PM2 Server Status:`n" -ForegroundColor Cyan
    pm2 status
    Write-Host ""
}
Set-Alias -Name server-status -Value Show-ServerStatus
Set-Alias -Name pm2-status -Value Show-ServerStatus

# Server via PM2 neustarten (z.B. nach Code-Änderungen)
function Restart-TranscriberServer {
    Set-Location "D:\Projekte\git\mp3-transcriber-app"
    Write-Host "`n🔄 Starte MP3 Transcriber Server neu (PM2)..." -ForegroundColor Cyan
    $running = pm2 list 2>&1 | Select-String "mp3-transcriber"
    if ($running) {
        pm2 restart mp3-transcriber
        Write-Host "✅ Server neugestartet!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Kein PM2-Prozess 'mp3-transcriber' gefunden. Starte neu..." -ForegroundColor Yellow
        pm2 start server/index.js --name "mp3-transcriber"
        pm2 save
        Write-Host "✅ Server gestartet!" -ForegroundColor Green
    }
    pm2 status
}
Set-Alias -Name restart-server -Value Restart-TranscriberServer

# PM2 Logs anzeigen
function Show-ServerLogs {
    Write-Host "`n📜 PM2 Server Logs (Strg+C zum Beenden):`n" -ForegroundColor Cyan
    pm2 logs mp3-transcriber
}
Set-Alias -Name server-logs -Value Show-ServerLogs
Set-Alias -Name pm2-logs -Value Show-ServerLogs

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

# Upload, Commit, Tag und GitHub Release in einem Schritt erstellen
function Upload-CommitCreateTagAndRelease {
    Set-Location "D:\Projekte\git\mp3-transcriber-app"
    
    Write-Host "`n🚀 Upload + Commit + Tag + GitHub Release`n" -ForegroundColor Cyan
    Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    
    # ── Schritt 1: Version abfragen ──────────────────────────────────────────
    $version = Read-Host "`n📌 Version eingeben (z.B. 1.0.0 oder v1.0.0)"
    if ([string]::IsNullOrWhiteSpace($version)) {
        Write-Host "❌ Abgebrochen: Keine Version angegeben.`n" -ForegroundColor Red
        return
    }
    # Normalisieren: "v" voranstellen falls nicht vorhanden
    if (-not $version.StartsWith("v")) {
        $version = "v$version"
    }
    Write-Host "✅ Version: $version" -ForegroundColor Green
    
    # ── Schritt 2: README.md prüfen und ggf. aktualisieren ───────────────────
    Write-Host "`n────────────────────────────────────────────────────────────────" -ForegroundColor DarkCyan
    Write-Host "  📄 README.md Prüfung" -ForegroundColor White
    Write-Host "────────────────────────────────────────────────────────────────" -ForegroundColor DarkCyan
    
    $readmeExists = Test-Path "README.md"
    if ($readmeExists) {
        $readmeContent = Get-Content "README.md" -Raw
        $readmeLines = (Get-Content "README.md").Count
        Write-Host "  ✅ README.md gefunden ($readmeLines Zeilen)" -ForegroundColor Green
        
        # Nach Version in README suchen
        if ($readmeContent -match [Regex]::Escape($version)) {
            Write-Host "  ✅ Version '$version' ist in README.md eingetragen." -ForegroundColor Green
            $updateReadme = Read-Host "`n  🔄 README.md trotzdem aktualisieren? (j/n)"
        } else {
            Write-Host "  ⚠️  Version '$version' wurde NICHT in README.md gefunden!" -ForegroundColor Yellow
            Write-Host "     Empfehlung: README.md vor dem Release aktualisieren." -ForegroundColor Yellow
            $updateReadme = Read-Host "`n  🔄 README.md jetzt aktualisieren? (j/n)"
        }
        
        if ($updateReadme -eq "j" -or $updateReadme -eq "J" -or $updateReadme -eq "y" -or $updateReadme -eq "Y") {
            Write-Host "`n  📝 Öffne README.md zur Bearbeitung..." -ForegroundColor Cyan
            notepad.exe "README.md"
            Read-Host "  ⏸  Drücke Enter wenn du mit der Bearbeitung fertig bist"
            $readmeContent = Get-Content "README.md" -Raw
            Write-Host "  ✅ README.md gelesen." -ForegroundColor Green
        }
    } else {
        Write-Host "  ⚠️  README.md nicht gefunden! Release wird ohne Dokumentation erstellt." -ForegroundColor Yellow
        $readmeContent = "Release $version"
    }
    
    # ── Schritt 3: Git Status anzeigen und Commit durchführen ─────────────────
    Write-Host "`n────────────────────────────────────────────────────────────────" -ForegroundColor DarkCyan
    Write-Host "  📤 Upload & Commit" -ForegroundColor White
    Write-Host "────────────────────────────────────────────────────────────────" -ForegroundColor DarkCyan
    
    Write-Host "`n  📊 Geänderte Dateien:" -ForegroundColor Yellow
    $changesRaw = git status --short
    if ($changesRaw) {
        $changesRaw | ForEach-Object { Write-Host "     $_" }
        Write-Host ""
        
        # Commit Message abfragen
        $defaultMsg = "feat: Release $version"
        Write-Host "  💾 Commit-Message (Enter für: '$defaultMsg'):" -ForegroundColor Yellow
        $commitMsg = Read-Host "  >"
        if ([string]::IsNullOrWhiteSpace($commitMsg)) {
            $commitMsg = $defaultMsg
        }
        
        Write-Host "`n  ➕ Stage alle Änderungen..." -ForegroundColor Blue
        git add .
        
        Write-Host "  💾 Commit: '$commitMsg'" -ForegroundColor Blue
        git commit -m $commitMsg
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ❌ Commit fehlgeschlagen! Abbruch.`n" -ForegroundColor Red
            return
        }
        
        Write-Host "  📤 Push zu GitHub..." -ForegroundColor Blue
        git push
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ❌ Push fehlgeschlagen! Abbruch.`n" -ForegroundColor Red
            return
        }
        Write-Host "  ✅ Alle Änderungen erfolgreich gepusht!" -ForegroundColor Green
    } else {
        Write-Host "  ℹ️  Keine lokalen Änderungen. Prüfe auf ausstehende Commits..." -ForegroundColor Cyan
        git push
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ⚠️  Push nicht möglich oder bereits aktuell." -ForegroundColor Yellow
        } else {
            Write-Host "  ✅ Push erfolgreich (ausstehende Commits übertragen)." -ForegroundColor Green
        }
    }
    
    # ── Schritt 4: Bestehendes Tag löschen falls vorhanden ───────────────────
    Write-Host "`n────────────────────────────────────────────────────────────────" -ForegroundColor DarkCyan
    Write-Host "  🏷️  Tag '$version' erstellen" -ForegroundColor White
    Write-Host "────────────────────────────────────────────────────────────────" -ForegroundColor DarkCyan
    
    $existingLocalTag = git tag -l $version
    if ($existingLocalTag) {
        Write-Host "`n  ⚠️  Lokales Tag '$version' existiert bereits → wird gelöscht..." -ForegroundColor Yellow
        git tag -d $version
    }
    
    # Remote Tag löschen falls vorhanden
    $existingRemoteTag = git ls-remote --tags origin "refs/tags/$version" 2>&1
    if ($existingRemoteTag -and $LASTEXITCODE -eq 0 -and $existingRemoteTag -ne "") {
        Write-Host "  ⚠️  Remote Tag '$version' existiert bereits → wird gelöscht..." -ForegroundColor Yellow
        git push origin ":refs/tags/$version"
        Write-Host "  ✅ Remote Tag gelöscht." -ForegroundColor Green
    }
    
    # Neues Tag erstellen
    Write-Host "`n  🏷️  Erstelle Tag '$version'..." -ForegroundColor Blue
    git tag -a $version -m "Release $version - MP3 Transcriber App"
    
    Write-Host "  📤 Pushe Tag zu GitHub..." -ForegroundColor Blue
    git push origin $version
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ❌ Tag-Push fehlgeschlagen!`n" -ForegroundColor Red
        return
    }
    Write-Host "  ✅ Tag '$version' erstellt und gepusht!" -ForegroundColor Green
    
    # ── Schritt 5: GitHub Release erstellen ──────────────────────────────────
    Write-Host "`n────────────────────────────────────────────────────────────────" -ForegroundColor DarkCyan
    Write-Host "  📦 GitHub Release '$version' erstellen" -ForegroundColor White
    Write-Host "────────────────────────────────────────────────────────────────" -ForegroundColor DarkCyan
    
    $ghAvailable = Get-Command gh -ErrorAction SilentlyContinue
    if (-not $ghAvailable) {
        Write-Host "`n  ⚠️  GitHub CLI (gh) nicht gefunden. Installation: https://cli.github.com" -ForegroundColor Yellow
        Write-Host "     Tag '$version' wurde erstellt. Release bitte manuell auf GitHub anlegen." -ForegroundColor Yellow
        Write-Host ""
    } else {
        # Prüfe ob Release bereits existiert und lösche es ggf.
        $releaseCheck = gh release view $version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n  ⚠️  GitHub Release '$version' existiert bereits → wird gelöscht..." -ForegroundColor Yellow
            gh release delete $version --yes 2>&1 | Out-Null
            Write-Host "  ✅ Altes Release gelöscht." -ForegroundColor Green
        }
        
        $releaseTitle = "MP3 Transcriber App $version"
        Write-Host "`n  📦 Erstelle GitHub Release: '$releaseTitle'..." -ForegroundColor Blue
        
        if ($readmeExists) {
            gh release create $version `
                --title $releaseTitle `
                --notes-file "README.md" `
                --tag $version
        } else {
            gh release create $version `
                --title $releaseTitle `
                --notes "Release $version der MP3 Transcriber App" `
                --tag $version
        }
        
        if ($LASTEXITCODE -eq 0) {
            # Repo-URL für den Link ermitteln
            $repoUrl = git remote get-url origin 2>&1
            $repoPath = if ($repoUrl -match 'github\.com[:/](.+?)(?:\.git)?$') { $Matches[1] } else { "..." }
            Write-Host "`n  ✅ GitHub Release '$version' erfolgreich erstellt!" -ForegroundColor Green
            Write-Host "  🔗 https://github.com/$repoPath/releases/tag/$version" -ForegroundColor Cyan
        } else {
            Write-Host "`n  ❌ Release-Erstellung fehlgeschlagen!" -ForegroundColor Red
        }
    }
    
    Write-Host "`n════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  🎉 Fertig! Release $version wurde abgeschlossen." -ForegroundColor Green
    Write-Host "════════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan
}
Set-Alias -Name release -Value Upload-CommitCreateTagAndRelease

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
    Write-Host "       CLEAN Rebuild: Frontend + Deploy"
    Write-Host "  [2] 🔧 rebuild-all" -ForegroundColor Blue -NoNewline
    Write-Host "       CLEAN Rebuild: Dependencies + GUI + Deploy"
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
    Write-Host "  🔁 PM2 Server-Management:" -ForegroundColor White
    Write-Host "     • server-status" -ForegroundColor DarkGreen -NoNewline
    Write-Host "       - PM2 Status anzeigen"
    Write-Host "     • restart-server" -ForegroundColor DarkGreen -NoNewline
    Write-Host "      - Server via PM2 neu starten"
    Write-Host "     • server-logs" -ForegroundColor DarkGreen -NoNewline
    Write-Host "         - Server-Logs anzeigen"
    Write-Host ""
    Write-Host "  🌐 Git/GitHub Befehle:" -ForegroundColor White
    Write-Host "     • qpush [message]" -ForegroundColor DarkCyan -NoNewline
    Write-Host "    - Quick-Push (add + commit + push)"
    Write-Host "     • release" -ForegroundColor DarkCyan -NoNewline
    Write-Host "             - Upload + Commit + Tag + GitHub Release"
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
                Write-Host "       CLEAN Rebuild: Frontend + Deploy"
                Write-Host "  [2] 🔧 rebuild-all" -ForegroundColor Blue -NoNewline
                Write-Host "       CLEAN Rebuild: Dependencies + GUI + Deploy"
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
                Write-Host "     • release" -ForegroundColor DarkCyan -NoNewline
                Write-Host "             - Upload + Commit + Tag + GitHub Release"
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
