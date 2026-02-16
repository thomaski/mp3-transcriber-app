# 🆕 Updates & Änderungen

**Stand:** Februar 2026

Dieses Dokument beschreibt die wichtigsten Änderungen und neuen Features der MP3 Transcriber App.

---

## 🎯 Aktuelle Features

### 1. **WSL2 Integration für lokale Verarbeitung**

Die App unterstützt jetzt lokale Transkription und Summarization via WSL2 Python-Skripte:

- **Transcribe MP3 (lokal)**: Transkribiert MP3-Dateien mit Faster-Whisper (openai/whisper-large-v3)
- **Summarize (lokal)**: Erstellt Summaries mit Llama-3.1-8B-CT2

**Vorteile:**
- ✅ Keine Cloud-Kosten
- ✅ Volle Kontrolle über Daten
- ✅ Schnellere Verarbeitung bei lokaler GPU
- ✅ Live-Output-Streaming mit ANSI-Farben

**Details:** Siehe [WSL2_INTEGRATION.md](./WSL2_INTEGRATION.md)

---

### 2. **Intelligente Dateiauswahl**

#### Automatische MP3-Verwendung
- **MP3 geladen + Transcribe geklickt** → Startet sofort, kein Modal!
- **Keine MP3** → Zeigt Dateiauswahl-Modal

#### Intelligente Summary-Erstellung
- **Transkription OHNE Summary** → Verwendet aktuelle Transkription direkt
- **Transkription MIT Summary** → Öffnet Dateiauswahl für andere Datei

#### Doppelklick-Support
- Doppelklick in Dateiauswahl-Modals → Sofortige Auswahl und Start

---

### 3. **Live-Output-Modal**

Echtzeit-Anzeige der WSL2-Prozess-Ausgaben:

- **Terminal-Style**: Schwarzer Hintergrund, Monospace-Font
- **ANSI-Farben**: Farbige Ausgaben wie im echten Terminal
- **Auto-Scroll**: Folgt automatisch dem Output
- **Fortschrittsbalken**: Visueller Fortschritt (0-100%)
- **Auto-Close**: Schließt nach 3 Sekunden bei Erfolg
- **Optimale Größe**: 80% × 70% des Viewports

---

### 4. **Verbesserter Audio-Player**

- **Dateiname-Anzeige**: Zeigt Original-Dateinamen unter dem Player-Titel
- **Vollständiger Pfad**: Tooltip zeigt kompletten Pfad
- **Automatisches Laden**: Nach lokaler Transkription wird MP3 automatisch geladen

---

### 5. **Standard-Dateien beim Start**

Wenn keine URL-Parameter angegeben sind, lädt die App automatisch:

- **MP3**: `D:\Dokumente\HiDrive\public\Durchgaben\x_test\newsletter_2020-03_Corona-1.mp3`
- **Text**: `D:\Dokumente\HiDrive\public\Durchgaben\x_test\newsletter_2020-03_Corona-1_s.txt`

Falls Dateien nicht gefunden werden, erscheinen die entsprechenden Drop-Areas.

---

### 6. **Inline-Editing-Modus**

Optimiertes Editing-Erlebnis:

- **Zeilenweise editierbar**: Nur die Zeile unter dem Cursor ist editierbar
- **Automatisches Speichern**: Beim Verlassen einer Zeile wird gespeichert
- **Header-Editing**: Überschriften können direkt bearbeitet werden
- **Keyboard-Shortcuts**:
  - `Ctrl+E`: Edit-Modus togglen
  - `Esc`: Edit-Modus beenden (wenn kein Input fokussiert)

---

### 7. **Verbesserte Transkriptions-Ansicht**

#### Highlighting während Playback
- Aktuelle Zeile wird farblich hervorgehoben
- Timestamp wird heller hervorgehoben
- Automatisches Scrollen zur aktuellen Position
- Zentrierte Anzeige der aktuellen Zeile

#### Summary-Navigation
- Klick auf Summary-Heading → Springt zur Überschrift im Text
- "↑ Zur Zusammenfassung"-Button → Zurück zur Gesamtzusammenfassung
- Auch im Edit-Modus verfügbar

#### Duplikat-Filterung
- Erste Vorkommnisse von Duplikaten werden automatisch entfernt
- Verhindert Highlighting-Probleme

---

### 8. **Datei-Management**

#### Drop-Areas
- **MP3 Drop-Area**: Oben für Audio-Dateien
- **Text Drop-Area**: Unten für Transkriptions-Dateien (nur im Edit-Modus)
- Feste Positionierung: Text-Area bleibt immer unter MP3-Area/Player

#### "Neue Datei laden"-Button
- Entlädt aktuelle MP3 und Transkription
- Aktiviert beide Drop-Areas
- Reset aller States

---

## 🔧 Technische Verbesserungen

### Socket.io Events für lokale Verarbeitung

