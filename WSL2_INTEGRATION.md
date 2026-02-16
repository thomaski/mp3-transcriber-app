# WSL2 Lokale Python-Integration

## Übersicht

Die MP3 Transcriber App wurde erweitert um lokale Verarbeitung mit WSL2 Python-Skripten. Dies ermöglicht:

- **Lokale Transkription** mit Faster-Whisper (GPU-beschleunigt via CUDA)
- **Lokale Zusammenfassung** mit Llama-3.1-8B (CT2-Format)
- **Live-Output-Streaming** von Python-Skripten ins Frontend
- **Dateiauswahl** aus lokalem Windows-Verzeichnis

---

## Architektur

```
Frontend (React)
    ↓ Klick auf "Transcribe Lokal" / "Summarize Lokal"
    ↓
FileSelectionModal
    ↓ GET /api/local-files/list?type=mp3
    ↓ Liste von Dateien anzeigen
    ↓ User wählt Datei
    ↓ POST /api/transcribe-local { filename, socketId }
    ↓
Backend (Express)
    ↓ spawn('wsl', ['bash', '-c', 'cd ... && python script.py filename'])
    ↓
WSL2 (Ubuntu)
    ↓ Python-Environment aktivieren
    ↓ transcribe.py oder summarize.py ausführen
    ↓ stdout → Live-Output
    ↓
Socket.io
    ↓ transcribe:progress / summarize:progress Events
    ↓
Frontend (React)
    ↓ LiveOutputModal zeigt Fortschritt
    ↓ Ergebnis automatisch laden
```

---

## Neue Backend-Endpunkte

### 1. `/api/local-files/list` (GET)
Liste lokale Dateien aus dem Audio-Verzeichnis.

**Query-Parameter:**
- `type`: `mp3` oder `txt`

**Response:**
```json
{
  "directory": "D:\\Projekte_KI\\pyenv_1_transcode_durchgabe\\audio",
  "type": "mp3",
  "count": 5,
  "files": [
    {
      "filename": "test.mp3",
      "path": "D:\\Projekte_KI\\...",
      "size": 12345678,
      "sizeFormatted": "11.77 MB",
      "modified": "2026-02-14T...",
      "modifiedFormatted": "14.02.2026 15:30"
    }
  ]
}
```

### 2. `/api/local-files/info` (GET)
Informationen über das lokale Verzeichnis.

**Response:**
```json
{
  "directory": "D:\\Projekte_KI\\...",
  "exists": true,
  "wslPath": "/mnt/d/Projekte_KI/...",
  "isDirectory": true,
  "totalFiles": 42,
  "mp3Files": 10,
  "txtFiles": 12
}
```

### 3. `/api/transcribe-local` (POST)
Transkribiert eine lokale MP3-Datei mit WSL2 Python.

**Body:**
```json
{
  "filename": "test.mp3",
  "socketId": "abc123"
}
```

**Live-Events (Socket.io):**
```javascript
socket.on('transcribe:progress', (data) => {
  // { step: 'processing', message: '...', progress: 50 }
});
```

**Response:**
```json
{
  "success": true,
  "filename": "test.txt",
  "path": "D:\\Projekte_KI\\...",
  "transcription": "...",
  "duration": 120.5,
  "outputLines": 45
}
```

### 4. `/api/summarize-local` (POST)
Erstellt Summary einer lokalen TXT-Datei mit WSL2 Python.

**Body:**
```json
{
  "filename": "test.txt",
  "socketId": "abc123"
}
```

**Live-Events (Socket.io):**
```javascript
socket.on('summarize:progress', (data) => {
  // { step: 'processing', message: '...', progress: 70 }
});
```

**Response:**
```json
{
  "success": true,
  "filename": "test_s.txt",
  "path": "D:\\Projekte_KI\\...",
  "transcription": "...",
  "duration": 180.2,
  "outputLines": 120,
  "mode": "-durchgabe"
}
```

---

## Neue Frontend-Komponenten

