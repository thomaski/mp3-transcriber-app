# 🔄 Workflow-Dokumentation

## Übersicht: Wie die App funktioniert

Diese Dokumentation beschreibt den kompletten Workflow der MP3 Transcriber App von der Benutzerinteraktion bis zur Anzeige der Ergebnisse.

**✨ Neue Features 2026:**
- 🐧 **WSL2 Integration**: Lokale Verarbeitung mit Python-Skripten
- 🎯 **Intelligente Dateiauswahl**: MP3 geladen → Sofort transkribieren!
- 📁 **Standard-Dateien**: Auto-Load beim Start
- 🎨 **Inline-Editing**: Zeilenweise editieren mit Auto-Save
- 🔆 **Playback-Highlighting**: Aktuelle Zeile hervorheben + Auto-Scroll
- 📑 **Summary-Navigation**: Klickbare Überschriften

Siehe auch: [UPDATES.md](./UPDATES.md) für Details zu neuen Features.

---

## 1. App-Start und Initialisierung

### Schritt 1.1: App laden
```
User: Öffnet http://localhost:4000
  ↓
Browser: Lädt React App
  ↓
index.js: Rendert <App />
  ↓
App.js: useEffect Hook läuft
```

### Schritt 1.2: Socket.io Verbindung
```javascript
// App.js
useEffect(() => {
  const socket = io('http://localhost:5000');
  socketRef.current = socket;
  
  // Event-Listener registrieren
  socket.on('transcribe:progress', (data) => setProgress(data));
  socket.on('transcribe:complete', (data) => setTranscription(data.transcription));
  socket.on('summarize:progress', (data) => setProgress(data));
  socket.on('summarize:complete', (data) => setTranscription(data.summary));
  
  return () => socket.disconnect();
}, []);
```

**Was passiert:**
- WebSocket-Verbindung zum Backend wird hergestellt
- Event-Listener für Progress-Updates werden registriert
- Socket-ID wird für spätere Requests gespeichert

### Schritt 1.3: URL-Parameter parsen
```javascript
useEffect(() => {
  const params = parseUrlParams();
  
  if (params.edit === 'true') {
    setIsEditMode(true);
  }
  
  if (params.mp3) {
    setAudioUrl(params.mp3);
  }
  
  if (params.text) {
    fetch(params.text)
      .then(res => res.text())
      .then(text => setTranscription(text));
  }
}, []);
```

**Unterstützte URL-Parameter:**
- `?mp3=/path/to/file.mp3` → Lädt Audio
- `?text=/path/to/file.txt` → Lädt Text
- `?edit=true` → Aktiviert Edit-Modus

---

## 2. MP3-Upload Workflow

### Schritt 2.1: User zieht MP3-Datei in Drop-Zone

```
User: Drag & Drop file.mp3
  ↓
DropZone Component:
  - react-dropzone erkennt File
  - Validiert File-Type (audio/mpeg)
  - Validiert File-Size (max 100 MB)
  ↓
onDrop Callback → App.handleFileDrop()
```

### Schritt 2.2: Upload zum Server

```javascript
// App.js
const handleFileDrop = async (files) => {
  const file = files[0];
  
  setIsProcessing(true);
  setProgress({ step: 'upload', message: 'Lade Datei hoch...' });
  
  const uploadResult = await uploadFile(file);
  
  setAudioFile(uploadResult.file);
  setAudioUrl(uploadResult.file.url);
  setIsProcessing(false);
}
```

```javascript
// services/api.js
export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await axios.post('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  
  return response.data;
}
```

### Schritt 2.3: Backend speichert Datei

```javascript
// server/routes/upload.js
router.post('/', upload.single('file'), (req, res) => {
  // Multer hat Datei bereits in uploads/ gespeichert
  const fileInfo = {
    filename: req.file.filename,      // uuid-file.mp3
    originalname: req.file.originalname,
    url: `/api/files/${req.file.filename}`,
    size: req.file.size
  };
  
  res.json({ success: true, file: fileInfo });
});
```

