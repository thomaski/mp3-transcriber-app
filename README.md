# 🎙️ MP3 Transcriber App

Eine moderne Full-Stack-Webapp für die Transkription und Zusammenfassung von MP3-Audio-Dateien mit Whisper und Llama.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/React-18.2-61dafb.svg)
![Node](https://img.shields.io/badge/Node-18+-339933.svg)

## 📋 Inhaltsverzeichnis

- [Features](#features)
- [Screenshots](#screenshots)
- [Architektur](#architektur)
- [Installation](#installation)
- [Konfiguration](#konfiguration)
- [Verwendung](#verwendung)
- [API-Endpunkte](#api-endpunkte)
- [URL-Parameter](#url-parameter)
- [Entwicklung](#entwicklung)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## ✨ Features

### 🆕 Neue Features (2026)

- 🐧 **WSL2 Integration**: Lokale Transkription & Summarization mit Python-Skripten
  - **Transcribe MP3 (lokal)**: Faster-Whisper via WSL2
  - **Summarize (lokal)**: Llama-3.1-8B via WSL2
  - Live-Output-Streaming mit ANSI-Farben
  - Auto-Close bei Erfolg
- 🎯 **Intelligente Dateiauswahl**: 
  - MP3 geladen → Sofort transkribieren, kein Modal!
  - Transkription ohne Summary → Direkt summarizen!
  - Doppelklick in Modals → Sofortauswahl
- 📁 **Standard-Dateien**: Auto-Load beim Start ohne Parameter
- 🎨 **Inline-Editing**: Zeilenweise editieren, auto-save, Header-Editing
- ⌨️ **Keyboard-Shortcuts**: `Ctrl+E` für Edit-Modus, `Esc` zum Beenden
- 🎵 **Player-Verbesserungen**: Dateiname-Anzeige, Auto-Load nach Transkription
- 📺 **Live-Output-Modal**: Terminal-Style mit Fortschrittsbalken (80% × 70%)

### Core Features
- 🎵 **MP3-Upload**: Drag-and-Drop oder File-Browser
- 🎧 **HTML5 Audio Player**: Custom Controls mit Play/Pause/Stop, Seek, Volume
- 📝 **Transkription**: RunPod Whisper API + Lokale WSL2-Verarbeitung
- 📊 **Zusammenfassung**: RunPod Llama API + Lokale WSL2-Verarbeitung
- ⏱️ **Timestamp-Navigation**: Klickbare Timestamps [HH:MM:SS] zum Springen im Audio
- 🔆 **Playback-Highlighting**: Aktuelle Zeile wird hervorgehoben und zentriert
- 📑 **Summary-Navigation**: Klickbare Überschriften, "↑ Zur Zusammenfassung"-Button
- ✏️ **Edit-Modus**: Inline-Editing einzelner Zeilen + Header
- 📁 **Text-Import**: TXT-Dateien per Drag-and-Drop laden
- 🔄 **Real-time Progress**: WebSocket-basierte Live-Updates
- 📱 **Responsive Design**: Optimiert für Desktop, Tablet und Mobile

### Technische Features
- ⚡ **WebSocket**: Socket.io für Echtzeit-Kommunikation (Remote + WSL2)
- 🎨 **Tailwind CSS**: Moderne, responsive UI
- 🔒 **Error Handling**: Umfassendes Error-Management
- 📦 **File Management**: Upload + lokale Datei-Streaming
- 🌐 **URL-Parameter**: MP3/Text via URL laden, Edit-Modus aktivieren
- 💾 **Persistent Storage**: Server-seitiges File-Management
- 🐧 **WSL2-Bridge**: Node.js ↔ WSL2 Python via `child_process.spawn`
- 🎨 **ANSI-Support**: Farbige Terminal-Ausgaben im Browser

## 🖼️ Screenshots

Das Layout orientiert sich an Sonix (siehe `./base-data/sonix.jpg`):
- **Oben**: Audio-Player mit Waveform und Controls
- **Mitte**: Control-Panel mit Buttons (Transcribe, Summarize, Edit)
- **Unten**: Transkriptionsbereich mit klickbaren Timestamps

## 🏗️ Architektur

### Technologie-Stack

#### Frontend
- **React 18.2**: UI-Framework
- **Tailwind CSS**: Styling
- **Monaco Editor**: Code-Editor für Edit-Modus
- **react-dropzone**: Drag-and-Drop File-Upload
- **Socket.io-client**: WebSocket-Kommunikation
- **Axios**: HTTP-Client
- **React Icons**: Icon-Library

#### Backend
- **Node.js**: Runtime
- **Express**: Web-Framework
- **Socket.io**: WebSocket-Server
- **Multer**: File-Upload-Middleware
- **Axios**: HTTP-Client für RunPod API
- **dotenv**: Environment-Management

### Projektstruktur

```
mp3-transcriber-app/
├── client/                      # React Frontend
│   ├── public/
│   │   ├── index.html
│   │   └── manifest.json
│   ├── src/
│   │   ├── components/          # React Components
│   │   │   ├── AudioPlayer.js   # Audio-Player mit Controls
│   │   │   ├── TranscriptView.js # Transkript-Anzeige + Inline-Editing
│   │   │   ├── ControlPanel.js  # Button-Panel (lokal + remote)
│   │   │   ├── DropZone.js      # Drag-and-Drop Zone (MP3)
│   │   │   ├── TextDropZone.js  # Text-Drop-Zone (Edit-Modus)
│   │   │   ├── ProgressModal.js # Progress-Overlay (remote)
│   │   │   ├── LiveOutputModal.js # Live-Output (WSL2)
│   │   │   └── FileSelectionModal.js # Datei-Auswahl
│   │   ├── services/
│   │   │   └── api.js           # API-Service (remote + lokal)
│   │   ├── utils/
│   │   │   └── helpers.js       # Utility-Funktionen
│   │   ├── App.js               # Main App Component
│   │   ├── index.js             # Entry Point
│   │   └── index.css            # Global Styles + Tailwind
│   ├── package.json
│   └── tailwind.config.js
│
├── server/                      # Node.js Backend
│   ├── routes/
│   │   ├── transcribe.js        # Transkription (RunPod)
│   │   ├── summarize.js         # Zusammenfassung (RunPod)
│   │   ├── transcribe-local.js  # Transkription (WSL2)
│   │   ├── summarize-local.js   # Zusammenfassung (WSL2)
│   │   ├── local-files.js       # Lokale Dateiliste
│   │   ├── upload.js            # Upload-Route
│   │   └── files.js             # File-Management + Streaming
│   └── index.js                 # Server Entry Point
│
├── base-data/                   # Original Python-Skripte & Beispiele
│   ├── transcribe.py            # Original-Skript (WSL2)
│   ├── summarize.py             # Original-Skript (WSL2)
│   ├── test_3min.txt            # Beispiel-Transkription
│   ├── test_3min_s.txt          # Beispiel-Summary
│   └── sonix.jpg                # UI-Referenz
│
├── uploads/                     # Upload-Verzeichnis (auto-created)
├── .env                         # Environment-Variablen
├── .gitignore
├── package.json                 # Root Package
├── README.md                    # Dieses Dokument
├── INSTALLATION.md              # Detaillierte Setup-Anleitung
├── ARCHITECTURE.md              # Technische Architektur
├── WSL2_INTEGRATION.md          # WSL2-Setup & -Verwendung
├── WORKFLOW.md                  # Benutzer-Workflows
├── COMMANDS.md                  # Alle Befehle
└── UPDATES.md                   # Changelog & neue Features
```

## 🚀 Installation

### Voraussetzungen
- Node.js 18+ und npm
- (Optional) RunPod Account mit Whisper und Llama Endpoints
- (Optional) WSL2 + Ubuntu für lokale Verarbeitung (siehe [WSL2_INTEGRATION.md](./WSL2_INTEGRATION.md))

### Schnellstart

**Windows PowerShell-Alias (empfohlen):**
```powershell
start_server    # Startet den Dev-Server
cmds            # Zeigt alle Befehle
force_stop      # Beendet Node-Prozesse
```

**Manuelle Installation:**

### Schritt 1: Repository klonen
```bash
cd mp3-transcriber-app
```

### Schritt 2: Dependencies installieren
```bash
# Root & Backend Dependencies
npm install

# Frontend Dependencies
cd client
npm install
cd ..
```

Oder alle auf einmal:
```bash
npm run install-all
```

### Schritt 3: Environment-Variablen konfigurieren
Erstelle eine `.env` Datei im Root-Verzeichnis (siehe [Konfiguration](#konfiguration))

## ⚙️ Konfiguration

Erstelle eine `.env` Datei im Root-Verzeichnis:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# RunPod Endpoints
RUNPOD_WHISPER_ENDPOINT=https://api.runpod.ai/v2/YOUR_WHISPER_ENDPOINT
RUNPOD_LLAMA_ENDPOINT=https://api.runpod.ai/v2/YOUR_LLAMA_ENDPOINT

# RunPod API Keys (optional)
RUNPOD_API_KEY=YOUR_API_KEY_HERE

# Model Configuration
WHISPER_MODEL=openai/whisper-large-v3
LLAMA_MODEL=avans06/Meta-Llama-3.1-8B-Instruct-ct2-int8_float16

# Upload Configuration
MAX_FILE_SIZE=104857600
UPLOAD_DIR=./uploads
```

### RunPod Setup

Die App erwartet folgende RunPod-Endpoints:

#### Whisper Endpoint
- **Modell**: `openai/whisper-large-v3` (CT2-Format int8_float16)
- **Input**: Base64-codiertes Audio
- **Parameter**: `language`, `beam_size`, `vad_filter`, etc.
- **Output**: Segments mit `start`, `text`

#### Llama Endpoint
- **Modell**: `avans06/Meta-Llama-3.1-8B-Instruct-ct2-int8_float16`
- **Input**: Prompt-Text
- **Parameter**: `max_length`, `temperature`, `repetition_penalty`
- **Output**: Generated text

**Hinweis**: Die genaue API-Struktur muss ggf. in `server/routes/transcribe.js` und `server/routes/summarize.js` angepasst werden.

## 💻 Verwendung

### Development Mode

**Mit PowerShell-Alias (empfohlen):**
```powershell
start_server    # Startet Backend + Frontend
```

**Manuell:**
Starte Backend und Frontend gleichzeitig:
```bash
npm run dev
```

Oder separat:
```bash
# Terminal 1: Backend
npm run server

# Terminal 2: Frontend
npm run client
```

Die App läuft auf:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000

### Workflow-Beispiele

#### 1. Lokale Transkription (WSL2)
```
1. MP3 laden (Drag & Drop oder Standard-Datei)
2. Klick "Transcribe MP3 (lokal)"
   → Startet sofort! Kein Modal! ✅
3. Live-Output-Modal zeigt Fortschritt
4. Transkription + MP3 geladen
```

#### 2. Lokale Summarization aus aktueller Transkription
```
1. Transkription ist geladen (ohne "Gesamtzusammenfassung:")
2. Klick "Summarize (lokal)"
   → Verwendet aktuelle Transkription! Kein Modal! ✅
3. Live-Output → Summary mit klickbaren Headings
```

#### 3. Remote-Verarbeitung (RunPod)
```
1. MP3 hochladen
2. Klick "Transcribe MP3" (RunPod)
3. Progress-Modal zeigt Status
4. Klick "Summarize" (RunPod)
5. Fertig!
```

#### 4. Inline-Editing
```
1. Ctrl+E (Edit-Modus)
2. Klick auf Zeile → Editierbar
3. Änderungen → Auto-Save beim Verlassen
4. Esc (Edit-Modus beenden)
```

### Workflow (alt)

1. **MP3 hochladen**:
   - Datei per Drag-and-Drop in die DropZone ziehen
   - Oder über URL-Parameter laden: `?mp3=/path/to/file.mp3`
   - Oder Standard-Datei wird automatisch geladen

2. **Transkribieren**:
   - **Lokal**: "Transcribe MP3 (lokal)" → Sofort, wenn MP3 geladen
   - **Remote**: "Transcribe MP3" → RunPod API
   - Live-Output/Progress-Modal zeigt Fortschritt
   - Transkription erscheint mit Timestamps

3. **Timestamps verwenden**:
   - Auf beliebigen Timestamp `[HH:MM:SS]` klicken
   - Audio springt zur entsprechenden Position
   - Aktuelle Zeile wird hervorgehoben und zentriert

4. **Zusammenfassung erstellen**:
   - **Lokal**: "Summarize (lokal)" → Verwendet aktuelle Transkription
   - **Remote**: "Summarize" → RunPod API
   - Summary wird mit Überschriften angezeigt
   - Klick auf Heading → Springt zur Textstelle

5. **Bearbeiten** (optional):
   - `Ctrl+E` oder URL-Parameter `?edit=true`
   - Inline-Editing: Klick auf Zeile → Editierbar
   - Headers auch editierbar
   - Auto-Save beim Verlassen
   - `Esc` zum Beenden

## 🔌 API-Endpunkte

### Lokale Verarbeitung (WSL2)

#### `GET /api/local-files/list?type=mp3|txt`
Listet lokale Dateien aus WSL2-Verzeichnis

**Response**:
```json
{
  "success": true,
  "files": [
    {
      "filename": "test.mp3",
      "size": 1234567,
      "modified": "2026-02-14T10:00:00.000Z"
    }
  ]
}
```

#### `POST /api/transcribe-local`
Transkribiert lokale MP3 mit WSL2 Python

**Request**:
```json
{
  "filename": "test.mp3",
  "socketId": "socket-id"
}
```

**WebSocket Events**:
- `transcribe:progress`: Live-Output-Zeilen
- `transcribe:result`: `{ transcription, mp3Filename }`
- `transcribe:error`: Fehler

#### `POST /api/summarize-local`
Erstellt Summary mit WSL2 Python

**Request**:
```json
{
  "filename": "test.txt",       // Optional (aus Datei)
  "transcription": "...",       // Optional (direkt)
  "socketId": "socket-id"
}
```

**WebSocket Events**:
- `summarize:progress`: Live-Output-Zeilen
- `summarize:result`: `{ transcription }` (mit Summary)
- `summarize:error`: Fehler

#### `GET /api/files/stream?path=<absolute-path>`
Streamt lokale MP3-Dateien

### Remote-Verarbeitung (RunPod)

#### `POST /api/upload`
Lädt MP3- oder TXT-Datei hoch

**Request**: `multipart/form-data` mit `file`
**Response**:
```json
{
  "success": true,
  "file": {
    "filename": "uuid-filename.mp3",
    "originalname": "original.mp3",
    "url": "/api/files/uuid-filename.mp3",
    "size": 1234567
  }
}
```

#### `POST /api/transcribe`
Transkribiert MP3-Datei mit RunPod

**Request**:
```json
{
  "filePath": "uuid-filename.mp3",
  "socketId": "socket-id"
}
```

**Response**:
```json
{
  "success": true,
  "transcription": "Datum: ...\n[00:00:01] Text...",
  "segments": [...],
  "duration": 12.34
}
```

**WebSocket Events**:
- `transcribe:progress`: `{ step, message, progress }`
- `transcribe:complete`: `{ transcription, duration }`
- `transcribe:error`: `{ error }`

#### `POST /api/summarize`
Fasst Transkription zusammen mit RunPod

**Request**:
```json
{
  "transcription": "Text with timestamps...",
  "promptType": "durchgabe|newsletter",
  "socketId": "socket-id"
}
```

**Response**:
```json
{
  "success": true,
  "summary": "Formatted summary with headers...",
  "summaries": ["summary1", "summary2"],
  "duration": 9.87
}
```

**WebSocket Events**:
- `summarize:progress`: `{ step, message, progress }`
- `summarize:complete`: `{ summary, duration }`
- `summarize:error`: `{ error }`

### Datei-Management

#### `GET /api/files/:filename`
Lädt hochgeladene Datei herunter

#### `DELETE /api/files/:filename`
Löscht hochgeladene Datei

#### `GET /api/health`
Health Check

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2026-02-14T12:00:00.000Z",
  "endpoints": {
    "whisper": "configured",
    "llama": "configured"
  }
}
```

## 🔗 URL-Parameter

### `?mp3=<absolute-path>`
Lädt MP3-Datei von lokalem Dateisystem (Win11-Server)

**Beispiel**:
```
http://localhost:3000?mp3=D:\Dokumente\HiDrive\public\Durchgaben\x_test\test_3min.mp3
```

**Remote-Zugriff** (von Win7-Client):
```
http://192.168.178.20:3000?mp3=D:\Dokumente\HiDrive\public\Durchgaben\x_test\test_3min.mp3
```

**Wichtig**: 
- Verwende absolute Windows-Pfade (mit Backslashes `\` oder Forward-Slashes `/`)
- Browser kodiert die URL automatisch (Backslashes werden zu `%5C`)

### `?text=<absolute-path>`
Lädt Text-Datei von lokalem Dateisystem

**Beispiel**:
```
http://localhost:3000?text=D:\Dokumente\HiDrive\public\Durchgaben\x_test\test_3min_s.txt
```

### Automatisches Laden der Transkription

Wenn eine MP3-Datei per URL-Parameter geladen wird (z.B. `test.mp3`), versucht die App **automatisch** die zugehörige Transkriptionsdatei `test_s.txt` aus dem gleichen Verzeichnis zu laden.

**Beispiel**:
```
URL: ?mp3=D:\Dokumente\test.mp3
      ↓
App versucht automatisch: D:\Dokumente\test_s.txt
```

**Manuelles Überschreiben**:
Falls du eine andere Transkriptionsdatei verwenden möchtest, kannst du den `text`-Parameter explizit angeben:
```
http://localhost:3000?mp3=D:\Dokumente\test.mp3&text=D:\Dokumente\custom.txt
```

### `?edit=true`
Aktiviert Edit-Modus und zeigt den Edit-Button

**Beispiel**: `http://localhost:3000?edit=true`

### URL-Parameter werden automatisch entfernt

Nach dem Laden der Dateien werden alle URL-Parameter aus der Browser-URL entfernt. Die URL ändert sich von:
```
http://localhost:3000?mp3=D:\...\test.mp3
```
zu:
```
http://localhost:3000
```

**Vorteil**: Saubere URL, keine Duplikate beim Neuladen, keine sensiblen Pfade in der History.

### Kombinationen
```
http://localhost:3000?mp3=D:\Dokumente\audio.mp3&text=D:\Dokumente\transcript.txt&edit=true
```

**Minimal-Beispiel** (mit Auto-Load der Transkription):
```
http://localhost:3000?mp3=D:\Dokumente\test.mp3
```
→ Lädt `test.mp3` + versucht `test_s.txt` automatisch zu laden

## 🛠️ Entwicklung

### Projektstruktur erweitern

#### Neue Component hinzufügen
```bash
cd client/src/components
# Erstelle neue Datei, z.B. MyComponent.js
```

#### Neue Route hinzufügen
```bash
cd server/routes
# Erstelle neue Datei, z.B. myroute.js
# Registriere in server/index.js
```

### Code-Style

- **Frontend**: ESLint mit React-Konfiguration
- **Backend**: Node.js Best Practices
- **Kommentare**: Deutsch für Business-Logik, Englisch für Code

### Testing

```bash
# Frontend Tests
cd client
npm test

# Backend Tests (TODO: Implementieren)
npm test
```

## 📦 Deployment

### Heroku

```bash
# Login
heroku login

# Create App
heroku create mp3-transcriber

# Set Environment Variables
heroku config:set RUNPOD_WHISPER_ENDPOINT=...
heroku config:set RUNPOD_LLAMA_ENDPOINT=...

# Deploy
git push heroku main
```

### Docker

```dockerfile
# Dockerfile (TODO: Erstellen)
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN cd client && npm install && npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

### Vercel (Frontend) + Render (Backend)

- **Frontend**: Vercel (automatisches Deployment)
- **Backend**: Render (Web Service)

## 🐛 Troubleshooting

### Problem: WebSocket-Verbindung schlägt fehl

**Lösung**: Überprüfe CORS-Einstellungen in `server/index.js`:
```javascript
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000', // Frontend-URL
    methods: ['GET', 'POST']
  }
});
```

### Problem: Upload schlägt fehl

**Lösung**: 
- Überprüfe `MAX_FILE_SIZE` in `.env`
- Stelle sicher, dass `uploads/` Verzeichnis existiert
- Überprüfe Dateiberechtigungen

### Problem: Transkription dauert ewig

**Lösung**:
- Überprüfe RunPod-Endpoint-Status
- Checke API-Key
- Überprüfe Backend-Logs: `npm run server`

### Problem: Timestamps nicht klickbar

**Lösung**:
- Überprüfe Format: `[HH:MM:SS]`
- Stelle sicher, dass Edit-Modus deaktiviert ist

### Problem: Monaco Editor lädt nicht

**Lösung**:
```bash
cd client
npm install @monaco-editor/react --save
```

## 📚 Basiert auf

Diese App implementiert die Funktionalität der originalen Python-Skripte:

- **`base-data/transcribe.py`**: Faster-Whisper Transkription
  - Modell: openai/whisper-large-v3 (CT2 int8_float16)
  - VAD-Filter, Beam-Search, Timestamps
  - Läuft in WSL2 Ubuntu mit CUDA-Support

- **`base-data/summarize.py`**: Llama Zusammenfassung
  - Modell: Llama-3.1-8B (CT2 int8_float16)
  - Block-weise Summarization mit Overlap
  - Prompt-Typen: `durchgabe` und `newsletter`
  - Läuft in WSL2 Ubuntu mit CUDA-Support

**WSL2-Integration**: Siehe [WSL2_INTEGRATION.md](./WSL2_INTEGRATION.md) für Setup-Details.

## 📚 Dokumentation

- **[README.md](./README.md)** - Dieses Dokument (Projekt-Übersicht)
- **[INSTALLATION.md](./INSTALLATION.md)** - Detaillierte Setup-Anleitung
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technische Architektur & Komponenten
- **[WSL2_INTEGRATION.md](./WSL2_INTEGRATION.md)** - WSL2-Setup & Python-Skript-Integration
- **[WORKFLOW.md](./WORKFLOW.md)** - Benutzer-Workflows & Use-Cases
- **[COMMANDS.md](./COMMANDS.md)** - Alle verfügbaren Befehle & PowerShell-Alias
- **[UPDATES.md](./UPDATES.md)** - Changelog & neue Features (2026)

## 📄 Lizenz

MIT License - siehe LICENSE Datei

## 🤝 Contributing

Contributions sind willkommen! Bitte erstelle einen Pull Request.

## 📧 Support

Bei Fragen oder Problemen erstelle ein GitHub Issue.

---

**Erstellt mit ❤️ für spirituelle Audio-Transkription**
