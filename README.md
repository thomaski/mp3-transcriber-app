# 🎙️ MP3 Transcriber App

Eine moderne Full-Stack-Webapp für die Transkription und Zusammenfassung von MP3-Audio-Dateien mit PostgreSQL, Whisper und Llama.

![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/React-18.2-61dafb.svg)
![Node](https://img.shields.io/badge/Node-18+-339933.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791.svg)

> **🎯 Production URL:** `https://mp3-transcriber.m4itexpertsgmbh.de`  
> **🏠 Lokal:** `http://localhost:5000`  
> **📦 Backend:** Port 5000 (serviert Frontend + API)  
> **🗄️ Datenbank:** PostgreSQL (Port 5432)

---

## 📋 Inhaltsverzeichnis

- [Features](#-features)
- [Schnellstart](#-schnellstart)
- [Installation](#-installation)
- [Konfiguration](#️-konfiguration)
- [Verwendung](#-verwendung)
- [Remote Start von Win7](#-remote-start-von-win7)
- [Cloudflare Tunnel](#️-cloudflare-tunnel-externe-tests)
- [API-Endpunkte](#-api-endpunkte)
- [Dokumentation](#-dokumentation)

---

## ✨ Features

### 🆕 Version 2.1.0 Highlights (2026-02-19)

- **🎨 Vereinfachte TranscribeScreen**: Intelligenter "Transkription speichern" Button mit Auto-Logik
- **📊 Optimiertes ControlPanel**: Übersichtliches Button-Layout in einer Zeile
- **👥 Rollenbasiertes Dashboard**: Admin-Funktionen nur für Admins sichtbar
- **🔗 Public Access**: Direkte Weiterleitung zu `/my-transcriptions` nach Verifikation
- **📱 Lazy Loading**: UserManagement wird dynamisch geladen für bessere Performance
- **🎯 Zentriertes Layout**: Benutzerverwaltung perfekt zentriert mit 50/50 Grid
- **🔤 Alphabetische Sortierung**: MP3-Transkriptionen aufsteigend nach Dateinamen sortiert

### Version 2.0.0 Highlights (2026-02-18)

- **🗄️ PostgreSQL**: Migration von SQLite → PostgreSQL für bessere Skalierung
- **💾 DB-Storage**: MP3-Dateien in DB (BYTEA) statt Filesystem
- **👥 User-Zuordnung**: Admins können Transkriptionen Usern zuweisen (mit Autocomplete)
- **📥 Download**: Transkriptionstext als TXT herunterladen
- **🎨 UI-Optimierung**: Edit-Button näher am Text positioniert
- **☁️ Cloudflare Toggle**: Konfigurierbarer Schalter für Cloudflare Tunnel
- **🌐 Remote Start**: Server von Win7 aus starten (PowerShell Remoting)

### Core Features

- 🎵 **MP3-Upload**: Drag-and-Drop oder File-Browser
- 🎧 **Audio Player**: Custom HTML5 Player mit Controls
- 📝 **Transkription**: RunPod Whisper API + Lokale WSL2-Verarbeitung
- 📊 **Zusammenfassung**: RunPod Llama API + Lokale WSL2-Verarbeitung
- ⏱️ **Timestamp-Navigation**: Klickbare Timestamps [HH:MM:SS]
- 🔆 **Playback-Highlighting**: Aktuelle Zeile wird hervorgehoben
- ✏️ **Edit-Modus**: Inline-Editing mit Auto-Save
- 🔒 **Authentication**: JWT mit httpOnly Cookies
- 👥 **User Management**: Admin/User Rollen, CRUD-Operationen
- 🔄 **Real-time Progress**: WebSocket-basierte Live-Updates
- 📱 **Responsive Design**: Desktop, Tablet, Mobile

---

## 🚀 Schnellstart

### Windows PowerShell-Alias (empfohlen)

```powershell
start-server    # Startet Backend (Port 5000)
cmds           # Zeigt alle Befehle
force-stop     # Stoppt Node.js Prozesse
```

### Manuell

```bash
# Installation
npm install
cd client && npm install && cd ..

# Server starten (Backend + Frontend)
npm run server

# Oder Development-Modus (mit Hot-Reload)
npm run dev
```

Die App läuft auf: **http://localhost:5000**

---

## 📦 Installation

### Voraussetzungen

- **Node.js 18+** und npm
- **PostgreSQL 15+** (Port 5432)
- (Optional) RunPod Account für Remote-Verarbeitung
- (Optional) WSL2 + Ubuntu für lokale Verarbeitung

### Schritt 1: Repository klonen

```bash
cd mp3-transcriber-app
```

### Schritt 2: Dependencies installieren

```bash
# Root & Backend
npm install

# Frontend
cd client && npm install && cd ..
```

### Schritt 3: PostgreSQL einrichten

#### 3.1 PostgreSQL installieren (Windows)

Download: https://www.postgresql.org/download/windows/

- Port: `5432`
- Passwort setzen (z.B. `PG9#Detomaso`)

#### 3.2 Datenbank erstellen

```powershell
# PowerShell (als Admin)
psql -U postgres
```

```sql
CREATE DATABASE mp3_transcriber;
\q
```

#### 3.3 Schema laden

```powershell
psql -U postgres -d mp3_transcriber -f server/db/postgresql-schema.sql
```

#### 3.4 Default-User anlegen

```bash
node server/db/seed-pg.js
```

**Standard-User:**
- `tom` / `MT9#Detomaso` (Admin)
- `micha` / `MT9#Schutzengel` (Admin)
- `test` / `test` (User)

### Schritt 4: Environment-Variablen konfigurieren

Erstelle `.env` im Root-Verzeichnis:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# PostgreSQL Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD="PG9#Detomaso"
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=mp3_transcriber

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# RunPod Endpoints (optional)
RUNPOD_WHISPER_ENDPOINT=https://api.runpod.ai/v2/YOUR_WHISPER_ENDPOINT
RUNPOD_LLAMA_ENDPOINT=https://api.runpod.ai/v2/YOUR_LLAMA_ENDPOINT
RUNPOD_API_KEY=YOUR_API_KEY_HERE

# Cloudflare Tunnel (optional)
CLOUDFLARE_TUNNEL_ENABLED=false
CLOUDFLARE_TUNNEL_NAME=mp3-transcriber

# Model Configuration
WHISPER_MODEL=openai/whisper-large-v3
LLAMA_MODEL=avans06/Meta-Llama-3.1-8B-Instruct-ct2-int8_float16

# Upload Configuration
MAX_FILE_SIZE=104857600
```

**⚠️ Wichtig:** Passwörter mit `#` müssen in Anführungszeichen: `"PG9#Detomaso"`

### Schritt 5: Server starten

```bash
npm run server
```

✅ App läuft auf: **http://localhost:5000**

---

## ⚙️ Konfiguration

### Environment-Variablen (.env)

Erstelle `.env` im Root-Verzeichnis:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# PostgreSQL Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD="PG9#Detomaso"
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=mp3_transcriber

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# RunPod Endpoints (optional)
RUNPOD_WHISPER_ENDPOINT=https://api.runpod.ai/v2/YOUR_WHISPER_ENDPOINT
RUNPOD_LLAMA_ENDPOINT=https://api.runpod.ai/v2/YOUR_LLAMA_ENDPOINT
RUNPOD_API_KEY=YOUR_API_KEY_HERE

# Cloudflare Tunnel (optional)
CLOUDFLARE_TUNNEL_ENABLED=false
CLOUDFLARE_TUNNEL_NAME=mp3-transcriber

# Model Configuration
WHISPER_MODEL=openai/whisper-large-v3
LLAMA_MODEL=avans06/Meta-Llama-3.1-8B-Instruct-ct2-int8_float16

# Upload Configuration
MAX_FILE_SIZE=104857600
```

**⚠️ Wichtig:** Passwörter mit `#` müssen in Anführungszeichen: `"PG9#Detomaso"`

### Development vs. Production

Die App unterstützt verschiedene Umgebungen für sicheres Deployment:

#### Development-Modus

**Verwendung:**
```bash
cd client
npm start  # Dev-Server auf Port 3000
```

**Features:**
- ✅ Demo-Zugangsdaten im Login-Screen angezeigt (`user=test | pwd=test`)
- ✅ Placeholder-Texte in Eingabefeldern
- ✅ Hot-Reload aktiviert
- 🔧 Konfiguration: `client/.env.development`

#### Production-Modus

**Verwendung:**
```bash
cd client
npm run build  # Erstellt optimierten Build

# Deployment
cd ..
Remove-Item -Recurse -Force server\public
Copy-Item -Recurse client\build server\public
npm run server  # Startet Production-Server auf Port 5000
```

**Features:**
- ❌ Keine Demo-Zugangsdaten im Login-Screen
- ❌ Keine Placeholder-Texte (Sicherheit)
- ✅ Optimierte Build-Dateien
- 🔒 Konfiguration: `client/.env.production`

**🔐 Sicherheitshinweis:**
- Im Production-Build werden **keine** Login-Hints oder Demo-Credentials angezeigt
- Der Login-Screen ist in Production vollständig blank (nur Labels)
- Siehe `ENV_CONFIGURATION.md` für Details

### Frontend Environment (.env.local) 🆕

**Optional:** Erstelle `client/.env.local` für Frontend-Konfiguration:

```env
# API Base URL (relative path für Reverse Proxy)
REACT_APP_API_URL=/api

# Deaktiviere automatisches Browser-Öffnen
BROWSER=none
```

**Erklärung:**
- `REACT_APP_API_URL=/api` - Verwendet relative Pfade, funktioniert mit Reverse Proxy und Cloudflare Tunnel
- `BROWSER=none` - Verhindert automatisches Öffnen von `localhost:3000` (React Dev Server)

**Hinweis:** Die Frontend-Komponenten verwenden automatisch `window.location.origin` als Fallback, daher ist `.env.local` **optional**.

### Ports

| Port | Service | Zugriff |
|------|---------|---------|
| **5000** | **Backend + Frontend** | ✅ Öffentlich |
| 5432 | PostgreSQL | 🔒 Intern |

---

## 💻 Verwendung

### Workflow: Lokale Transkription (WSL2)

1. **MP3 laden**: Drag & Drop oder Standard-Datei
2. **Transcribe**: "Transcribe MP3 (lokal)" → Startet sofort
3. **Live-Output**: Terminal-Style Modal zeigt Fortschritt
4. **Fertig**: Transkription + MP3 geladen

### Workflow: Remote-Transkription (RunPod)

1. **MP3 hochladen**: Via Upload-Button
2. **Transcribe**: "Transcribe MP3" → RunPod API
3. **Progress**: WebSocket-basierte Live-Updates
4. **Summarize**: "Summarize" → Zusammenfassung mit Headings

### Admin: Transkription einem User zuweisen

1. **Als Admin einloggen**
2. **MP3 hochladen & transkribieren**
3. **User-Selector**: Autocomplete-Feld nutzen
4. **Speichern**: Transkription wird für ausgewählten User gespeichert

### Transkription herunterladen

```javascript
// Frontend-Code
const downloadTranscription = async (transcriptionId) => {
  const response = await fetch(`/api/transcriptions/${transcriptionId}/download`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transcription.txt';
  a.click();
};
```

---

## 🌐 Remote Start von Win7

### Was ist das?

Das `remote-start-from-win7.ps1` Script startet den MP3 Transcriber Server auf dem **Win11 Rechner** von einem **Win7 Rechner** aus via PowerShell Remoting.

### Funktionsweise

1. **PowerShell Remoting**: Nutzt `Invoke-Command` für Remote-Ausführung
2. **Credential-Abfrage**: Sicherer Login mit Benutzername/Passwort
3. **Status-Check**: Prüft ob Server bereits läuft
4. **Auto-Start**: Startet Server falls nicht aktiv

### Verwendung

```powershell
# Auf Win7 Rechner:
.\remote-start-from-win7.ps1

# Eingabe:
# - Benutzername (Win11)
# - Passwort (Win11)

# → Server startet auf Win11
# → Erreichbar unter: http://192.168.178.20:5000
```

### Voraussetzungen

- PowerShell Remoting auf Win11 aktiviert
- Netzwerkverbindung zwischen Win7 und Win11
- Gültige Anmeldedaten für Win11

### Technische Details

- **Ziel-IP**: `192.168.178.20` (Win11)
- **Ziel-Port**: `5000`
- **Remote-Command**: `cd D:\Projekte\git\mp3-transcriber-app; npm run dev`

---

## ☁️ Cloudflare Tunnel (Externe Tests)

### Konfiguration

#### `.env` - Tunnel aktivieren/deaktivieren

```env
CLOUDFLARE_TUNNEL_ENABLED=true   # true = aktiviert, false = deaktiviert
CLOUDFLARE_TUNNEL_NAME=mp3-transcriber
```

### Einmalige Einrichtung (5 Minuten)

#### 1. Installation

```powershell
winget install --id Cloudflare.cloudflared
```

#### 2. Login

```powershell
cloudflared tunnel login
```

→ Browser öffnet sich, Account erstellen (kostenlos)

#### 3. Named Tunnel erstellen

```powershell
cd D:\Projekte\git\mp3-transcriber-app
cloudflared tunnel create mp3-transcriber
```

→ Tunnel-ID wird angezeigt (notieren!)

#### 4. Konfigurationsdatei erstellen

Erstelle `C:\Users\tom\.cloudflared\config.yml`:

```yaml
tunnel: mp3-transcriber
credentials-file: C:\Users\tom\.cloudflared\<TUNNEL-ID>.json

ingress:
  - hostname: mp3-transcriber.m4itexpertsgmbh.de
    service: http://localhost:5000
  - service: http_status:404
```

#### 5. DNS Route erstellen

```powershell
cloudflared tunnel route dns mp3-transcriber mp3-transcriber.m4itexpertsgmbh.de
```

### Tägliche Nutzung (1 Befehl)

```powershell
.\start-cloudflare.ps1
```

**ODER manuell:**

```powershell
cloudflared tunnel run mp3-transcriber
```

### Production URL

**✅ Permanente URL:** `https://mp3-transcriber.m4itexpertsgmbh.de`

---

## 🔌 API-Endpunkte

### Authentication

```
POST /api/auth/login       # Login (gibt JWT-Token zurück)
POST /api/auth/logout      # Logout
GET  /api/auth/me          # Aktueller User
GET  /api/auth/check       # Auth-Status prüfen
```

### Users (Admin only)

```
GET  /api/users                     # Liste aller User
GET  /api/users/search?q=tom        # 🆕 User-Suche (Autocomplete)
GET  /api/users/:id                 # User-Details
POST /api/users                     # User erstellen
PUT  /api/users/:id                 # User aktualisieren
DELETE /api/users/:id               # User löschen
GET  /api/users/:id/transcriptions  # User-Transkriptionen
```

### Transcriptions

```
GET    /api/transcriptions              # Liste (User oder Admin)
POST   /api/transcriptions              # Neu (mit target_user_id für Admin)
GET    /api/transcriptions/:id          # Details
GET    /api/transcriptions/:id/audio    # 🆕 Stream MP3 aus DB
GET    /api/transcriptions/:id/download # 🆕 Download als TXT
PUT    /api/transcriptions/:id          # Update
DELETE /api/transcriptions/:id          # Delete
```

### Transcribe & Summarize (Local)

```
POST /api/transcribe-local    # WSL2 Transkription
POST /api/summarize-local     # WSL2 Summarization
GET  /api/local-files/list    # Lokale Dateien auflisten
```

### Transcribe & Summarize (Remote)

```
POST /api/transcribe          # RunPod Transkription
POST /api/summarize           # RunPod Summarization
POST /api/upload              # File-Upload
```

### File Management

```
GET    /api/files/stream?path=<path>  # Stream lokale Datei
GET    /api/files/:filename           # Download hochgeladene Datei
DELETE /api/files/:filename           # Lösche hochgeladene Datei
```

---

## 📚 Dokumentation

### Hauptdokumente

- **[CHANGELOG.md](./CHANGELOG.md)** - Alle Änderungen & Versionen
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technische Architektur
- **[POSTGRESQL_MIGRATION.md](./POSTGRESQL_MIGRATION.md)** - Migration SQLite → PostgreSQL
- **[DOCS_INDEX.md](./DOCS_INDEX.md)** - Dokumentations-Übersicht

### Spezifische Anleitungen

- **[INSTALLATION.md](./INSTALLATION.md)** - Detaillierte Setup-Anleitung
- **[WSL2_INTEGRATION.md](./WSL2_INTEGRATION.md)** - WSL2-Setup & Python-Integration
- **[WORKFLOW.md](./WORKFLOW.md)** - Benutzer-Workflows
- **[COMMANDS.md](./COMMANDS.md)** - Alle Befehle & PowerShell-Alias
- **[NETWORK_ACCESS.md](./NETWORK_ACCESS.md)** - Netzwerk-Zugriff konfigurieren

---

## 🏗️ Architektur

### Technologie-Stack

#### Frontend
- React 18.2, Tailwind CSS, Monaco Editor
- Socket.io-client, Axios, React Icons

#### Backend
- Node.js 18+, Express, Socket.io
- Multer (File-Upload), bcrypt, jsonwebtoken
- **pg** (PostgreSQL Client) 🆕

#### Datenbank
- **PostgreSQL 15+** (statt SQLite) 🆕
- UUID für IDs, BYTEA für MP3-Dateien
- JSONB für audit_logs

#### Deployment
- Cloudflare Tunnel (permanente URL)
- Single-Port Backend (Port 5000)
- Auto-Cleanup für temporäre Files

### Projektstruktur

```
mp3-transcriber-app/
├── client/                      # React Frontend
│   ├── src/
│   │   ├── components/          # React Components
│   │   ├── services/            # API Services
│   │   ├── utils/               # Utilities
│   │   └── App.js
│   └── package.json
├── server/                      # Node.js Backend
│   ├── db/
│   │   ├── database-pg.js       # 🆕 PostgreSQL Connection
│   │   ├── postgresql-schema.sql # 🆕 PostgreSQL Schema
│   │   └── seed-pg.js           # 🆕 Seed Script
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users-pg.js          # 🆕 User Management (PostgreSQL)
│   │   ├── transcriptions-pg.js # 🆕 Transcriptions (PostgreSQL)
│   │   ├── transcribe.js
│   │   ├── summarize.js
│   │   └── upload.js
│   └── index.js
├── .env                         # Environment Variables
├── package.json
└── README.md
```

---

## 🐛 Troubleshooting

### PostgreSQL Connection Error

**Problem:** `Passwort-Authentifizierung für Benutzer 'postgres' fehlgeschlagen`

**Lösung:**
1. Passwort mit `#` in Anführungszeichen in `.env`: `"PG9#Detomaso"`
2. `dotenv.config()` in DB-Scripts vorhanden?
3. PostgreSQL läuft: `Get-Service postgresql-*`

### Server läuft bereits (Port 5000 belegt)

**Problem:** `EADDRINUSE: address already in use 0.0.0.0:5000`

**Lösung:**
```powershell
npm run force-stop    # Stoppt alle Node-Prozesse
```

### WebSocket-Verbindung schlägt fehl

**Lösung:** Überprüfe CORS in `server/index.js`:
```javascript
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5000',
    methods: ['GET', 'POST']
  }
});
```

### Cloudflare Tunnel startet nicht

**Lösung:**
1. `.env` prüfen: `CLOUDFLARE_TUNNEL_ENABLED=true`
2. Tunnel existiert: `cloudflared tunnel list`
3. Config-Datei vorhanden: `C:\Users\tom\.cloudflared\config.yml`

---

## 📄 Lizenz

MIT License

---

## 🤝 Contributing

Contributions sind willkommen! Bitte erstelle einen Pull Request.

---

## 📧 Support

Bei Fragen oder Problemen:
1. Durchsuche die [Dokumentation](#-dokumentation)
2. Prüfe das [CHANGELOG.md](./CHANGELOG.md)
3. Erstelle ein GitHub Issue

---

**Erstellt mit ❤️ für spirituelle Audio-Transkription**

**Version:** 2.0.0  
**Letzte Aktualisierung:** 2026-02-18