**Datei-Struktur:**
```
uploads/
  └── c4ca4238-a0b9-3382-8dcc-509a6f75849b-file.mp3
```

### Schritt 2.4: Audio-Player wird angezeigt

```
App.js: setAudioUrl()
  ↓
AudioPlayer Component wird gerendert
  ↓
<audio ref={audioRef} src={audioUrl} />
```

---

## 3. Transkriptions-Workflow

### Schritt 3.1: User klickt "Transcribe MP3"

```
User: Click Button "Transcribe MP3"
  ↓
ControlPanel.onTranscribe()
  ↓
App.handleTranscribe()
```

### Schritt 3.2: API-Request senden

```javascript
// App.js
const handleTranscribe = async () => {
  setIsProcessing(true);
  setProgress({ step: 'start', message: 'Starte Transkription...' });
  
  await transcribeAudio(audioFile.filename, socketRef.current?.id);
  
  // Ergebnis kommt via WebSocket
}
```

```javascript
// services/api.js
export const transcribeAudio = async (filename, socketId) => {
  const response = await axios.post('/api/transcribe', {
    filePath: filename,
    socketId: socketId
  });
  
  return response.data;
}
```

### Schritt 3.3: Backend verarbeitet Request

```javascript
// server/routes/transcribe.js
router.post('/', async (req, res) => {
  const { filePath, socketId } = req.body;
  const io = req.io;
  
  // 1. Datei laden
  const audioPath = path.join('./uploads', filePath);
  const audioBuffer = fs.readFileSync(audioPath);
  const audioBase64 = audioBuffer.toString('base64');
  
  // 2. Progress senden
  io.to(socketId).emit('transcribe:progress', { 
    step: 'upload', 
    message: 'Lade Audio zum Server...' 
  });
  
  // 3. RunPod API aufrufen
  io.to(socketId).emit('transcribe:progress', { 
    step: 'processing', 
    message: 'Transkribiere mit Whisper...' 
  });
  
  const response = await axios.post(process.env.RUNPOD_WHISPER_ENDPOINT, {
    input: {
      audio: audioBase64,
      model: 'openai/whisper-large-v3',
      language: 'de',
      beam_size: 7,
      vad_filter: true
    }
  });
  
  // 4. Segments formatieren
  const segments = response.data.output.segments;
  const transcription = formatTranscription(segments);
  
  // 5. Completion Event senden
  io.to(socketId).emit('transcribe:complete', { transcription });
  
  res.json({ success: true, transcription });
});
```

### Schritt 3.4: Timestamps formatieren

```javascript
function formatTranscription(segments) {
  let result = '';
  
  for (const segment of segments) {
    const timestamp = formatTimestamp(segment.start);  // 1.5 → "00:00:01"
    const text = segment.text.trim();
    result += `[${timestamp}] ${text}\n`;
  }
  
  return result;
}
```

**Output:**
```
[00:00:01] Erster Satz der Transkription.
[00:00:15] Zweiter Satz der Transkription.
[00:00:30] Dritter Satz der Transkription.
```

### Schritt 3.5: Frontend empfängt Ergebnis

```javascript
// App.js (WebSocket Event-Handler)
socket.on('transcribe:complete', (data) => {
  setTranscription(data.transcription);
  setIsProcessing(false);
  setProgress({ step: '', message: '', progress: 100 });
});
```

### Schritt 3.6: TranscriptView rendert Text

```javascript
// components/TranscriptView.js
const renderTranscription = () => {
  const lines = transcription.split('\n');
  
  return lines.map((line, index) => {
    const timestampMatch = line.match(/^\[(\d{2}:\d{2}:\d{2})\]/);
    
    if (timestampMatch) {
      const timestamp = timestampMatch[1];
      const text = line.substring(timestampMatch[0].length).trim();
      
      return (
        <div key={index}>
          <button onClick={() => onTimestampClick(timestamp)}>
            [{timestamp}]
          </button>
          <span>{text}</span>
        </div>
      );
    }
    
    return <div key={index}>{line}</div>;
  });
}
```

---

