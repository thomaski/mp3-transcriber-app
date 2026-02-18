# 🎯 Command Reference - MP3 Transcriber App

Diese Datei enthält alle verfügbaren Commands und Aliase für die MP3 Transcriber App.

---

## 📦 NPM Scripts

Diese Commands können direkt mit `npm run <script>` ausgeführt werden:

| Command | Beschreibung |
|---------|--------------|
| `npm run dev` | Startet Backend Server (serviert Frontend + API) |
| `npm run server` | Startet Backend Server mit nodemon (Development) |
| `npm run client` | Startet React Client (nur für lokale Entwicklung) |
| `npm run build` | Erstellt Production Build des Frontends |
| `npm run build-deploy` | 🆕 Baut Frontend und deployed es zu `server/public` |
| `npm run deploy-frontend` | 🆕 Deployed bereits gebautes Frontend zu `server/public` |
| `npm run start` | Startet Production-Server (NODE_ENV=development) |
| `npm run start-prod` | 🆕 Startet Production-Server (NODE_ENV=production) |
| `npm run rebuild-all` | 🆕 Installiert alle Dependencies und baut/deployed Frontend komplett neu |
| `npm run install-all` | Installiert alle Dependencies (Root + Client) |
| `npm run stop` | Stoppt alle Node.js Prozesse |
| `npm run force-stop` | Stoppt alle Node.js Prozesse (Force) |

**Hinweis:** In Production serviert das Backend auf Port 5000 sowohl Frontend als auch API!

---

## 🚀 PowerShell Aliase

### Installation

Um die PowerShell-Aliase zu aktivieren, führe folgende Schritte aus:

1. **Öffne dein PowerShell-Profil:**
   ```powershell
   notepad $PROFILE
   ```

2. **Füge folgende Zeile hinzu:**
   ```powershell
   . "D:\Projekte\git\mp3-transcriber-app\.powershell-aliases.ps1"
   ```

3. **Speichern und PowerShell neu starten**

---

### Verfügbare Aliase

| Alias | Beschreibung | Entspricht |
|-------|--------------|------------|
| `cmds` | 📋 **Interaktives Menü** - Zeigt Commands an und erlaubt Auswahl per Nummer | - |
| `start-server` | 🚀 Startet Development Server | `npm run dev` |
| `start-prod` | 🆕 🚀 Startet Production Server | `npm run start-prod` |
| `rebuild-gui` | 🆕 🔧 Rebuilt Frontend komplett und deployed | `npm run build-deploy` |
| `rebuild-all` | 🆕 🔧 Installiert Dependencies + Rebuilt + Deployed | `npm run rebuild-all` |
| `stop-server` | 🛑 Stoppt alle Node.js Prozesse | `Get-Process -Name node \| Stop-Process -Force` |
| `force-stop` | 🛑 Stoppt alle Node.js Prozesse (Force) | `Get-Process -Name node \| Stop-Process -Force` |
| `install-deps` | 📦 Installiert alle Dependencies | `npm run install-all` |
| `view-db` | 🆕 🗄️ Zeigt PostgreSQL Datenbank-Inhalt | - |
| `transcriber` | 📂 Wechselt zum Projekt-Verzeichnis | `cd D:\Projekte\git\mp3-transcriber-app` |

---

## 🎮 Interaktives Menü

Das `cmds` Kommando bietet ein **interaktives Menü**, das automatisch beim Terminal-Start angezeigt wird:

```powershell
# Wird automatisch beim Terminal-Start angezeigt
# Oder manuell starten:
cmds
```

**So funktioniert es:**

1. **Tippe `cmds`** - Das interaktive Menü startet
2. **Du siehst die Aufforderung:**
   ```
   Wähle eine Option (0-9 oder ESC zum Beenden):
   ```
3. **Drücke eine Taste (ohne Enter!):**
   - `1` - Startet den Development Server
   - `2` - Stoppt alle Node.js Prozesse
   - `3` - Force-Stop aller Node.js Prozesse
   - `4` - Installiert Dependencies
   - `5` - Zeigt Datenbank-Inhalt (PostgreSQL)
   - `6` - Wechselt zum Projekt-Verzeichnis
   - `7` - 🆕 Rebuilt Frontend und deployed
   - `8` - 🆕 Rebuilt alles (Dependencies + Frontend + Deploy)
   - `9` - 🆕 Startet Production-Server
   - `0` oder `ESC` - Zurück zum Prompt (sofort, ohne Enter!)
