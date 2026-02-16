# 🎯 Command Reference - MP3 Transcriber App

Diese Datei enthält alle verfügbaren Commands und Aliase für die MP3 Transcriber App.

---

## 📦 NPM Scripts

Diese Commands können direkt mit `npm run <script>` ausgeführt werden:

| Command | Beschreibung |
|---------|--------------|
| `npm run dev` | Startet Frontend + Backend Development Server |
| `npm run start-server` | Alias für `npm run dev` |
| `npm run server` | Startet nur den Backend-Server (Port 5000) |
| `npm run client` | Startet nur den React-Client (Port 3000) |
| `npm run build` | Erstellt Production Build des Frontends |
| `npm run start` | Startet Production-Server (nur Backend) |
| `npm run install-all` | Installiert alle Dependencies (Root + Client) |
| `npm run stop` | Stoppt alle Node.js Prozesse |
| `npm run force-stop` | Stoppt alle Node.js Prozesse (Force) |

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
| `stop-server` | 🛑 Stoppt alle Node.js Prozesse | `Get-Process -Name node \| Stop-Process -Force` |
| `force-stop` | 🛑 Stoppt alle Node.js Prozesse (Force) | `Get-Process -Name node \| Stop-Process -Force` |
| `install-deps` | 📦 Installiert alle Dependencies | `npm run install-all` |
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
   Wähle eine Option (0-5 oder ESC zum Beenden):
   ```
3. **Drücke eine Taste (ohne Enter!):**
   - `1` - Startet den Development Server
   - `2` - Stoppt alle Node.js Prozesse
   - `3` - Force-Stop aller Node.js Prozesse
   - `4` - Installiert Dependencies
   - `5` - Wechselt zum Projekt-Verzeichnis
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
# Port 3000 (Frontend)
netstat -ano | findstr :3000

# Port 5000 (Backend)
netstat -ano | findstr :5000
```

### Prozess nach Port-Belegung beenden

```powershell
# Finde PID für Port 5000
$pid = (Get-NetTCPConnection -LocalPort 5000).OwningProcess
Stop-Process -Id $pid -Force
```

---

## 📝 Notizen

- **Development Ports:**
  - Frontend: `http://localhost:3000`
  - Backend: `http://localhost:5000`

- **Environment Variables:** Konfiguriere in `.env` (siehe `.env.example`)

- **Hot Reload:** Beide Server unterstützen Hot-Reload (nodemon + react-scripts)

- **Logs:** Server-Logs werden in der Konsole angezeigt (mit concurrently)

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