## 4. Timestamp-Navigation Workflow

### Schritt 4.1: User klickt auf Timestamp

```
User: Click [00:00:15]
  ↓
TranscriptView: onTimestampClick('00:00:15')
  ↓
App.handleTimestampClick('00:00:15')
```

### Schritt 4.2: Audio-Seek

```javascript
// App.js
const handleTimestampClick = (timestamp) => {
  const seconds = parseTimestamp(timestamp);  // "00:00:15" → 15
  
  if (audioRef.current && !isNaN(seconds)) {
    audioRef.current.currentTime = seconds;
    audioRef.current.play();
  }
}
```

```javascript
// utils/helpers.js
export const parseTimestamp = (timestamp) => {
  const clean = timestamp.replace(/[\[\]]/g, '');  // [00:00:15] → 00:00:15
  const parts = clean.split(':').map(Number);      // [0, 0, 15]
  
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];  // 15
  }
  
  return 0;
}
```

### Schritt 4.3: Audio-Player aktualisiert sich

```
audioRef.current.currentTime = 15
  ↓
AudioPlayer: timeupdate Event
  ↓
setCurrentTime(15)
  ↓
Progress-Bar und Time-Display aktualisieren sich
```

---

## 5. Zusammenfassungs-Workflow

### Schritt 5.1: User klickt "Summarize"

```
User: Click "Summarize"
  ↓
ControlPanel.onSummarize()
  ↓
App.handleSummarize()
```

### Schritt 5.2: Prompt-Typ erkennen

```javascript
// App.js
const handleSummarize = async () => {
  // Auto-Detect: "newsletter" in Text?
  const promptType = transcription.toLowerCase().includes('newsletter') 
    ? 'newsletter' 
    : 'durchgabe';
  
  await summarizeText(transcription, promptType, socketRef.current?.id);
}
```

### Schritt 5.3: Backend teilt Text in Blöcke

```javascript
// server/routes/summarize.js
function splitIntoBlocks(transcription, blockSize = 20, overlapSize = 10) {
  const lines = transcription.split('\n');
  
  // Header finden (erste Leerzeile)
  let contentStart = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '' && i > 0) {
      contentStart = i + 1;
      break;
    }
  }
  
  const header = lines.slice(0, contentStart).join('\n');
  const contentLines = lines.slice(contentStart);
  
  // Blöcke mit Overlap erstellen
  const blocks = [];
  for (let i = 0; i < contentLines.length; i += blockSize - overlapSize) {
    const block = contentLines.slice(i, i + blockSize);
    if (block.length > 0) {
      blocks.push(block);
    }
  }
  
  return { header, blocks };
}
```

**Beispiel:**
```
Block 1: Zeilen 1-20
Block 2: Zeilen 11-30 (10 Zeilen Overlap)
Block 3: Zeilen 21-40
...
```

### Schritt 5.4: Für jeden Block: Llama API aufrufen

```javascript
// server/routes/summarize.js
for (let i = 0; i < blocks.length; i++) {
  // Progress senden
  io.to(socketId).emit('summarize:progress', { 
    step: 'summarize', 
    message: `Block ${i + 1}/${blocks.length}...`,
    progress: Math.round(((i + 1) / blocks.length) * 100)
  });
  
  // Block-Text ohne Timestamps
  const blockText = blocks[i]
    .join(' ')
    .replace(/\[\d{2}:\d{2}:\d{2}\]\s*/g, '');
  
  // Llama API Call
  const summary = await callRunPodLlama(blockText, promptType);
  
  summaries.push(summary);
  enhanced += `\n----------  ${summary}\n` + blocks[i].join('\n') + '\n';
}
```

### Schritt 5.5: Llama API Call

