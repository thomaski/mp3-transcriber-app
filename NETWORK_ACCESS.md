# 🌐 Netzwerk-Zugriff Anleitung

**MP3 Transcriber App im lokalen Netzwerk verfügbar machen**

---

## 📋 Übersicht

Diese Anleitung zeigt, wie du die MP3 Transcriber App von anderen Rechnern in deinem lokalen Netzwerk (z.B. von einem Win7 Rechner) aufrufen kannst.

**Deine Netzwerk-Konfiguration:**
- **Win11 Rechner (Server)**: `192.168.178.20`
- **Win7 Rechner (Client)**: `\\TOM-ZBOX-ID-92`

---

## 🔍 Verfügbare Alternativen (Bewertung)

| Option | Aufwand | Bewertung | Beschreibung |
|--------|---------|-----------|--------------|
| **1. Node.js auf 0.0.0.0** | ⭐ Sehr gering | 10/10 ⭐ | Server lauscht auf allen Interfaces |
| 2. Reverse Proxy (nginx) | ⭐⭐ Mittel | 7/10 | Professionell, aber komplexer |
| 3. SSH Tunnel | ⭐⭐⭐ Hoch | 4/10 | Sehr komplex für Windows |
| 4. VNC/Remote Desktop | ⭐⭐ Mittel | 6/10 | Nicht ideal für Web-Apps |

**✅ Empfehlung: Option 1 - Node.js auf 0.0.0.0 binden**

---

## 📋 Schritt-für-Schritt-Anleitung

### **SCHRITT 1: Backend-Server anpassen** ✅

Der Backend-Server wurde bereits so konfiguriert, dass er auf allen Netzwerk-Interfaces lauscht (`0.0.0.0`).

**Datei:** `server/index.js`
```javascript
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`  📡 Netzwerk-Zugriff: http://192.168.178.20:${PORT}`);
});
```

---

### **SCHRITT 2: React Dev-Server konfigurieren** ✅

Eine `.env` Datei wurde im `client/` Ordner erstellt:

**Datei:** `client/.env`
```
HOST=0.0.0.0
PORT=3000
DANGEROUSLY_DISABLE_HOST_CHECK=true
```

---

### **SCHRITT 3: Windows Firewall konfigurieren**

**Wichtig:** Die Windows Firewall muss die Ports 3000 (Frontend) und 5000 (Backend) für dein lokales Netzwerk freigeben.

#### Option A: PowerShell (Empfohlen, Admin-Rechte erforderlich)

```powershell
# Port 3000 freigeben (React Frontend)
New-NetFirewallRule -DisplayName "MP3 Transcriber Frontend" `
  -Direction Inbound `
  -LocalPort 3000 `
  -Protocol TCP `
  -Action Allow `
  -Profile Private

# Port 5000 freigeben (Backend API)
New-NetFirewallRule -DisplayName "MP3 Transcriber Backend" `
  -Direction Inbound `
  -LocalPort 5000 `
  -Protocol TCP `
  -Action Allow `
  -Profile Private
```

#### Option B: GUI (Manuell)

1. **Öffne Windows Defender Firewall:**
   - Drücke `Win + R`
   - Tippe: `wf.msc`
   - Enter

2. **Neue Regel erstellen (Port 3000):**
   - Links: "Eingehende Regeln" → Rechtsklick → "Neue Regel..."
   - Regeltyp: **Port**
   - Protokoll: **TCP**
   - Port: **3000**
   - Aktion: **Verbindung zulassen**
   - Profile: **Privat** (aktivieren)
   - Name: `MP3 Transcriber Frontend`

3. **Neue Regel erstellen (Port 5000):**
   - Wiederhole die Schritte für Port **5000**
   - Name: `MP3 Transcriber Backend`

---

### **SCHRITT 4: Server starten**

#### Via PowerShell:

```powershell
# Ins Projekt-Verzeichnis wechseln
cd D:\Projekte\git\mp3-transcriber-app

# Server starten
npm run dev

# Oder mit dem cmds-Menü:
cmds
# Dann: 1 drücken
```

#### Was du sehen solltest:

```
════════════════════════════════════════════════════════════════
  🚀 MP3 Transcriber Server läuft auf 0.0.0.0:5000
  📡 Netzwerk-Zugriff: http://192.168.178.20:5000
════════════════════════════════════════════════════════════════
```

Und für das Frontend:

```
Compiled successfully!

You can now view the app in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.178.20:3000
```

---

### **SCHRITT 5: Zugriff vom Win7 Rechner**

#### Im Browser auf dem Win7 Rechner öffnen:

```
http://192.168.178.20:3000
```

**Wichtig:** Verwende die **IP-Adresse**, nicht `localhost`!

---

## 🧪 Testen der Verbindung

### Von deinem Win11 Rechner (lokal):

```powershell
# Test Backend
curl http://localhost:5000/api/files/info