4. **Command wird ausgeführt**
5. **Nach Abschluss:** Drücke Enter, um zurück zum Menü zu gelangen

**Vorteile:**
- ✅ **Automatisch beim Terminal-Start** - Menü wird sofort angezeigt
- ✅ **Ein-Tasten-Eingabe** - Keine Enter-Taste nötig!
- ✅ **ESC-Taste funktioniert** - Sofortiger Exit
- ✅ Keine langen Commands merken
- ✅ Übersichtliche Darstellung
- ✅ Schnelle Navigation per Nummern
- ✅ Perfekt für häufige Aufgaben

---

## 💡 Verwendungsbeispiele

### Development starten

```powershell
# Mit npm
npm run start-server

# Mit PowerShell Alias (wenn aktiviert)
start-server
```

### Server stoppen

```powershell
# Mit npm
npm run stop

# Mit PowerShell Alias
stop-server

# Oder
force-stop
```

### Zum Projekt wechseln

```powershell
# Mit Alias
transcriber

# Manuell
cd D:\Projekte\git\mp3-transcriber-app
```

### Dependencies installieren

```powershell
# Mit npm
npm run install-all

# Mit Alias
install-deps
```

### Hilfe anzeigen

```powershell
# Zeigt interaktives Menü
cmds

# Oder verwende die Aliase direkt:
start-server
stop-server
install-deps
transcriber
```

---

## 🔧 Manuelle Commands

### Node.js Prozesse verwalten

```powershell
# Alle Node.js Prozesse anzeigen
Get-Process -Name node

# Alle Node.js Prozesse stoppen (Force)
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Einzelnen Prozess stoppen (nach PID)
Stop-Process -Id <PID> -Force
```

### Port-Belegung prüfen

```powershell
# Port 5000 (Backend - serviert Frontend + API)
netstat -ano | findstr :5000

# Port 3000 (Frontend Dev Server - nur für lokale Entwicklung)
netstat -ano | findstr :3000
```

### Prozess nach Port-Belegung beenden

```powershell
# Finde PID für Port 5000
$pid = (Get-NetTCPConnection -LocalPort 5000).OwningProcess
Stop-Process -Id $pid -Force
```

---

## 📝 Notizen

- **Production URL:**
  - App: `https://mp3-transcriber.m4itexpertsgmbh.de`
  - Backend: `http://localhost:5000` (intern)

- **Development (lokal):**
  - Backend + Frontend: `http://localhost:5000`
  - React Dev Server (optional): `http://localhost:3000`

- **Cloudflare Tunnel:**
  - Tunnel Name: `mp3-transcriber`
  - Ziel: `http://localhost:5000`
  - Starten: `cloudflared tunnel run mp3-transcriber`

- **Environment Variables:** Konfiguriere in `.env` (siehe `.env.example`)

- **Hot Reload:** Server unterstützt Hot-Reload (nodemon)

- **Temporäre Files:** Hochgeladene MP3s werden nach der Transkription automatisch gelöscht

---

## 🐛 Troubleshooting

### Problem: Port bereits belegt

**Fehlermeldung:** `EADDRINUSE: address already in use :::5000`

**Lösung:**
```powershell
npm run force-stop
# Oder
force-stop
```

### Problem: Dependencies fehlen

**Lösung:**
```powershell
npm run install-all
# Oder
install-deps
```

### Problem: PowerShell Execution Policy

**Fehlermeldung:** `cannot be loaded because running scripts is disabled`

**Lösung:**
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

---

## 📚 Weitere Dokumentation

- [README.md](README.md) - Projekt-Übersicht
- [INSTALLATION.md](INSTALLATION.md) - Installations-Anleitung
- [QUICKSTART.md](QUICKSTART.md) - Schnellstart-Guide
- [ARCHITECTURE.md](ARCHITECTURE.md) - Architektur-Dokumentation
- [WORKFLOW.md](WORKFLOW.md) - Workflow-Beschreibung

---

**Viel Erfolg! 🚀**