```javascript
async function callRunPodLlama(text, promptType) {
  const systemPrompt = promptType === 'newsletter'
    ? 'Verwende IMMER die "Ihr"-Form...'
    : 'Verwende die "Du"-Form für persönliche Referenzen...';
  
  const response = await axios.post(process.env.RUNPOD_LLAMA_ENDPOINT, {
    input: {
      prompt: `${systemPrompt}\n\nZusammenfassen in einem Satz: ${text}`,
      model: 'avans06/Meta-Llama-3.1-8B-Instruct-ct2-int8_float16',
      max_length: 60,
      temperature: 0.0,
      repetition_penalty: 1.5
    }
  });
  
  let summary = response.data.output.text.trim();
  
  // Bereinigen
  summary = summary.replace(/(?:assistant|here is|\*)/gi, '').trim();
  if (!summary.endsWith('.')) summary += '.';
  
  return summary;
}
```

### Schritt 5.6: Summary formatieren

```javascript
const summaryHeader = [
  '═'.repeat(40),
  'Zusammenfassung des Transkripts',
  '═'.repeat(40),
  `Start:   ${startTime}`,
  `Dauer:   ${duration}`,
  `Modell:  Llama-3.1-8B-CT2`,
  `Typ:     ${promptType}`,
  '',
  'Gesamtzusammenfassung:',
  ...summaries,  // Alle Block-Überschriften
  ''
].join('\n');

const fullSummary = header + '\n\n' + summaryHeader + enhanced;
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
Du bist ein Abbild des Göttlichen.
Du trägst die Weiblichkeit in dir.

----------  Du bist ein Abbild des Göttlichen.
[00:00:01] Text des ersten Blocks...

----------  Du trägst die Weiblichkeit in dir.
[00:00:30] Text des zweiten Blocks...
```

### Schritt 5.7: Frontend zeigt Summary an

```
socket.on('summarize:complete')
  ↓
setTranscription(summary)
  ↓
TranscriptView rendert neu mit Separatoren
```

---

## 6. Edit-Modus Workflow

### Schritt 6.1: Edit-Modus aktivieren

**Option A: URL-Parameter**
```
http://localhost:4000?edit=true
```

**Option B: Button-Click**
```
User: Click "Edit-Modus: AUS"
  ↓
ControlPanel.onToggleEdit()
  ↓
App: setIsEditMode(true)
```

### Schritt 6.2: Monaco Editor wird geladen

```javascript
// components/TranscriptView.js
{isEditMode ? (
  <Editor
    height="600px"
    defaultLanguage="plaintext"
    value={transcription}
    onChange={handleEditorChange}
    options={{
      minimap: { enabled: false },
      wordWrap: 'on',
      readOnly: false
    }}
  />
) : (
  renderTranscription()
)}
```

### Schritt 6.3: Text bearbeiten

```
User: Editiert Text im Monaco Editor
  ↓
Monaco: onChange Event
  ↓
TranscriptView.handleEditorChange(newText)
  ↓
App.handleTextChange(newText)
  ↓
setTranscription(newText)
```

### Schritt 6.4: TXT-Datei laden (im Edit-Modus)

```
User: Drag & Drop file.txt
  ↓
DropZone: onDrop(['file.txt'])
  ↓
App.handleFileDrop()
  ↓
const text = await file.text()
  ↓
setTranscription(text)
  ↓
Monaco Editor zeigt neuen Text
```

---

## 7. Progress-Updates Workflow

### Real-time Progress via WebSocket

```
Backend: io.to(socketId).emit('transcribe:progress', { 
  step: 'processing', 
  message: 'Transkribiere mit Whisper...',
  progress: 0 
})
  ↓
Frontend: socket.on('transcribe:progress', (data) => {
  setProgress(data);
})
  ↓
App rendert <ProgressModal />
  ↓
Modal zeigt:
  - Spinner (animiert)
  - Step-Label: "Verarbeitung"
  - Message: "Transkribiere mit Whisper..."
  - Progress-Bar (falls progress > 0)
```

### Progress-Steps

**Transcribe:**
1. `upload`: Datei hochladen
2. `processing`: Whisper-API
3. `formatting`: Timestamps formatieren
4. `complete`: Fertig

**Summarize:**
1. `split`: Text in Blöcke teilen
2. `summarize`: Llama-API (mit progress %)
3. `complete`: Fertig