### 1. `FileSelectionModal`
Modal zur Auswahl lokaler Dateien.

**Props:**
- `isOpen`: boolean
- `onClose`: () => void
- `fileType`: 'mp3' | 'txt'
- `onSelect`: (filename: string) => void

**Features:**
- Lädt Dateiliste vom Backend
- Filtert nach Dateityp (MP3 oder TXT, nicht *_s.txt)
- Zeigt Dateigröße und Änderungsdatum
- Dateiauswahl mit visueller Hervorhebung

### 2. `LiveOutputModal`
Terminal-ähnliche Anzeige für Live-Python-Output.

**Props:**
- `isOpen`: boolean
- `title`: string
- `outputs`: Array<{step, message, timestamp}>
- `progress`: number (0-100)
- `isComplete`: boolean
- `hasError`: boolean

**Features:**
- Auto-Scroll zu neuem Output
- Farbkodierung nach Step-Typ (error=rot, warning=gelb, complete=grün)
- Progress-Bar
- Terminal-Look mit Monospace-Font

---

## Neue ControlPanel-Buttons

### 1. "Transcribe Lokal" (Blau)
- Icon: `FaDesktop`
- Öffnet `FileSelectionModal` für MP3-Dateien
- Ruft WSL2 Python `transcribe.py` auf
- Lädt Ergebnis automatisch in Transkription

### 2. "Summarize Lokal" (Türkis)
- Icon: `FaDesktop`
- Öffnet `FileSelectionModal` für TXT-Dateien
- Ruft WSL2 Python `summarize.py` auf
- Lädt Ergebnis automatisch in Transkription

---

## Konfiguration

### Backend (`server/routes/`)

```javascript
// In local-files.js, transcribe-local.js, summarize-local.js
const LOCAL_AUDIO_DIR = 'D:\\Projekte_KI\\pyenv_1_transcode_durchgabe\\audio';
const WSL_AUDIO_DIR = '/mnt/d/Projekte_KI/pyenv_1_transcode_durchgabe/audio';
const PYTHON_SCRIPT_TRANSCRIBE = '/home/tom/transcribe.py';
const PYTHON_SCRIPT_SUMMARIZE = '/home/tom/summarize.py';
const VENV_ACTIVATE = '~/pyenv_1_transcode_durchgabe/bin/activate';
```

### WSL-Befehl

```bash
cd /mnt/d/Projekte_KI/pyenv_1_transcode_durchgabe/audio && \
source ~/pyenv_1_transcode_durchgabe/bin/activate && \
python /home/tom/transcribe.py test.mp3
```

---

## Workflow

### Lokale Transkription

1. User klickt "Transcribe Lokal"
2. `FileSelectionModal` öffnet sich
3. Backend lädt MP3-Liste: `GET /api/local-files/list?type=mp3`
4. User wählt Datei (z.B. `test.mp3`)
5. Frontend sendet: `POST /api/transcribe-local { filename: "test.mp3", socketId }`
6. Backend startet WSL-Prozess mit `spawn()`
7. Python-Output wird live via Socket.io gestreamt
8. `LiveOutputModal` zeigt Fortschritt
9. Nach Fertigstellung: Ergebnis (`test.txt`) wird geladen
10. Modal schließt automatisch nach 3 Sekunden

### Lokale Zusammenfassung

1. User klickt "Summarize Lokal"
2. `FileSelectionModal` öffnet sich
3. Backend lädt TXT-Liste: `GET /api/local-files/list?type=txt` (NICHT *_s.txt)
4. User wählt Datei (z.B. `test.txt`)
5. Frontend sendet: `POST /api/summarize-local { filename: "test.txt", socketId }`
6. Backend erkennt Modus automatisch:
   - Dateiname enthält "newsletter" → `-newsletter` Flag
   - Sonst → `-durchgabe` Flag (default)
