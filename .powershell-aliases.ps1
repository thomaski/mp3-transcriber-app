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
    
    Write-Host "`n🚀 Upload + Commit + Tag + GitHub Release" -ForegroundColor Cyan
    Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    
    # ── Schritt 1: Version abfragen ──────────────────────────────────────────
    $versionRaw = Read-Host "`n📌 Version eingeben (z.B. 1.0.0 oder v1.0.0)"
    if ([string]::IsNullOrWhiteSpace($versionRaw)) {
        Write-Host "❌ Abgebrochen: Keine Version angegeben.`n" -ForegroundColor Red
        return
    }
    # Normalisieren
    $versionRaw = $versionRaw.Trim()
    $versionTag = if ($versionRaw.StartsWith("v")) { $versionRaw } else { "v$versionRaw" }
    $versionNum = $versionTag.TrimStart("v")   # z.B. "1.0.0"
    
    # Tag-Name: MP3-Transcriber-v1.0.0
    $tagName     = "MP3-Transcriber-$versionTag"
    # Release-Titel: 🎙️ MP3 Transcriber App – Release v1.0.0
    $releaseTitle = "MP3 Transcriber App - Release $versionTag"
    
    Write-Host "  🏷️  Tag-Name    : $tagName" -ForegroundColor Green
    Write-Host "  📦 Release-Titel: $releaseTitle" -ForegroundColor Green
    
    # ── Schritt 2: README.md prüfen und ggf. aktualisieren ───────────────────
    Write-Host "`n────────────────────────────────────────────────────────────────" -ForegroundColor DarkCyan
    Write-Host "  📄 README.md Prüfung" -ForegroundColor White
    Write-Host "────────────────────────────────────────────────────────────────" -ForegroundColor DarkCyan
    
    $readmeExists = Test-Path "README.md"
    if ($readmeExists) {
        $readmeContent = Get-Content "README.md" -Raw -Encoding UTF8
        $readmeLines   = (Get-Content "README.md" -Encoding UTF8).Count
        Write-Host "  ✅ README.md gefunden ($readmeLines Zeilen)" -ForegroundColor Green
        
        if ($readmeContent -match [Regex]::Escape($versionNum)) {
            Write-Host "  ✅ Version '$versionNum' ist in README.md eingetragen." -ForegroundColor Green
            $updateReadme = Read-Host "  🔄 README.md trotzdem vor dem Release bearbeiten? (j/n)"
        } else {
            Write-Host "  ⚠️  Version '$versionNum' wurde NICHT in README.md gefunden!" -ForegroundColor Yellow
            Write-Host "     Empfehlung: README.md vor dem Release aktualisieren." -ForegroundColor Yellow
            $updateReadme = Read-Host "  🔄 README.md jetzt aktualisieren? (j/n)"
        }
        
        if ($updateReadme -in @("j","J","y","Y")) {
            Write-Host "  📝 Öffne README.md zur Bearbeitung..." -ForegroundColor Cyan
            notepad.exe "README.md"
            Read-Host "  ⏸  Drücke Enter wenn du mit der Bearbeitung fertig bist"
            $readmeContent = Get-Content "README.md" -Raw -Encoding UTF8
            Write-Host "  ✅ README.md aktualisiert und eingelesen." -ForegroundColor Green
        }
    } else {
        Write-Host "  ⚠️  README.md nicht gefunden! Release wird mit minimaler Dokumentation erstellt." -ForegroundColor Yellow
        $readmeContent = $null
    }
    
    # ── Schritt 3: Release-Dokumentation aus README.md generieren ───────────────
    # Liest README.md und extrahiert daraus dynamisch alle vorhandenen Abschnitte.
    # KEIN hartcodierter Text – alles kommt aus README.md.
    Write-Host "`n────────────────────────────────────────────────────────────────" -ForegroundColor DarkCyan
    Write-Host "  📝 Generiere Release-Dokumentation aus README.md" -ForegroundColor White
    Write-Host "────────────────────────────────────────────────────────────────" -ForegroundColor DarkCyan
    
    $releaseDate = Get-Date -Format "yyyy-MM-dd"
    $repoUrlRaw  = git remote get-url origin 2>&1
    $repoPath    = if ($repoUrlRaw -match 'github\.com[:/](.+?)(?:\.git)?$') { $Matches[1] } else { "" }
    $repoHttpUrl = if ($repoPath) { "https://github.com/$repoPath" } else { "" }
    
    # Hilfsfunktion: extrahiert einen ## Abschnitt vollständig aus Markdown-Text
    function Get-MarkdownSection {
        param([string]$content, [string]$heading)
        if (-not $content) { return "" }
        $escaped = [Regex]::Escape($heading)
        $m = [Regex]::Match($content, "(?ms)^##\s+$escaped\s*`n(.*?)(?=^##\s|\z)")
        if ($m.Success) { return $m.Groups[1].Value.Trim() }
        return ""
    }
    
    # Alle ## Überschriften aus README.md auslesen (dynamisch, keine Annahmen)
    $docParts = [System.Collections.Generic.List[string]]::new()
    
    if ($readmeContent) {
        # Ersten Absatz (Kurzbeschreibung) extrahieren – Text zwischen # Titel und erstem ##
        $introMatch = [Regex]::Match($readmeContent, "(?ms)^#[^#].*?`n(.*?)(?=^##\s|\z)")
        $introText  = if ($introMatch.Success) { $introMatch.Groups[1].Value.Trim() } else { "" }
        
        # Alle ## Abschnitt-Überschriften in der Reihenfolge ihres Vorkommens ermitteln
        $sectionMatches = [Regex]::Matches($readmeContent, "(?m)^##\s+(.+)$")
        $sectionHeadings = $sectionMatches | ForEach-Object { $_.Groups[1].Value.Trim() }
        
        # Release-Header (nur dynamische Werte)
        $docParts.Add("# $releaseTitle")
        $docParts.Add("")
        $docParts.Add("**Version:** $versionTag  ")
        $docParts.Add("**Datum:** $releaseDate  ")
        if ($repoHttpUrl) { $docParts.Add("**Repository:** $repoHttpUrl  ") }
        $docParts.Add("")
        $docParts.Add("---")
        $docParts.Add("")
        
        # Kurzbeschreibung aus README-Intro
        if ($introText) {
            $docParts.Add($introText)
            $docParts.Add("")
            $docParts.Add("---")
            $docParts.Add("")
        }
        
        # Changelog-Eintrag für diese Version voranstellen (falls CHANGELOG.md vorhanden)
        if (Test-Path "CHANGELOG.md") {
            $clContent   = Get-Content "CHANGELOG.md" -Raw -Encoding UTF8
            $clPattern   = "(?ms)^##\s+.*?$([Regex]::Escape($versionNum)).*?`n(.*?)(?=^##\s|\z)"
            $clAlt       = "(?ms)^##\s+.*?$([Regex]::Escape($versionTag)).*?`n(.*?)(?=^##\s|\z)"
            $clMatch     = [Regex]::Match($clContent, $clPattern)
            if (-not $clMatch.Success) { $clMatch = [Regex]::Match($clContent, $clAlt) }
            if ($clMatch.Success) {
                $clText = $clMatch.Groups[1].Value.Trim()
                if ($clText) {
                    $docParts.Add("## Änderungen in $versionTag")
                    $docParts.Add("")
                    $docParts.Add($clText)
                    $docParts.Add("")
                    $docParts.Add("---")
                    $docParts.Add("")
                }
            }
        }
        
        # Alle ## Abschnitte aus README.md in ihrer originalen Reihenfolge übernehmen
        # (Inhaltsverzeichnis-Abschnitt überspringen)
        foreach ($heading in $sectionHeadings) {
            if ($heading -match "Inhaltsverzeichnis|Table of Contents") { continue }
            $sectionText = Get-MarkdownSection $readmeContent $heading
            if ($sectionText) {
                $docParts.Add("## $heading")
                $docParts.Add("")
                $docParts.Add($sectionText)
                $docParts.Add("")
                $docParts.Add("---")
                $docParts.Add("")
            }
        }
    } else {
        # Kein README → minimaler Fallback-Header
        $docParts.Add("# $releaseTitle")
        $docParts.Add("")
        $docParts.Add("**Version:** $versionTag  ")
        $docParts.Add("**Datum:** $releaseDate  ")
        if ($repoHttpUrl) { $docParts.Add("**Repository:** $repoHttpUrl") }
    }
    
    $docText = $docParts -join "`n"
    
    # In temporäre Datei schreiben (UTF-8 ohne BOM)
    $tempDocFile = [System.IO.Path]::GetTempFileName() -replace "\.tmp$", ".md"
    [System.IO.File]::WriteAllText($tempDocFile, $docText, [System.Text.UTF8Encoding]::new($false))
    $docLineCount = $docParts.Count
    Write-Host "  ✅ Release-Dokumentation generiert ($docLineCount Abschnitte → $tempDocFile)" -ForegroundColor Green
    
    # ── Schritt 4: Git Status anzeigen und Commit durchführen ─────────────────
    Write-Host "`n────────────────────────────────────────────────────────────────" -ForegroundColor DarkCyan
    Write-Host "  📤 Upload & Commit" -ForegroundColor White
    Write-Host "────────────────────────────────────────────────────────────────" -ForegroundColor DarkCyan
    
    Write-Host "`n  📊 Geänderte Dateien:" -ForegroundColor Yellow
    $changesRaw = git status --short
    if ($changesRaw) {
        $changesRaw | ForEach-Object { Write-Host "     $_" }
        Write-Host ""
        
        $defaultMsg = "feat: Release $versionTag - MP3 Transcriber App"
        Write-Host "  💾 Commit-Message (Enter für Standard):" -ForegroundColor Yellow
        Write-Host "     Standard: '$defaultMsg'" -ForegroundColor DarkGray
        $commitMsg = Read-Host "  >"
        if ([string]::IsNullOrWhiteSpace($commitMsg)) { $commitMsg = $defaultMsg }
        
        Write-Host "`n  ➕ Stage alle Änderungen..." -ForegroundColor Blue
        git add .
        
        Write-Host "  💾 Commit: '$commitMsg'" -ForegroundColor Blue
        git commit -m $commitMsg
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ❌ Commit fehlgeschlagen! Abbruch.`n" -ForegroundColor Red
            Remove-Item $tempDocFile -ErrorAction SilentlyContinue
            return
        }
        
        Write-Host "  📤 Push zu GitHub..." -ForegroundColor Blue
        git push
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ❌ Push fehlgeschlagen! Abbruch.`n" -ForegroundColor Red
            Remove-Item $tempDocFile -ErrorAction SilentlyContinue
            return
        }
        Write-Host "  ✅ Alle Änderungen erfolgreich gepusht!" -ForegroundColor Green
    } else {
        Write-Host "  ℹ️  Keine lokalen Änderungen. Prüfe auf ausstehende Commits..." -ForegroundColor Cyan
        git push 2>&1 | Out-Null
        Write-Host "  ✅ Push abgeschlossen." -ForegroundColor Green
    }
    
    # ── Schritt 5: Bestehendes Tag löschen falls vorhanden ───────────────────
    Write-Host "`n────────────────────────────────────────────────────────────────" -ForegroundColor DarkCyan
    Write-Host "  🏷️  Tag '$tagName' erstellen" -ForegroundColor White
    Write-Host "────────────────────────────────────────────────────────────────" -ForegroundColor DarkCyan
    
    # Lokales Tag löschen
    $existingLocalTag = git tag -l $tagName
    if ($existingLocalTag) {
        Write-Host "  ⚠️  Lokales Tag '$tagName' existiert → wird gelöscht..." -ForegroundColor Yellow
        git tag -d $tagName | Out-Null
    }
    # Remote Tag löschen
    $existingRemoteTag = git ls-remote --tags origin "refs/tags/$tagName" 2>&1
    if ($existingRemoteTag -and "$existingRemoteTag".Trim() -ne "") {
        Write-Host "  ⚠️  Remote Tag '$tagName' existiert → wird gelöscht..." -ForegroundColor Yellow
        git push origin ":refs/tags/$tagName" 2>&1 | Out-Null
        Write-Host "  ✅ Remote Tag gelöscht." -ForegroundColor Green
    }
    
    # Neues annotiertes Tag mit vollständiger Dokumentation erstellen
    Write-Host "  🏷️  Erstelle Tag '$tagName' mit vollständiger Dokumentation..." -ForegroundColor Blue
    git tag -a $tagName -F $tempDocFile
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ❌ Tag-Erstellung fehlgeschlagen!`n" -ForegroundColor Red
        Remove-Item $tempDocFile -ErrorAction SilentlyContinue
        return
    }
    
    Write-Host "  📤 Pushe Tag zu GitHub..." -ForegroundColor Blue
    git push origin $tagName
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ❌ Tag-Push fehlgeschlagen!`n" -ForegroundColor Red
        Remove-Item $tempDocFile -ErrorAction SilentlyContinue
        return
    }
    Write-Host "  ✅ Tag '$tagName' erstellt und gepusht!" -ForegroundColor Green
    
    # ── Schritt 6: GitHub Release erstellen ──────────────────────────────────
    Write-Host "`n────────────────────────────────────────────────────────────────" -ForegroundColor DarkCyan
    Write-Host "  📦 GitHub Release erstellen" -ForegroundColor White
    Write-Host "────────────────────────────────────────────────────────────────" -ForegroundColor DarkCyan
    
    $ghAvailable = Get-Command gh -ErrorAction SilentlyContinue
    if (-not $ghAvailable) {
        Write-Host "  ⚠️  GitHub CLI (gh) nicht gefunden. Installation: https://cli.github.com" -ForegroundColor Yellow
        Write-Host "     Tag '$tagName' wurde erstellt. Release bitte manuell auf GitHub anlegen:" -ForegroundColor Yellow
        Write-Host "     $repoHttpUrl/releases/new?tag=$tagName" -ForegroundColor Cyan
    } else {
        # Prüfe ob Release bereits existiert und lösche es ggf.
        $releaseCheck = gh release view $tagName 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ⚠️  GitHub Release '$tagName' existiert bereits → wird gelöscht..." -ForegroundColor Yellow
            gh release delete $tagName --yes 2>&1 | Out-Null
            Write-Host "  ✅ Altes Release gelöscht." -ForegroundColor Green
        }
        
        Write-Host "  📦 Erstelle GitHub Release '$releaseTitle'..." -ForegroundColor Blue
        gh release create $tagName `
            --title $releaseTitle `
            --notes-file $tempDocFile
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ GitHub Release erfolgreich erstellt!" -ForegroundColor Green
            Write-Host "  🔗 $repoHttpUrl/releases/tag/$tagName" -ForegroundColor Cyan
        } else {
            Write-Host "  ❌ Release-Erstellung fehlgeschlagen!" -ForegroundColor Red
        }
    }
    
    # Temp-Datei aufräumen
    Remove-Item $tempDocFile -ErrorAction SilentlyContinue
    
    Write-Host "`n════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  🎉 Fertig! Release '$releaseTitle' wurde abgeschlossen." -ForegroundColor Green
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
                Write-Host "  Ungueltige Auswahl: $choice - bitte 0-9 eingeben." -ForegroundColor Red
                Write-Host ""
                Start-Sleep -Seconds 1
                # while-Schleife laeuft weiter und zeigt den naechsten Prompt
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
