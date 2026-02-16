# 📋 Changelog

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/).

---

## [2.0.0] - 2026-02-14

### 🆕 Neue Features

#### WSL2 Integration
- **Lokale Transkription**: `transcribe.py` via WSL2 Ubuntu mit CUDA-Support
- **Lokale Summarization**: `summarize.py` via WSL2 Ubuntu mit CUDA-Support
- **Live-Output-Modal**: Terminal-Style mit ANSI-Farben und Auto-Close
- **Socket.io Events**: `transcribe:result` und `summarize:result` für WSL2-Prozesse
- **Child Process Integration**: `child_process.spawn` für WSL2-Kommandos

#### Intelligente Dateiauswahl
- **Automatische MP3-Verwendung**: MP3 geladen → Transcribe startet sofort ohne Modal
- **Intelligente Summary-Logik**: Transkription ohne Summary → Verwendet aktuelle Transkription direkt
- **Doppelklick-Support**: Doppelklick in FileSelectionModal → Sofortige Auswahl und Start

#### UI/UX-Verbesserungen
- **Standard-Dateien**: Auto-Load beim App-Start ohne URL-Parameter
- **Player-Verbesserungen**: Original-Dateinamen-Anzeige, Auto-Load nach lokaler Transkription
- **Inline-Editing**: Zeilenweise editieren mit Auto-Save, Header-Editing
- **Keyboard-Shortcuts**: `Ctrl+E` für Edit-Modus, `Esc` zum Beenden
- **Playback-Highlighting**: Aktuelle Zeile hervorheben und zentrieren (throttled auto-scroll)
- **Summary-Navigation**: Klickbare Überschriften, "↑ Zur Zusammenfassung"-Button (auch im Edit-Modus)
- **Drop-Area-Layout**: Feste Positionierung (Text-DropArea bleibt immer unter MP3-DropArea/Player)

#### Backend-Erweiterungen
- **Neue Routes**:
  - `POST /api/transcribe-local`: WSL2 Python-Transkription
  - `POST /api/summarize-local`: WSL2 Python-Summarization (mit Temp-File-Support)
  - `GET /api/local-files/list`: Lokale Dateiliste aus WSL2-Verzeichnis
  - `GET /api/files/stream`: File-Streaming für lokale MP3-Dateien
- **ANSI-Code-Parsing**: Backend sendet rohe ANSI-Codes, Frontend konvertiert zu HTML

#### Neue Komponenten
- **FileSelectionModal**: Dateiauswahl mit Metadaten (Größe, Datum), Doppelklick-Support
- **LiveOutputModal**: Terminal-Style Live-Output für WSL2-Prozesse (80% × 70% Viewport)
- **TextDropZone**: Separate Drop-Area für TXT-Dateien (nur im Edit-Modus)

### ✨ Verbesserungen

#### Audio Player
- **Separate Buttons**: Play, Pause, Stop (vorher nur Play/Pause-Toggle)
- **Button-Synchronisation**: Play ↔ Pause Toggle basierend auf Audio-Events (`play`, `pause`)
- **Dateiname-Anzeige**: Original-Dateinamen unter Player-Titel
- **Pause bei Summary-Click**: Player pausiert automatisch beim Klick auf Summary-Heading

#### Transkriptions-Ansicht
- **Dynamische Höhe**: Content-Bereich nutzt verfügbaren Platz (resize-aware)
- **Duplikat-Filterung**: Erste Vorkommnisse von Duplikaten werden entfernt
- **Highlighting-Fix**: Eindeutige Identifikation via `timestamp + lineIndex`
- **Scroll-Optimierung**: Throttled auto-scroll, zentrierte Anzeige
- **Timestamp-Styling**: Helleres Highlighting für bessere Lesbarkeit

### 🔧 Technische Änderungen

#### State Management
- **audioFile.name**: Explizite Speicherung des Original-Dateinamens
- **audioFile.isUploaded**: Flag zur Unterscheidung von lokalen vs. hochgeladenen Dateien
- **editingLineKey / editingHeaderKey**: Tracking für Inline-Editing
- **editedTexts / editedHeaders**: State für editierte Inhalte (mit timestamp/key)

#### Event-Handling
- **Global Keyboard Shortcuts**: `useEffect` mit `keydown`-Listener für `Ctrl+E`, `Esc`
- **Audio Events**: `play` und `pause` Event-Listener für Button-Synchronisation
- **Inline-Edit Events**: `onBlur`, `onKeyDown` (Enter) für Auto-Save
- **Double-Click**: `onDoubleClick` für FileSelectionModal-Items