---

## 8. Error-Handling Workflow

### Frontend Error

```
try {
  await transcribeAudio(...)
} catch (err) {
  setError(err.message);
  setIsProcessing(false);
}
  ↓
App rendert Error-Banner (rot)
  ↓
User: Click X zum Schließen
  ↓
setError(null)
```

### Backend Error

```
Backend: Fehler in Route
  ↓
io.to(socketId).emit('transcribe:error', { error: 'Message' })
  ↓
Frontend: socket.on('transcribe:error', (data) => {
  setError(data.error);
  setIsProcessing(false);
})
```

---

## 9. Komponenten-Aufruf-Hierarchie

```
App
├── AudioPlayer
│   └── <audio ref={audioRef} />
│
├── ControlPanel
│   ├── Button: Transcribe MP3
│   ├── Button: Summarize
│   └── Button: Edit-Modus Toggle
│
├── DropZone
│   └── react-dropzone
│
├── TranscriptView
│   ├── View-Modus:
│   │   └── Formatted Text mit Timestamps (klickbar)
│   └── Edit-Modus:
│       └── Monaco Editor
│
└── ProgressModal (conditional)
    ├── Spinner
    ├── Step-Label
    ├── Message
    └── Progress-Bar
```

---

## 10. API-Aufrufe Zusammenfassung

| Aktion | Endpoint | Methode | WebSocket Events |
|--------|----------|---------|------------------|
| Upload | `/api/upload` | POST | - |
| Transcribe | `/api/transcribe` | POST | `progress`, `complete`, `error` |
| Summarize | `/api/summarize` | POST | `progress`, `complete`, `error` |
| Get File | `/api/files/:filename` | GET | - |
| Delete File | `/api/files/:filename` | DELETE | - |
| Health Check | `/api/health` | GET | - |

---

## Zusammenfassung

Diese App folgt einem klaren **Request → Process → WebSocket-Update → Response** Pattern:

1. **User-Interaktion** (Button-Click, File-Drop)
2. **Frontend** sendet API-Request mit Socket-ID
3. **Backend** verarbeitet, sendet Progress-Events via WebSocket
4. **Frontend** zeigt Progress in Echtzeit
5. **Backend** sendet Complete-Event mit Ergebnis
6. **Frontend** zeigt Ergebnis an

Der Einsatz von **WebSocket** ermöglicht:
- Real-time Progress-Updates
- Bessere UX bei langen Operationen (Transcribe/Summarize)
- Keine Polling-Notwendigkeit

Die App ist **modular**, **wartbar** und **erweiterbar** – ideal für weitere Features wie Batch-Processing, Multi-Language-Support oder Speaker-Diarization.

---

## 🆕 Neue Workflows (2026)

### 11. WSL2 Lokale Transkription

#### Schritt 11.1: User klickt "Transcribe MP3 (lokal)"

**Variante A: MP3 bereits geladen**
```
User: MP3 ist bereits geladen
  ↓
Click "Transcribe MP3 (lokal)"
  ↓
Kein Modal! Startet sofort mit audioFile.name ✅
```

**Variante B: Keine MP3 geladen**
```
User: Keine MP3 geladen
  ↓
Click "Transcribe MP3 (lokal)"
  ↓
FileSelectionModal öffnet sich
  ↓
User: Doppelklick auf MP3-Datei
  ↓
Startet sofort! ✅
```

#### Schritt 11.2: Backend ruft WSL2 Python auf

```javascript
// server/routes/transcribe-local.js
const wslProcess = spawn('wsl', [
  'bash', '-c',
  'source /home/tom/pyenv_1_transcode_durchgabe/bin/activate && ' +
  'python /home/tom/transcribe.py ' + filename
]);

// Live-Output streamen
wslProcess.stdout.on('data', (data) => {
  const lines = data.toString().split('\n');
  lines.forEach(line => {
    io.to(socketId).emit('transcribe:progress', {
      step: 'transcribe',
      message: line,
      timestamp: new Date().toLocaleTimeString()
    });
  });
});

// Fertig
wslProcess.on('close', (code) => {
  const transcription = fs.readFileSync(txtPath, 'utf-8');
  
  // Sende Ergebnis via Socket.io
  io.to(socketId).emit('transcribe:result', {
    transcription,
    mp3Filename: filename
  });
});
```