7. Python-Output wird live via Socket.io gestreamt
8. `LiveOutputModal` zeigt Fortschritt (inkl. einzelner Block-Überschriften)
9. Nach Fertigstellung: Ergebnis (`test_s.txt`) wird geladen
10. Modal schließt automatisch nach 3 Sekunden

---

## Live-Output-Streaming

### Backend (spawn)

```javascript
const wslProcess = spawn('wsl', ['bash', '-c', wslCommand]);

wslProcess.stdout.on('data', (data) => {
  const output = data.toString('utf8');
  const cleanLine = stripAnsiCodes(output);
  
  // Fortschritt schätzen basierend auf Output
  let progress = 20;
  if (cleanLine.includes('Lade Modell')) progress = 30;
  if (cleanLine.includes('Modell geladen')) progress = 50;
  // ...
  
  io.to(socketId).emit('transcribe:progress', {
    step: 'processing',
    message: cleanLine,
    progress
  });
});
```

### Frontend (Socket.io)

```javascript
socket.on('transcribe:progress', (data) => {
  const timestamp = new Date().toLocaleTimeString();
  setLiveOutputs(prev => [...prev, { ...data, timestamp }]);
  setLiveProgress(data.progress);
});
```

---

## Fehlerbehandlung

### WSL nicht verfügbar

```javascript
wslProcess.on('error', (error) => {
  res.status(500).json({
    error: 'Fehler beim Starten von WSL',
    details: error.message,
    hint: 'Stelle sicher, dass WSL2 installiert und konfiguriert ist.'
  });
});
```

### Python-Skript fehlgeschlagen

```javascript
wslProcess.on('close', (code) => {
  if (code !== 0) {
    res.status(500).json({
      error: 'Transkription fehlgeschlagen',
      exitCode: code,
      stderr: errorBuffer,
      stdout: outputBuffer
    });
  }
});
```

### Datei nicht gefunden

```javascript
if (!fs.existsSync(mp3Path)) {
  return res.status(404).json({ 
    error: `MP3-Datei nicht gefunden: ${filename}` 
  });
}
```

---

## Testing

### 1. Backend-Tests

```bash
# Verzeichnis-Info abrufen
curl http://localhost:5000/api/local-files/info

# MP3-Dateien auflisten
curl "http://localhost:5000/api/local-files/list?type=mp3"

# TXT-Dateien auflisten
curl "http://localhost:5000/api/local-files/list?type=txt"
```

### 2. Frontend-Tests

- Button "Transcribe Lokal" klicken → Modal öffnet sich
- Datei auswählen → Live-Output wird angezeigt
- Fortschritt beobachten → Ergebnis wird geladen
- Button "Summarize Lokal" klicken → Modal öffnet sich
- Datei auswählen → Live-Output wird angezeigt

---

## Performance

- **WSL-Startup**: ~1-2 Sekunden
- **Modell-Laden**: ~5-10 Sekunden (abhängig von GPU)
- **Transkription**: ~6-10% der MP3-Dauer (z.B. 6-10 Min für 100 Min MP3)
- **Zusammenfassung**: ~20-40% der Transkriptionszeit (abhängig von Textlänge)

---

## Vorteile

✅ **Live-Feedback**: User sieht sofort, was passiert
✅ **Lokale GPU**: Nutzt vorhandene Hardware (CUDA)
✅ **Kostenlos**: Keine RunPod-Kosten
✅ **Flexibel**: Kann zwischen lokal und RunPod wechseln
✅ **Transparent**: Alle Python-Outputs sichtbar
✅ **Robust**: Fehlerbehandlung auf allen Ebenen

---

## Nächste Schritte (Optional)

1. **Progress-Parsing**: Python-Output parsen für genaueren Fortschritt
2. **Abbruch-Funktion**: Prozess vom Frontend aus stoppen
3. **Batch-Processing**: Mehrere Dateien gleichzeitig verarbeiten
4. **History**: Letzte Verarbeitungen anzeigen
5. **Config-UI**: Verzeichnispfade über Frontend konfigurierbar
