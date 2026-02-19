# 📦 Installations-Anleitung

## Schritt-für-Schritt Installation der MP3 Transcriber App

### Voraussetzungen

Bevor du beginnst, stelle sicher, dass folgendes installiert ist:

- **Node.js** 18 oder höher ([Download](https://nodejs.org/))
- **npm** (kommt mit Node.js)
- **Git** ([Download](https://git-scm.com/))
- **RunPod Account** mit API-Zugang

Überprüfe deine Versionen:
```bash
node --version  # sollte v18.0.0 oder höher sein
npm --version   # sollte 8.0.0 oder höher sein
```

---

## Installation

### 1. Projekt klonen oder herunterladen

```bash
cd D:\Projekte\git
cd mp3-transcriber-app
```

### 2. Backend-Dependencies installieren

Im Root-Verzeichnis:
```bash
npm install
```

Dies installiert:
- express
- cors
- socket.io
- axios
- multer
- dotenv
- uuid
- nodemon (dev)
- concurrently (dev)

### 3. Frontend-Dependencies installieren

```bash
cd client
npm install
cd ..
```

Dies installiert:
- react & react-dom
- react-scripts
- react-dropzone
- axios
- socket.io-client
- @monaco-editor/react
- react-icons
- tailwindcss (peer dependency)

**ODER** alle Dependencies auf einmal:
```bash
npm run install-all
```

### 4. Tailwind CSS Setup

Tailwind ist bereits konfiguriert, aber falls Probleme auftreten:

```bash
cd client
npm install -D tailwindcss postcss autoprefixer
cd ..
```

Die Konfigurationsdateien existieren bereits:
- `client/tailwind.config.js`
- `client/postcss.config.js`
- `client/src/index.css` (mit @tailwind directives)

---

## Konfiguration

### 1. Standard-Dateien (Optional)

Die App lädt beim Start automatisch Standard-Dateien, wenn keine URL-Parameter angegeben sind:

**Standard-Pfade** (konfigurierbar in `client/src/App.js`):
- **MP3-Datei:** `D:\Dokumente\HiDrive\public\Durchgaben\x_test\newsletter_2020-03_Corona-1.mp3`
- **Transkription:** `D:\Dokumente\HiDrive\public\Durchgaben\x_test\newsletter_2020-03_Corona-1_s.txt`

**Anpassung:**
Bearbeite die Konstanten in `client/src/App.js`:
```javascript
const DEFAULT_MP3_PATH = 'D:\\Dokumente\\HiDrive\\public\\Durchgaben\\x_test\\newsletter_2020-03_Corona-1.mp3';
const DEFAULT_TEXT_PATH = 'D:\\Dokumente\\HiDrive\\public\\Durchgaben\\x_test\\newsletter_2020-03_Corona-1_s.txt';
```

**Verhalten:**
- Wenn die Dateien existieren → werden automatisch geladen
- Wenn die Dateien nicht existieren → normale Drop-Zones werden angezeigt
- URL-Parameter haben immer Vorrang vor Standard-Dateien

### 2. Environment-Variablen erstellen

Erstelle eine `.env` Datei im Root-Verzeichnis:

```bash
# Windows (PowerShell)
New-Item .env

# Linux/Mac
touch .env
```

### 2. `.env` Datei ausfüllen

Öffne `.env` in einem Editor und füge ein:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# RunPod Endpoints
RUNPOD_WHISPER_ENDPOINT=https://api.runpod.ai/v2/YOUR_WHISPER_ENDPOINT
RUNPOD_LLAMA_ENDPOINT=https://api.runpod.ai/v2/YOUR_LLAMA_ENDPOINT

# RunPod API Keys (falls benötigt)
RUNPOD_API_KEY=YOUR_API_KEY_HERE

# Model Configuration
WHISPER_MODEL=openai/whisper-large-v3
LLAMA_MODEL=avans06/Meta-Llama-3.1-8B-Instruct-ct2-int8_float16

# Upload Configuration
MAX_FILE_SIZE=104857600
UPLOAD_DIR=./uploads
```

### 3. RunPod-Endpoints konfigurieren

**Du musst RunPod-Endpoints für Whisper und Llama erstellen:**

#### Whisper Endpoint Setup:
1. Gehe zu [RunPod](https://www.runpod.io/)
2. Erstelle einen neuen Endpoint
3. Wähle `openai/whisper-large-v3` (oder ein kompatibles CT2-Modell)
4. Kopiere die Endpoint-URL
5. Füge sie in `.env` als `RUNPOD_WHISPER_ENDPOINT` ein

#### Llama Endpoint Setup:
1. Erstelle einen zweiten Endpoint
2. Wähle `avans06/Meta-Llama-3.1-8B-Instruct-ct2-int8_float16`
3. Kopiere die Endpoint-URL
4. Füge sie in `.env` als `RUNPOD_LLAMA_ENDPOINT` ein

**WICHTIG:** Die API-Struktur in `server/routes/transcribe.js` und `server/routes/summarize.js` muss ggf. an deine spezifische RunPod-Konfiguration angepasst werden!

---

## Verzeichnis-Setup

Das `uploads/` Verzeichnis wird automatisch beim ersten Start erstellt. Falls nicht:

```bash
# Windows
mkdir uploads

# Linux/Mac
mkdir uploads
```

---

## App starten

### Development-Mode (empfohlen für Testing)

**Option 1: Beide gleichzeitig starten**
```bash
npm run dev
```

Dies startet:
- Backend auf http://localhost:5000
- Frontend auf http://localhost:4000

**Option 2: Separat starten**

Terminal 1 (Backend):
```bash
npm run server
```

Terminal 2 (Frontend):
```bash
npm run client
```

### Production-Mode

1. Frontend bauen:
```bash
npm run build
```

2. Server starten:
```bash
npm start
```

App läuft auf http://localhost:5000

---

## Erster Test

### 1. App öffnen

Öffne deinen Browser:
```
http://localhost:4000
```

### 2. Testdatei hochladen

Nutze die Beispiel-Dateien aus `base-data/`:

1. **Option A: Drag-and-Drop**
   - Ziehe `base-data/test_3min.txt` in die Drop-Zone
   - Text sollte angezeigt werden

2. **Option B: URL-Parameter**
   ```
   http://localhost:4000?text=/path/to/base-data/test_3min.txt
   ```

### 3. Timestamps testen

- Klicke auf einen Timestamp wie `[00:00:01]`
- Audio sollte zur entsprechenden Position springen (wenn Audio geladen)

### 4. Edit-Modus testen

```
http://localhost:4000?edit=true
```

- Button "Edit Text" sollte erscheinen
- Monaco Editor sollte beim Bearbeiten verfügbar sein

---

## Troubleshooting

### Problem: `npm install` schlägt fehl

**Lösung:**
```bash
# Cache leeren
npm cache clean --force

# Erneut versuchen
npm install
```

### Problem: Port 4000 oder 5000 bereits belegt

**Lösung:**

Windows:
```powershell
# Port finden (ersetze 4000 mit dem gewünschten Port)
netstat -ano | findstr :4000
# Prozess beenden
taskkill /PID <PID> /F
```

Linux/Mac:
```bash
# Port finden
lsof -i :3000
# Prozess beenden
kill -9 <PID>
```

Oder `.env` anpassen:
```env
PORT=5001  # Anderen Port verwenden
```

### Problem: Tailwind-Styles werden nicht geladen

**Lösung:**
```bash
cd client
npm install -D tailwindcss postcss autoprefixer
npm start
```

### Problem: WebSocket-Verbindung schlägt fehl

**Lösung:**

In `client/src/App.js`, Zeile ~30:
```javascript
const socket = io('http://localhost:5000', {
  transports: ['websocket']
});
```

Falls Production:
```javascript
const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
  transports: ['websocket']
});
```

### Problem: Monaco Editor lädt nicht

**Lösung:**
```bash
cd client
npm install @monaco-editor/react --save
npm start
```

### Problem: RunPod API gibt Fehler zurück

**Lösung:**

1. Überprüfe `.env` Konfiguration
2. Teste Endpoint mit curl:
   ```bash
   curl -X POST https://api.runpod.ai/v2/YOUR_ENDPOINT \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -d '{"input": {"test": "data"}}'
   ```
3. Passe API-Struktur in `server/routes/transcribe.js` an

---

## Development-Tools

### Empfohlene VS Code Extensions:

- **ES7+ React/Redux/React-Native snippets**
- **Tailwind CSS IntelliSense**
- **ESLint**
- **Prettier**
- **Auto Rename Tag**

### Linter Setup:

```bash
cd client
npm install -D eslint eslint-config-react-app
```

`.eslintrc.json`:
```json
{
  "extends": ["react-app"]
}
```

---

## Nächste Schritte

1. ✅ Installation abgeschlossen
2. ✅ Environment konfiguriert
3. ✅ App gestartet und getestet

**Jetzt:**
- Lies die [README.md](./README.md) für Feature-Übersicht
- Lies die [ARCHITECTURE.md](./ARCHITECTURE.md) für technische Details
- Starte mit echten MP3-Dateien zu testen
- Passe RunPod-Integration an deine Endpoints an

---

## Support

Bei Problemen:
1. Checke die Console-Logs (Browser + Terminal)
2. Lies [Troubleshooting](#troubleshooting) oben
3. Überprüfe `.env` Konfiguration
4. Erstelle ein GitHub Issue

**Happy Transcribing! 🎙️**

---

**Version:** 1.0.0  
**Letzte Aktualisierung:** 2026-02-19