#### Schritt 11.3: Frontend empfängt Live-Output

```javascript
// App.js
socket.on('transcribe:progress', (data) => {
  setLiveOutputs(prev => [...prev, {
    step: data.step,
    message: data.message,
    timestamp: data.timestamp
  }]);
});

socket.on('transcribe:result', (data) => {
  setTranscription(data.transcription);
  
  // MP3 automatisch laden
  const mp3Url = `http://localhost:5000/api/files/stream?path=...`;
  setAudioUrl(mp3Url);
  setAudioFile({ name: data.mp3Filename, ... });
  
  // Modal schließt sich nach 3 Sekunden
});
```

#### Schritt 11.4: LiveOutputModal zeigt Terminal-Output

```javascript
// components/LiveOutputModal.js
<div className="terminal-output">
  {outputs.map((output, index) => (
    <div key={index}>
      <span className="timestamp">[{output.timestamp}]</span>
      <span dangerouslySetInnerHTML={{ __html: parseAnsi(output.message) }} />
    </div>
  ))}
</div>

// ANSI-Codes → HTML-Farben
function parseAnsi(text) {
  return text
    .replace(/\x1b\[32m(.*?)\x1b\[0m/g, '<span style="color: #4ade80">$1</span>')
    .replace(/\x1b\[33m(.*?)\x1b\[0m/g, '<span style="color: #facc15">$1</span>')
    .replace(/\x1b\[31m(.*?)\x1b\[0m/g, '<span style="color: #ef4444">$1</span>');
}
```

---

### 12. Intelligente Summary aus aktueller Transkription

#### Schritt 12.1: User klickt "Summarize (lokal)"

**Variante A: Transkription ohne Summary**
```
User: Transkription ist geladen
  ↓
Transkription enthält NICHT "Gesamtzusammenfassung:"
  ↓
Click "Summarize (lokal)"
  ↓
Kein Modal! Verwendet aktuelle Transkription! ✅
```

**Variante B: Transkription mit Summary**
```
User: Transkription mit Summary ist geladen
  ↓
Transkription enthält "Gesamtzusammenfassung:"
  ↓
Click "Summarize (lokal)"
  ↓
FileSelectionModal öffnet sich für andere Datei
```

#### Schritt 12.2: Backend erstellt temporäre Datei (wenn nötig)

```javascript
// server/routes/summarize-local.js
let txtPath;
let tempFile = null;

if (req.body.transcription) {
  // Direkte Transkription: Temp-Datei erstellen
  tempFile = path.join(audioDir, `temp_${Date.now()}.txt`);
  fs.writeFileSync(tempFile, req.body.transcription, 'utf-8');
  txtPath = tempFile;
} else {
  // Dateiname: Datei existiert bereits
  txtPath = path.join(audioDir, req.body.filename);
}

// WSL2 Python aufrufen
const wslProcess = spawn('wsl', [
  'bash', '-c',
  'source /home/tom/pyenv_1_transcode_durchgabe/bin/activate && ' +
  'python /home/tom/summarize.py ' + baseName + '.txt'
]);

// ... (Live-Output wie oben)

// Cleanup temp files
wslProcess.on('close', (code) => {
  if (tempFile) {
    fs.unlinkSync(tempFile);
    if (fs.existsSync(summaryPath)) {
      fs.unlinkSync(summaryPath); // temp_123_s.txt auch löschen
    }
  }
  
  const summary = fs.readFileSync(summaryPath, 'utf-8');
  
  io.to(socketId).emit('summarize:result', {
    transcription: summary
  });
});
```

---

### 13. Inline-Editing Workflow

#### Schritt 13.1: Edit-Modus aktivieren

```
User: Drückt Ctrl+E
  ↓
App: setIsEditMode(true)
  ↓
TranscriptView: Inline-Edit-Modus aktiv
```

#### Schritt 13.2: Zeile editieren

```
User: Klickt auf Timestamp-Zeile
  ↓
TranscriptView: handleLineClick(timestamp, text)
  ↓
setEditingLineKey(timestamp)
  ↓
<input> wird gerendert für diese Zeile
  ↓
User: Editiert Text
  ↓
handleEditChange(e)
  ↓
setEditedTexts({ ...editedTexts, [timestamp]: e.target.value })
```

#### Schritt 13.3: Auto-Save beim Verlassen

```
User: Klickt auf andere Zeile oder drückt Enter
  ↓
onBlur Event / onKeyDown(Enter)
  ↓
saveCurrentEdit()
  ↓
Finde Zeile mit timestamp in transcription
  ↓
Ersetze old line mit new line
  ↓
onTranscriptionChange(newTranscription)
  ↓
App: setTranscription(newTranscription)
```

#### Schritt 13.4: Header editieren

```
User: Klickt auf Header-Zeile (z.B. "------  Summary")
  ↓
handleHeaderClick(headerKey, text)
  ↓
setEditingHeaderKey(headerKey)
  ↓
<input> wird gerendert für Header
  ↓
User: Editiert → Auto-Save beim Verlassen (wie bei Zeilen)
```

---

### 14. Playback-Highlighting & Auto-Scroll

#### Schritt 14.1: Audio spielt

```
audioRef.current: timeupdate Event
  ↓
App: handleTimeUpdate()
  ↓
currentTime = audioRef.current.currentTime  // z.B. 15.5s
  ↓
TranscriptView: Findet closest timestamp ≤ 15.5s
  ↓
setCurrentTimestamp("00:00:15")
  ↓
setCurrentLineIndex(3)  // Eindeutiger Index
```

#### Schritt 14.2: Highlighting

```
renderTranscription()
  ↓
Für jede Zeile:
  const isHighlighted = (
    fullTimestamp === currentTimestamp && 
    index === currentLineIndex
  )
  ↓
<div className={isHighlighted ? 'bg-yellow-100 border-l-4 border-yellow-500' : ''}>
```

#### Schritt 14.3: Auto-Scroll (throttled)

```
useEffect(() => {
  if (currentLineIndex !== lastScrolledIndex.current) {
    const ref = timestampRefs.current[`${currentTimestamp}-${currentLineIndex}`];
    
    ref?.scrollIntoView({
      behavior: 'smooth',
      block: 'center'  // Zentriert auf Screen! ✅
    });
    
    lastScrolledIndex.current = currentLineIndex;
  }
}, [currentLineIndex]);
```

**Throttling**: Nur scrollen, wenn sich `currentLineIndex` ändert, nicht bei jedem `timeupdate`.

---

### 15. Summary-Navigation

#### Schritt 15.1: User klickt auf Summary-Heading

```
User: Klickt "Du bist ein Abbild des Göttlichen." (in Gesamtzusammenfassung)
  ↓
handleSummaryClick(headingText)
  ↓
Suche "----------  Du bist ein Abbild des Göttlichen." in transcription
  ↓
Finde Index der Zeile
  ↓
timestampRefs.current[`heading-${index}`].scrollIntoView({ block: 'center' })
  ↓
Heading wird kurz hervorgehoben (highlight-flash animation)
```

#### Schritt 15.2: Zurück zur Zusammenfassung

```
User: Scrollt in Transkription → "↑ Zur Zusammenfassung"-Button erscheint
  ↓
Click Button
  ↓
summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  ↓
Scrollt zurück zu "Gesamtzusammenfassung:"
```

**Wichtig**: Button ist auch im Edit-Modus aktiv! ✅

---

### 16. Standard-Dateien Auto-Load

#### Beim App-Start ohne URL-Parameter

```
App.js: useEffect(() => { loadDefaultFiles() }, [])
  ↓
loadDefaultFiles():
  ├─ loadLocalFile(DEFAULT_MP3_PATH)
  │  ├─ Datei existiert? → setAudioUrl, setAudioFile
  │  └─ Nicht gefunden? → MP3 DropArea anzeigen
  │
  └─ loadLocalFile(DEFAULT_TEXT_PATH)
     ├─ Datei existiert? → setTranscription
     └─ Nicht gefunden? → Text DropArea anzeigen (wenn edit=true)
```

```javascript
const DEFAULT_MP3_PATH = 'D:\\Dokumente\\HiDrive\\public\\Durchgaben\\x_test\\newsletter_2020-03_Corona-1.mp3';
const DEFAULT_TEXT_PATH = 'D:\\Dokumente\\HiDrive\\public\\Durchgaben\\x_test\\newsletter_2020-03_Corona-1_s.txt';

async function loadDefaultFiles() {
  const mp3Result = await loadLocalFile(DEFAULT_MP3_PATH, 'mp3');
  if (mp3Result.success) {
    setAudioFile({ name: filename, path: mp3Result.file.path });
    setAudioUrl(mp3Result.file.url);  // Stream-URL
  }
  
  const textResult = await loadLocalFile(DEFAULT_TEXT_PATH, 'txt');
  if (textResult.success) {
    setTranscription(textResult.file.content);
  }
}
```

**Backend: File-Streaming**
```javascript
// server/routes/files.js
router.get('/stream', (req, res) => {
  const filePath = req.query.path;
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Datei nicht gefunden' });
  }
  
  const stat = fs.statSync(filePath);
  res.writeHead(200, {
    'Content-Type': 'audio/mpeg',
    'Content-Length': stat.size
  });
  
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
});
```

---

## API-Aufrufe Aktualisiert

| Aktion | Endpoint | Methode | WebSocket Events |
|--------|----------|---------|------------------|
| Upload | `/api/upload` | POST | - |
| **Transcribe (Remote)** | `/api/transcribe` | POST | `progress`, `complete`, `error` |
| **Transcribe (Lokal)** | `/api/transcribe-local` | POST | `progress`, `result`, `error` |
| **Summarize (Remote)** | `/api/summarize` | POST | `progress`, `complete`, `error` |
| **Summarize (Lokal)** | `/api/summarize-local` | POST | `progress`, `result`, `error` |
| **List Local Files** | `/api/local-files/list` | GET | - |
| **Stream Local File** | `/api/files/stream` | GET | - |
| Get File | `/api/files/:filename` | GET | - |
| Delete File | `/api/files/:filename` | DELETE | - |
| Health Check | `/api/health` | GET | - |

---

## Workflow-Diagramm (Aktualisiert)

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Audio Player]  ← Auto-Load nach Transcribe (lokal) ✅        │
│                                                                 │
│  [Transcribe MP3 (lokal)] [Summarize (lokal)]                  │
│  [Transcribe MP3]         [Summarize]                          │
│  [Ctrl+E: Edit-Modus]                                          │
│                                                                 │
│  [Transkription mit Highlighting & Auto-Scroll] ← Inline-Edit ✅│
│    └─ [↑ Zur Zusammenfassung] (auch im Edit-Modus) ✅         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                           ↕ (WebSocket + HTTP)
┌─────────────────────────────────────────────────────────────────┐
│                        Express Backend                          │
├─────────────────────────────────────────────────────────────────┤
│  /api/transcribe-local  →  WSL2: transcribe.py                 │
│  /api/summarize-local   →  WSL2: summarize.py                  │
│  /api/transcribe        →  RunPod: Whisper API                 │
│  /api/summarize         →  RunPod: Llama API                   │
│  /api/files/stream      →  File-Streaming (lokale MP3s)        │
└─────────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────────┐
│  WSL2 Ubuntu + Python + CUDA + Whisper + Llama                  │
│    ← Live-Output-Streaming via spawn() ✅                      │
└─────────────────────────────────────────────────────────────────┘
```

---

**Weitere Details:** Siehe [UPDATES.md](./UPDATES.md) und [WSL2_INTEGRATION.md](./WSL2_INTEGRATION.md)