**Transcribe Events:**
- `transcribe:progress` - Live-Fortschritt
- `transcribe:result` - Fertiges Ergebnis mit MP3-Dateinamen
- `transcribe:error` - Fehlerbehandlung

**Summarize Events:**
- `summarize:progress` - Live-Fortschritt
- `summarize:result` - Fertige Summary
- `summarize:error` - Fehlerbehandlung

### Neue Backend-Routes

```javascript
// Lokale Dateiliste
GET /api/local-files/list?type=mp3|txt

// Lokale Transkription
POST /api/transcribe-local
Body: { filename: "test.mp3", socketId: "..." }

// Lokale Summarization
POST /api/summarize-local
Body: { 
  filename: "test.txt",        // Optional
  transcription: "...",         // Optional (direkte Transkription)
  socketId: "..." 
}

// Datei-Streaming
GET /api/files/stream?path=<absolute-path>
```

### Neue Frontend-Komponenten

- **`FileSelectionModal.js`**: Dateiauswahl mit Metadaten (Größe, Datum)
- **`LiveOutputModal.js`**: Live-Output mit ANSI-Farb-Support

---

## 📋 Workflow-Beispiele

### Lokale Transkription

```
1. User lädt MP3 (Drag & Drop oder Standard-Load)
2. Klick auf "Transcribe MP3 (lokal)"
   → Keine Auswahl nötig, startet sofort! ✅
3. Live-Output-Modal zeigt Fortschritt
4. Nach Abschluss:
   - Transkription wird angezeigt
   - MP3 bleibt im Player
   - Modal schließt sich automatisch
```

### Lokale Summarization aus aktueller Transkription

```
1. Transkription ist geladen (ohne Summary)
2. Klick auf "Summarize (lokal)"
   → Verwendet direkt die aktuelle Transkription! ✅
3. Live-Output-Modal zeigt Fortschritt
4. Summary wird angezeigt mit:
   - Gesamtzusammenfassung oben
   - Überschriften im Text
   - Klickbare Navigation
```

### Lokale Summarization aus Datei

```
1. Transkription mit Summary bereits vorhanden
2. Klick auf "Summarize (lokal)"
   → Öffnet Dateiauswahl-Modal
3. Doppelklick auf TXT-Datei
   → Startet sofort! ✅
4. Live-Output-Modal → Summary wird angezeigt
```

---

## 🎨 UI/UX-Verbesserungen

### Design
- Moderne, konsistente Farbpalette
- Smooth Transitions und Animationen
- Responsive Layout für alle Bildschirmgrößen
- Klare visuelle Hierarchie

### Feedback
- Status-Indikatoren (Audio geladen, Transkription verfügbar, Verarbeitung läuft)
- Toast-Notifications für Fehler
- Progress-Bars mit Prozentangabe
- Console-Logs für Debugging

### Accessibility
- Keyboard-Navigation
- Tooltips für alle Buttons
- Kontrastreiche Farben
- Screen-Reader-freundlich

---

## 🚀 Performance

### Optimierungen
- **Code-Splitting**: Lazy Loading von Monaco Editor
- **Memoization**: React.memo für teure Komponenten
- **Throttling**: Auto-Scroll-Throttling für stabiles Highlighting
- **Socket-Optimierung**: Batch-Updates für Live-Output

### Streaming
- Audio-Streaming für lokale Dateien
- Live-Output-Streaming für WSL2-Prozesse
- Chunked-Transfer für große Transkriptionen

---

## 🔒 Sicherheit

- CORS-konfiguriert für localhost
- File-Type-Validierung (MP3, TXT)
- Path-Sanitization für lokale Dateien
- Socket.io mit Raum-basierter Kommunikation

---

## 📝 PowerShell-Alias

Praktische Alias für schnelle Befehle:

```powershell
start_server    # Startet den Server
cmds            # Zeigt alle Befehle
force_stop      # Beendet Node-Prozesse
```

Wird automatisch beim Terminal-Start geladen.

---

## 🐛 Bekannte Einschränkungen

1. **WSL2 erforderlich**: Für lokale Verarbeitung muss WSL2 installiert sein
2. **Windows-Pfade**: Hardcodiert für Windows (`D:\...`)
3. **Upload für lokale Transkription**: Hochgeladene MP3s können nicht lokal transkribiert werden (nur aus WSL-Verzeichnis)

---

## 📚 Weiterführende Dokumentation

- [README.md](./README.md) - Projekt-Übersicht
- [INSTALLATION.md](./INSTALLATION.md) - Setup-Anleitung
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technische Architektur
- [WSL2_INTEGRATION.md](./WSL2_INTEGRATION.md) - WSL2-Setup und -Verwendung
- [WORKFLOW.md](./WORKFLOW.md) - Benutzer-Workflows
- [COMMANDS.md](./COMMANDS.md) - Alle verfügbaren Befehle

---

**Letzte Aktualisierung:** 14. Februar 2026