# Test Frontend
curl http://localhost:3000
```

### Von deinem Win7 Rechner (Netzwerk):

```
# In PowerShell oder CMD:
curl http://192.168.178.20:5000/api/files/info
```

Oder öffne einfach im Browser:
```
http://192.168.178.20:3000
```

---

## 🚀 Server automatisch starten

Du hast mehrere Optionen, den Server automatisch oder vom Win7 Rechner aus zu starten:

### **Option A: Autostart beim Systemstart** ⭐ Empfohlen!

Der Server startet automatisch, wenn du dich am Win11 Rechner anmeldest.

```powershell
# Als Administrator ausführen:
cd D:\Projekte\git\mp3-transcriber-app
.\setup-autostart.ps1
```

**Was macht das Skript?**
- ✅ Erstellt eine geplante Aufgabe
- ✅ Server startet automatisch beim Anmelden
- ✅ Läuft im Hintergrund

**Manuelle Steuerung:**
```powershell
# Server manuell starten
Start-ScheduledTask -TaskName "MP3 Transcriber Server"

# Server stoppen
Stop-ScheduledTask -TaskName "MP3 Transcriber Server"

# Autostart deaktivieren
Unregister-ScheduledTask -TaskName "MP3 Transcriber Server"
```

---

### **Option B: Remote-Start vom Win7 Rechner**

Starte den Server direkt vom Win7 Rechner aus!

**Schritt 1: Setup auf dem Win11 Rechner**
```powershell
# Als Administrator ausführen:
cd D:\Projekte\git\mp3-transcriber-app
.\setup-remote-start.ps1
```

**Schritt 2: Vom Win7 Rechner starten**
1. Kopiere `remote-start-from-win7.ps1` auf den Win7 Rechner
2. Führe aus:
   ```powershell
   powershell -ExecutionPolicy Bypass -File remote-start-from-win7.ps1
   ```
3. Gib deine Win11 Anmeldedaten ein
4. Server wird gestartet! 🎉

**Was wird aktiviert?**
- ✅ PowerShell Remoting (WinRM)
- ✅ Zugriff vom privaten Netzwerk (192.168.178.*)
- ✅ Automatisches Start-Skript

---

## 🔧 Troubleshooting

### Problem 1: "Die Seite kann nicht erreicht werden"

**Ursache:** Firewall blockiert die Verbindung

**Lösung:**
1. Prüfe ob die Firewall-Regeln aktiv sind:
   ```powershell
   Get-NetFirewallRule -DisplayName "*MP3 Transcriber*"
   ```

2. Falls keine Regeln existieren, erstelle sie (siehe Schritt 3)

3. Teste die Verbindung mit `telnet`:
   ```cmd
   telnet 192.168.178.20 3000
   telnet 192.168.178.20 5000
   ```

---

### Problem 2: "Invalid Host header"

**Ursache:** React Dev-Server blockiert Anfragen von anderen Hosts

**Lösung:** Prüfe ob `client/.env` existiert und korrekt ist:
```
HOST=0.0.0.0
DANGEROUSLY_DISABLE_HOST_CHECK=true
```

---

### Problem 3: Backend-API nicht erreichbar

**Ursache:** CORS-Probleme oder falsche Backend-URL

**Lösung:**
1. Prüfe die CORS-Konfiguration in `server/index.js`
2. Stelle sicher, dass das Backend läuft:
   ```powershell
   netstat -ano | findstr :5000
   ```

---

### Problem 4: WebSockets funktionieren nicht

**Ursache:** Socket.io kann keine Verbindung aufbauen

**Lösung:**
1. Stelle sicher, dass beide Ports (3000 + 5000) offen sind
2. Prüfe die Socket.io-Konfiguration in `client/src/App.js`
3. Socket.io verbindet sich automatisch mit dem Backend über Port 5000

---

## 📊 Port-Übersicht

| Port | Dienst | Zugriff |
|------|--------|---------|
| 3000 | React Frontend | http://192.168.178.20:3000 |
| 5000 | Backend API + Socket.io | http://192.168.178.20:5000 |

---

## 🔒 Sicherheitshinweise

### Für lokales Netzwerk (empfohlen):

✅ **Firewall-Profil "Privat"** verwenden
✅ **Nur lokale Netzwerk-Zugriffe** erlauben (192.168.x.x)
✅ **Kein Port-Forwarding im Router** einrichten

### Für öffentliche Netzwerke:

❌ **NICHT empfohlen** - Die App hat keine Authentifizierung!
⚠️ Falls doch nötig: Verwende einen Reverse Proxy mit HTTPS + Auth

---

## 🎉 Fertig!

Wenn alles korrekt eingerichtet ist, kannst du jetzt:

1. **Auf dem Win11 Rechner:**
   - Server starten mit `npm run dev` oder `cmds` → `1`
   - Zugriff: http://localhost:3000

2. **Auf dem Win7 Rechner:**
   - Browser öffnen
   - URL: http://192.168.178.20:3000
   - Die App funktioniert genauso wie lokal! 🎊

---

## 📚 Weiterführende Dokumentation

- [README.md](README.md) - Projekt-Übersicht
- [INSTALLATION.md](INSTALLATION.md) - Installations-Anleitung
- [COMMANDS.md](COMMANDS.md) - Verfügbare Commands
- [ARCHITECTURE.md](ARCHITECTURE.md) - Architektur-Dokumentation

---

**Viel Erfolg! 🚀**