### 🐛 Bugfixes

- **Highlighting**: Funktioniert jetzt korrekt nach Duplikat-Filterung
- **Text-Shifting**: Highlighting verschiebt Text nicht mehr nach rechts
- **Multiple Highlights**: Nur eine Zeile wird hervorgehoben (nicht alle mit gleichem Timestamp)
- **Edit-Save**: Änderungen werden korrekt gespeichert beim Verlassen einer Zeile
- **Modal-Close**: LiveOutputModal schließt sich nach 3 Sekunden bei Erfolg
- **Summary-Display**: Summary wird nach lokaler Summarization korrekt angezeigt
- **MP3-Display**: MP3 wird nach lokaler Transkription im Player geladen

### 📚 Dokumentation

- **UPDATES.md**: Neue Datei mit allen Features und Änderungen (2026)
- **CHANGELOG.md**: Diese Datei
- **README.md**: Aktualisiert mit neuen Features und WSL2-Integration
- **WORKFLOW.md**: Erweitert mit neuen Workflows (WSL2, Inline-Editing, etc.)
- **WSL2_INTEGRATION.md**: Bestehende Dokumentation (bereits vorhanden)
- **COMMANDS.md**: PowerShell-Alias-Dokumentation (bereits vorhanden)

### ⚙️ PowerShell-Integration

- **Alias**: `start_server`, `cmds`, `force_stop`
- **Auto-Load**: Alias werden beim Terminal-Start geladen
- **Profile**: `Microsoft.PowerShell_profile.ps1` konfiguriert

---

## [1.0.0] - 2026-02-13 (Initial Release)

### Features

#### Core Features
- MP3-Upload via Drag-and-Drop oder URL-Parameter
- HTML5 Audio Player mit Custom Controls
- Transkription mit RunPod Whisper API (openai/whisper-large-v3)
- Zusammenfassung mit RunPod Llama API (Llama-3.1-8B-CT2)
- Klickbare Timestamps für Audio-Navigation
- Edit-Modus mit Monaco Editor
- Text-Import via Drag-and-Drop
- WebSocket-basierte Progress-Updates
- Responsive Design mit Tailwind CSS

#### Frontend
- React 18.2 mit Hooks
- Tailwind CSS für Styling
- Monaco Editor für Text-Editing
- react-dropzone für File-Upload
- Socket.io-client für WebSocket
- Axios für HTTP-Requests

#### Backend
- Node.js + Express
- Socket.io Server
- Multer für File-Upload
- RunPod API-Integration
- File-Management (Upload, Download, Delete)

#### Komponenten
- `AudioPlayer.js`: Audio-Player mit Controls
- `TranscriptView.js`: Transkript-Anzeige
- `ControlPanel.js`: Button-Panel
- `DropZone.js`: Drag-and-Drop Zone
- `ProgressModal.js`: Progress-Overlay

#### API-Endpunkte
- `POST /api/upload`: File-Upload
- `POST /api/transcribe`: Transkription (RunPod)
- `POST /api/summarize`: Zusammenfassung (RunPod)
- `GET /api/files/:filename`: File-Download
- `DELETE /api/files/:filename`: File-Delete
- `GET /api/health`: Health-Check

---

## Geplante Features (Roadmap)

### Version 2.1.0
- [ ] Batch-Processing: Mehrere MP3s gleichzeitig verarbeiten
- [ ] Export-Funktionen: PDF, DOCX, SRT (Untertitel)
- [ ] Audio-Visualisierung: Waveform-Anzeige
- [ ] Undo/Redo im Edit-Modus
- [ ] Custom Shortcuts für Timestamps
- [ ] Dark-Mode

### Version 2.2.0
- [ ] Multi-Language-Support (Englisch, Französisch, etc.)
- [ ] Speaker-Diarization (Wer spricht wann?)
- [ ] Custom Model-Endpoints (eigene Whisper/Llama-Modelle)
- [ ] Audio-Recording direkt in der App
- [ ] Cloud-Storage-Integration (Dropbox, Google Drive)

### Version 3.0.0
- [ ] User-Authentifizierung & Multi-User-Support
- [ ] Datenbank-Integration (PostgreSQL)
- [ ] Projekt-Management (Ordner, Tags, Suche)
- [ ] Collaboration-Features (Shared Editing)
- [ ] API für externe Integration

---

**Hinweis**: Dieses Changelog wird bei jedem Release aktualisiert. Für tägliche Updates siehe Git-Commit-History.
