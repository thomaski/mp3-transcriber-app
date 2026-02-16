# 🏗️ Architektur-Dokumentation

## Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [Systemarchitektur](#systemarchitektur)
3. [Komponenten-Details](#komponenten-details)
4. [Datenfluss](#datenfluss)
5. [API-Integration](#api-integration)
6. [State Management](#state-management)
7. [Fehlerbehandlung](#fehlerbehandlung)
8. [Performance-Optimierungen](#performance-optimierungen)

---

## Übersicht

Die MP3 Transcriber App ist eine moderne Full-Stack-Webapp, die aus einem React-Frontend und einem Node.js/Express-Backend besteht. Sie ermöglicht die Transkription und Zusammenfassung von MP3-Dateien unter Verwendung von RunPod-gehosteten ML-Modellen (Whisper und Llama).

### Technologie-Stack

**Frontend:**
- React 18.2 (Functional Components + Hooks)
- Tailwind CSS (Utility-First Styling)
- Monaco Editor (Code-Editor)
- Socket.io-client (WebSocket)
- Axios (HTTP Client)
- react-dropzone (File Upload)

**Backend:**
- Node.js (Runtime)
- Express 4 (Web Framework)
- Socket.io (WebSocket Server)
- Multer (File Upload Middleware)
- Axios (RunPod API Calls)

---

## Systemarchitektur

### High-Level Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Browser)                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              React Application                       │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐         │   │
│  │  │  Audio   │  │Transcript│  │ Control  │         │   │
│  │  │  Player  │  │   View   │  │  Panel   │         │   │
│  │  └──────────┘  └──────────┘  └──────────┘         │   │
│  │                                                      │   │
│  │  ┌─────────────────────────────────────────────┐  │   │
│  │  │         Socket.io Client                    │  │   │
│  │  └─────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ HTTP / WebSocket
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express Server (Node.js)                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Routes                                              │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐         │   │
│  │  │ Upload   │  │Transcribe│  │Summarize │         │   │
│  │  │  Route   │  │  Route   │  │  Route   │         │   │
│  │  └──────────┘  └──────────┘  └──────────┘         │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         Socket.io Server                            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ HTTPS API Calls
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                         RunPod APIs                          │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │  Whisper API         │  │   Llama API          │        │
│  │  (Transcription)     │  │  (Summarization)     │        │
│  │                      │  │                      │        │
│  │ openai/whisper-      │  │ Llama-3.1-8B-CT2    │        │
│  │ large-v3 (CT2)       │  │ (int8_float16)      │        │
│  └──────────────────────┘  └──────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Verzeichnisstruktur

```
mp3-transcriber-app/
│
├── client/                          # React Frontend
│   ├── public/
│   │   ├── index.html               # HTML Template
│   │   └── manifest.json            # PWA Manifest
│   │
│   └── src/
│       ├── components/              # React Components
│       │   ├── AudioPlayer.js       # HTML5 Audio Player mit Controls
│       │   ├── TranscriptView.js    # Transkriptions-Anzeige
│       │   ├── ControlPanel.js      # Buttons & Status
│       │   ├── DropZone.js          # Drag-and-Drop Upload
│       │   └── ProgressModal.js     # Progress-Overlay
│       │
│       ├── services/
│       │   └── api.js               # API Service (Axios)
│       │
│       ├── utils/
│       │   └── helpers.js           # Utility-Funktionen
│       │
│       ├── App.js                   # Main App Component
│       ├── index.js                 # Entry Point
│       └── index.css                # Global Styles + Tailwind
│
├── server/                          # Node.js Backend
│   ├── routes/
│   │   ├── upload.js                # File-Upload Handler
│   │   ├── transcribe.js            # Whisper API Integration
│   │   ├── summarize.js             # Llama API Integration
│   │   └── files.js                 # File Management
│   │
│   └── index.js                     # Server Entry + Socket.io Setup
│
└── uploads/                         # Temporärer File-Storage
```

---

## Komponenten-Details

### Frontend-Komponenten

#### 1. **App.js** (Main Container)

**Verantwortlichkeiten:**
- Zentrales State-Management
- Socket.io Connection Management
- URL-Parameter Parsing
- Event-Handler Koordination
- Error-Handling

**State:**
```javascript
{
  audioFile: Object,        // Hochgeladene Datei-Info
  audioUrl: String,         // URL zum Audio
  transcription: String,    // Transkript-Text
  isEditMode: Boolean,      // Edit-Modus aktiv?
  isProcessing: Boolean,    // Verarbeitung läuft?
  progress: Object,         // Progress-Info
  error: String             // Error-Message
}
```

**Lifecycle:**
1. Mount: Socket.io-Verbindung aufbauen
2. Mount: URL-Parameter parsen
3. Socket Events registrieren
4. Unmount: Socket trennen

**Key Functions:**
- `handleFileDrop()`: Datei-Upload
- `handleTranscribe()`: Transkription starten
- `handleSummarize()`: Zusammenfassung starten
- `handleTimestampClick()`: Audio-Seek

---

#### 2. **AudioPlayer.js** (Media Player)

**Features:**
- HTML5 Audio Element
- Custom Controls (Play/Pause, Seek, Volume)
- Time Display
- Progress Bar
- Mute/Unmute

**Props:**
```javascript
{
  audioUrl: String,      // Audio-Source
  audioRef: Ref          // Ref zum Audio-Element
}
```

**State:**
```javascript
{
  isPlaying: Boolean,
  currentTime: Number,
  duration: Number,
  volume: Number,
  isMuted: Boolean
}
```

**Event-Listeners:**
- `timeupdate`: Aktuelle Zeit aktualisieren
- `loadedmetadata`: Dauer laden
- `ended`: Playback beendet

---

#### 3. **TranscriptView.js** (Text Display)

**Modi:**
1. **View-Modus**: Formatierte Anzeige mit klickbaren Timestamps
2. **Edit-Modus**: Monaco Editor für Bearbeitung

**Funktionen:**
- Timestamp-Parsing: `[HH:MM:SS]`
- Click-Handler für Timestamps
- Header-Rendering (Metadaten)
- Separator-Lines (`═`, `---`)
- Text-Editing (Monaco)

**Props:**
```javascript
{
  transcription: String,
  isEditMode: Boolean,
  onTimestampClick: Function,
  onTextChange: Function
}
```

**Timestamp-Format:**
```
[00:00:01] Text des ersten Segments
[00:00:15] Text des zweiten Segments
```

---

#### 4. **ControlPanel.js** (Action Buttons)

**Buttons:**
1. **Transcribe MP3**: Transkription starten (disabled wenn kein Audio)
2. **Summarize**: Zusammenfassung erstellen (disabled ohne Transkript)
3. **Edit-Modus Toggle**: Edit-Modus aktivieren/deaktivieren

**Status-Indikatoren:**
- Audio geladen (grün/grau)
- Transkription verfügbar (grün/grau)
- Verarbeitung läuft (gelb pulsierend)

**Props:**
```javascript
{
  onTranscribe: Function,
  onSummarize: Function,
  isProcessing: Boolean,
  hasAudio: Boolean,
  hasTranscription: Boolean,
  isEditMode: Boolean,
  onToggleEdit: Function
}
```

---

#### 5. **DropZone.js** (File Upload)

**Features:**
- Drag-and-Drop Support
- Click-to-Browse
- File-Type Validation (MP3, TXT)
- Size Validation (max 100 MB)
- Visual Feedback (Drag-States)

**Props:**
```javascript
{
  onDrop: Function(acceptedFiles)
}
```

**States:**
- `isDragActive`: Datei wird über Zone gezogen
- `isDragReject`: Ungültige Datei

**Accepted Files:**
- `audio/mpeg` (.mp3)
- `text/plain` (.txt)

---

#### 6. **ProgressModal.js** (Progress Overlay)

**Anzeige:**
- Spinner-Icon (animiert)
- Step-Label
- Message
- Progress-Bar (wenn verfügbar)

**Steps:**
- `upload`: Datei-Upload
- `processing`: Verarbeitung läuft
- `formatting`: Formatierung
- `split`: Text-Split in Blöcke
- `summarize`: Zusammenfassung erstellen
- `complete`: Fertig

**Props:**
```javascript
{
  step: String,
  message: String,
  progress: Number (0-100)
}
```

---

### Backend-Routes

#### 1. **upload.js** (File Upload)

**Middleware:** Multer

**Konfiguration:**
```javascript
storage: diskStorage({
  destination: './uploads',
  filename: 'uuid-originalname'
})
```

**Validierung:**
- File-Type: MP3, TXT
- File-Size: Max 100 MB

**Response:**
```json
{
  "success": true,
  "file": {
    "filename": "uuid-file.mp3",
    "originalname": "audio.mp3",
    "url": "/api/files/uuid-file.mp3",
    "size": 1234567
  }
}
```

---

#### 2. **transcribe.js** (Whisper Integration)

**Workflow:**
1. Datei von `uploads/` lesen
2. Base64-Encoding
3. RunPod Whisper API Call
4. Response parsen (Segments)
5. Timestamps formatieren
6. Header mit Metadaten erstellen
7. WebSocket-Events senden

**Input:**
```json
{
  "filePath": "uuid-file.mp3",
  "socketId": "socket-id"
}
```

**RunPod API Request:**
```json
{
  "input": {
    "audio": "base64-encoded-audio",
    "model": "openai/whisper-large-v3",
    "language": "de",
    "beam_size": 7,
    "vad_filter": true,
    "condition_on_previous_text": false,
    "initial_prompt": "Dies ist eine klare, natürliche deutsche Sprache"
  }
}
```

**Output:**
```
Datum:   13.02.2026
Start:   11:02:12
Dauer:   00:00:14
Modell:  openai/whisper-large-v3


[00:00:01] Erster Satz der Transkription.
[00:00:15] Zweiter Satz der Transkription.
```

**WebSocket Events:**
```javascript
emit('transcribe:progress', { step, message, progress })
emit('transcribe:complete', { transcription, duration })
emit('transcribe:error', { error })
```

---

#### 3. **summarize.js** (Llama Integration)

**Workflow:**
1. Transkription in Blöcke teilen (20 Zeilen, 10 Overlap)
2. Für jeden Block:
   - Timestamps entfernen
   - Llama API Call
   - Summary bereinigen
3. Gesamt-Summary zusammenstellen
4. Header mit Metadaten erstellen
5. Blöcke mit Überschriften versehen
6. WebSocket-Events senden

**Input:**
```json
{
  "transcription": "Text with timestamps...",
  "promptType": "durchgabe|newsletter",
  "socketId": "socket-id"
}
```

**Prompt-Typen:**

**durchgabe** (persönliche Beratung):
```
Du bist ein präziser Zusammenfasser. Antworte NUR mit EINEM kurzen Satz auf Deutsch.
Verwende die 'Du'-Form für persönliche Referenzen auf 'Seele der Liebe'.
Der Text ist eine spirituelle Beratung eines Engels an einen Menschen.
```

**newsletter** (Gruppenbotschaft):
```
Du bist ein präziser Zusammenfasser. Antworte NUR mit EINEM kurzen Satz auf Deutsch.
Verwende NIEMALS die 'Du'-Form, sondern stattdessen IMMER die 'Ihr'-Form.
Es geht um spirituelle Botschaften an mehrere Menschen zu Weltgeschehen.
```

**RunPod API Request:**
```json
{
  "input": {
    "prompt": "System-Prompt + Text",
    "model": "avans06/Meta-Llama-3.1-8B-Instruct-ct2-int8_float16",
    "max_length": 60,
    "temperature": 0.0,
    "repetition_penalty": 1.5
  }
}
```

**Output:**
```
════════════════════════════════════════
Zusammenfassung des Transkripts
════════════════════════════════════════
Start:   12:43:18
Dauer:   00:00:09
Modell:  Llama-3.1-8B-CT2
Typ:     durchgabe

Gesamtzusammenfassung:
Du bist ein Abbild des Göttlichen, geschaffen aus der Liebe.
Du trägst sowohl die Weiblichkeit als auch den Geist in dir.

----------  Du bist ein Abbild des Göttlichen, geschaffen aus der Liebe.
[00:00:01] Erster Satz...
[00:00:15] Zweiter Satz...

----------  Du trägst sowohl die Weiblichkeit als auch den Geist in dir.
[00:00:30] Dritter Satz...
```

**WebSocket Events:**
```javascript
emit('summarize:progress', { step, message, progress })
emit('summarize:complete', { summary, duration })
emit('summarize:error', { error })
```

---

#### 4. **files.js** (File Management)

**Endpoints:**

**GET /api/files/:filename**
- Datei aus `uploads/` bereitstellen
- Security-Check: Path-Traversal verhindern

**DELETE /api/files/:filename**
- Datei aus `uploads/` löschen
- Für Cleanup nach Verarbeitung

---

## Datenfluss

### Transkriptions-Workflow

```
1. User: Drag MP3 File
   ├─> DropZone.onDrop()
   └─> App.handleFileDrop()
       ├─> uploadFile(file) → POST /api/upload
       │   └─> Multer: Save to uploads/
       └─> setAudioFile(), setAudioUrl()

2. User: Click "Transcribe MP3"
   ├─> ControlPanel.onTranscribe()
   └─> App.handleTranscribe()
       ├─> transcribeAudio(filename, socketId) → POST /api/transcribe
       │   ├─> Read audio from uploads/
       │   ├─> Base64-Encode
       │   ├─> Socket: emit('transcribe:progress', { step: 'upload' })
       │   ├─> RunPod Whisper API Call
       │   ├─> Socket: emit('transcribe:progress', { step: 'processing' })
       │   ├─> Parse Segments
       │   ├─> Format Timestamps
       │   ├─> Socket: emit('transcribe:complete', { transcription })
       │   └─> Return transcription
       └─> setTranscription()

3. User: Click Timestamp [00:00:15]
   ├─> TranscriptView.onTimestampClick([00:00:15])
   └─> App.handleTimestampClick()
       ├─> parseTimestamp() → 15 seconds
       └─> audioRef.current.currentTime = 15
           └─> audioRef.current.play()
```

### Summarization-Workflow

```
1. User: Click "Summarize"
   ├─> ControlPanel.onSummarize()
   └─> App.handleSummarize()
       ├─> Detect promptType (durchgabe vs newsletter)
       ├─> summarizeText(transcription, promptType, socketId) → POST /api/summarize
       │   ├─> splitIntoBlocks(transcription, blockSize=20, overlap=10)
       │   ├─> Socket: emit('summarize:progress', { step: 'split' })
       │   ├─> For each block:
       │   │   ├─> Remove Timestamps
       │   │   ├─> Socket: emit('summarize:progress', { step: 'summarize', progress: X% })
       │   │   ├─> RunPod Llama API Call
       │   │   ├─> Clean Summary
       │   │   └─> Add to summaries[]
       │   ├─> Create full summary header
       │   ├─> Format blocks with headers
       │   ├─> Socket: emit('summarize:complete', { summary })
       │   └─> Return summary
       └─> setTranscription(summary)
```

### Edit-Workflow

```
1. User: Add ?edit=true to URL
   └─> App.useEffect()
       └─> parseUrlParams() → { edit: 'true' }
           └─> setIsEditMode(true)

2. User: Toggle Edit-Modus Button
   └─> ControlPanel.onToggleEdit()
       └─> App.setIsEditMode(!isEditMode)

3. Edit-Modus aktiv:
   ├─> TranscriptView renders Monaco Editor
   └─> User: Edit text
       ├─> Monaco: onChange()
       └─> TranscriptView.handleEditorChange()
           └─> App.handleTextChange()
               └─> setTranscription(newText)

4. User: Drag TXT File (in Edit-Modus)
   ├─> DropZone.onDrop()
   └─> App.handleFileDrop()
       ├─> Read TXT content
       └─> setTranscription(content)
```

---

## API-Integration

### RunPod Whisper API

**Endpoint-Struktur** (anpassbar):
```
POST https://api.runpod.ai/v2/{WHISPER_ENDPOINT}
Headers:
  - Content-Type: application/json
  - Authorization: Bearer {API_KEY}

Body:
{
  "input": {
    "audio": "base64-string",
    "model": "openai/whisper-large-v3",
    "language": "de",
    "beam_size": 7,
    "vad_filter": true,
    "condition_on_previous_text": false,
    "initial_prompt": "..."
  }
}

Response:
{
  "output": {
    "segments": [
      {
        "start": 1.0,
        "end": 5.0,
        "text": " Transkribierter Text"
      }
    ],
    "duration": 180.5
  }
}
```

**Parameter-Mapping** (aus `transcribe.py`):
- `beam_size`: 7 (mehr Hypothesen = genauer)
- `vad_filter`: true (Voice Activity Detection)
- `condition_on_previous_text`: false (kein Kontext zwischen Segmenten)
- `initial_prompt`: Hint für Modell (deutsches Vokabular)

---

### RunPod Llama API

**Endpoint-Struktur** (anpassbar):
```
POST https://api.runpod.ai/v2/{LLAMA_ENDPOINT}
Headers:
  - Content-Type: application/json
  - Authorization: Bearer {API_KEY}

Body:
{
  "input": {
    "prompt": "System-Prompt + User-Text",
    "model": "avans06/Meta-Llama-3.1-8B-Instruct-ct2-int8_float16",
    "max_length": 60,
    "temperature": 0.0,
    "top_p": 0.9,
    "repetition_penalty": 1.5
  }
}

Response:
{
  "output": {
    "text": "Generierte Zusammenfassung."
  }
}
```

**Parameter-Mapping** (aus `summarize.py`):
- `max_length`: 60 (kurze Überschriften)
- `temperature`: 0.0 (deterministisch)
- `repetition_penalty`: 1.5 (vermeidet Wiederholungen)

---

## State Management

### App-State

**Zentral in `App.js`** (kein Redux/Context benötigt für diese Größe):

```javascript
const [audioFile, setAudioFile] = useState(null);
const [audioUrl, setAudioUrl] = useState(null);
const [transcription, setTranscription] = useState('');
const [isEditMode, setIsEditMode] = useState(false);
const [isProcessing, setIsProcessing] = useState(false);
const [progress, setProgress] = useState({ step: '', message: '', progress: 0 });
const [error, setError] = useState(null);
```

**State-Updates:**
- File-Upload: `setAudioFile`, `setAudioUrl`
- Transkription: `setTranscription` (via WebSocket oder API-Response)
- Processing: `setIsProcessing`, `setProgress` (WebSocket-Events)
- Errors: `setError`

**State-Propagation:**
- Props down: Parent → Child
- Events up: Child → Parent (callbacks)

---

### WebSocket State-Sync

**Server → Client:**
```javascript
// Server
io.to(socketId).emit('transcribe:progress', { step: 'processing', message: '...' });

// Client
socket.on('transcribe:progress', (data) => {
  setProgress(data);
});
```

**Events:**
- `transcribe:progress`, `transcribe:complete`, `transcribe:error`
- `summarize:progress`, `summarize:complete`, `summarize:error`

---

## Fehlerbehandlung

### Frontend Error-Handling

**Try-Catch in Event-Handlers:**
```javascript
try {
  await uploadFile(file);
} catch (err) {
  setError(err.message);
  setIsProcessing(false);
}
```

**Error-Display:**
- Roter Banner oben in `App.js`
- Dismiss-Button
- Auto-Clear nach Socket-Complete

**Validierung:**
- File-Type (MP3, TXT)
- File-Size (max 100 MB)
- Required-Fields (audio für Transcribe, transcription für Summarize)

---

### Backend Error-Handling

**Express Error-Middleware:**
```javascript
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});
```

**Route-Level:**
```javascript
try {
  // ... operation
} catch (error) {
  console.error('Transcribe error:', error);
  io.to(socketId).emit('transcribe:error', { error: error.message });
  res.status(500).json({ error: error.message });
}
```

**Multer Errors:**
- `LIMIT_FILE_SIZE`: 400 Bad Request
- Invalid File-Type: 400 Bad Request

**RunPod API Errors:**
- Timeout (600s): 504 Gateway Timeout
- API-Fehler: 500 Internal Server Error mit Details

---

## Performance-Optimierungen

### Frontend

**1. Lazy-Loading:**
```javascript
// Monaco Editor nur laden wenn Edit-Modus aktiv
{isEditMode && <Editor ... />}
```

**2. Debounced Text-Change:**
```javascript
const debouncedOnChange = debounce(onTextChange, 300);
```

**3. Memoization:**
```javascript
const memoizedTranscript = useMemo(() => 
  renderTranscription(), 
  [transcription, isEditMode]
);
```

**4. Code-Splitting:**
```javascript
const MonacoEditor = lazy(() => import('@monaco-editor/react'));
```

---

### Backend

**1. File-Streaming:**
```javascript
res.sendFile(filePath);  // Statt readFile + send
```

**2. Connection Pooling:**
```javascript
const api = axios.create({
  timeout: 600000,
  maxRedirects: 5
});
```

**3. Garbage-Collection:**
```javascript
// Temp-Dateien nach Verarbeitung löschen
fs.unlinkSync(tempFilePath);
```

**4. Cluster-Mode** (Production):
```javascript
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
} else {
  // Start server
}
```

---

### WebSocket-Optimierung

**1. Binary-Data:**
```javascript
// Für große Dateien: Binary statt JSON
socket.emit('data', buffer);
```

**2. Compression:**
```javascript
const io = new Server(server, {
  perMessageDeflate: true
});
```

**3. Room-Based:**
```javascript
// Nur an spezifische Client senden
io.to(socketId).emit('event', data);
```

---

## Workflow-Diagramme

### Complete User Journey

```
┌─────────────────────────────────────────────────────────────┐
│                      User startet App                        │
│                  http://localhost:3000                       │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
           ┌─────────────────────────┐
           │  URL-Parameter parsen?  │
           │  (?mp3=..., ?edit=...)  │
           └────────┬────────────────┘
                    │
         Ja ◄───────┼───────► Nein
         │                    │
         ▼                    ▼
  ┌───────────────┐    ┌──────────────────┐
  │ Lade MP3/TXT  │    │ Zeige Drop-Zone  │
  └───────────────┘    └──────────────────┘
                              │
                              ▼
                   ┌──────────────────────┐
                   │ User: Drag MP3 File  │
                   └──────────┬───────────┘
                              │
                              ▼
                   ┌──────────────────────┐
                   │  Upload zu Server    │
                   │  POST /api/upload    │
                   └──────────┬───────────┘
                              │
                              ▼
                   ┌──────────────────────┐
                   │  Audio-Player zeigen │
                   └──────────┬───────────┘
                              │
                              ▼
                   ┌──────────────────────────────┐
                   │ User: Click "Transcribe MP3" │
                   └──────────┬───────────────────┘
                              │
                              ▼
                   ┌──────────────────────────────┐
                   │  POST /api/transcribe        │
                   │  + Socket.io Progress        │
                   └──────────┬───────────────────┘
                              │
                  ┌───────────┴───────────┐
                  │                       │
                  ▼                       ▼
         ┌────────────────┐    ┌─────────────────┐
         │ RunPod Whisper │    │ Progress-Modal  │
         │    API Call    │    │   anzeigen      │
         └────────┬───────┘    └─────────────────┘
                  │
                  ▼
         ┌─────────────────────┐
         │ Transkription zeigen│
         │ mit Timestamps      │
         └─────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────────────┐
        │ User: Click Timestamp        │
        │       [00:00:15]             │
        └──────────┬───────────────────┘
                   │
                   ▼
        ┌──────────────────────────────┐
        │ Audio springt zu 15 Sekunden │
        │ und spielt ab                │
        └──────────┬───────────────────┘
                   │
                   ▼
        ┌──────────────────────────────┐
        │ User: Click "Summarize"      │
        └──────────┬───────────────────┘
                   │
                   ▼
        ┌──────────────────────────────┐
        │  POST /api/summarize         │
        │  + Socket.io Progress        │
        └──────────┬───────────────────┘
                   │
       ┌───────────┴────────────┐
       │                        │
       ▼                        ▼
┌────────────────┐    ┌────────────────────┐
│ RunPod Llama   │    │ Progress für jeden │
│  API Calls     │    │ Block anzeigen     │
│ (Block-weise)  │    └────────────────────┘
└────────┬───────┘
         │
         ▼
┌─────────────────────────────┐
│ Summary mit Überschriften   │
│ und Blöcken anzeigen        │
└─────────────────────────────┘
```

---

## Zusammenfassung

Diese Architektur bietet:

✅ **Modularität**: Komponenten sind unabhängig und wiederverwendbar
✅ **Skalierbarkeit**: WebSocket für Real-time, API für Batch-Processing
✅ **Fehlertoleranz**: Umfassendes Error-Handling auf allen Ebenen
✅ **Performance**: Optimierte File-Handling und Streaming
✅ **Maintainability**: Klare Trennung von Concerns, gut dokumentiert
✅ **User Experience**: Real-time Feedback, intuitive UI, moderne Designs

Die App repliziert die Funktionalität der Python-Skripte (`transcribe.py`, `summarize.py`) erfolgreich in einer modernen Web-Umgebung und erweitert sie um Features wie Drag-and-Drop, Real-time Progress und interaktive Timestamps.
