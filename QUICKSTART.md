# ⚡ Quick Start Guide

## In 5 Minuten zur laufenden App

### 1. Dependencies installieren (2 Min)

```bash
# Root + Backend
npm install

# Frontend
cd client
npm install
cd ..
```

### 2. Environment konfigurieren (1 Min)

Die `.env` Datei existiert bereits. Passe sie an:

```env
RUNPOD_WHISPER_ENDPOINT=https://api.runpod.ai/v2/YOUR_WHISPER_ENDPOINT
RUNPOD_LLAMA_ENDPOINT=https://api.runpod.ai/v2/YOUR_LLAMA_ENDPOINT
RUNPOD_API_KEY=YOUR_API_KEY_HERE
```

### 3. App starten (1 Min)

```bash
npm run dev
```

**Fertig!** App läuft auf http://localhost:3000

### 4. Erste Schritte (1 Min)

1. **Test-Transkription laden:**
   ```
   http://localhost:3000?text=./base-data/test_3min.txt
   ```

2. **Timestamp klicken:**
   - Klicke auf `[00:00:01]`
   - Audio springt zur Position (wenn geladen)

3. **Edit-Modus testen:**
   ```
   http://localhost:3000?edit=true
   ```

---

## Häufige Probleme

### Port bereits belegt?
```bash
# Ändere PORT in .env
PORT=5001
```

### Tailwind-Styles fehlen?
```bash
cd client
npm install -D tailwindcss postcss autoprefixer
```

### WebSocket-Error?
Überprüfe `client/src/App.js` Zeile 30:
```javascript
const socket = io('http://localhost:5000');
```

---

## Nächste Schritte

✅ App läuft
→ Lies [README.md](./README.md) für Features
→ Lies [INSTALLATION.md](./INSTALLATION.md) für Details
→ Lies [ARCHITECTURE.md](./ARCHITECTURE.md) für Technik
→ Lies [WORKFLOW.md](./WORKFLOW.md) für Workflows

---

## Projektstruktur (Überblick)

```
mp3-transcriber-app/
├── client/              # React Frontend
│   ├── src/
│   │   ├── components/  # UI-Komponenten
│   │   ├── services/    # API-Service
│   │   └── utils/       # Helper-Funktionen
│   └── package.json
│
├── server/              # Node.js Backend
│   ├── routes/          # API-Routes
│   │   ├── upload.js
│   │   ├── transcribe.js
│   │   ├── summarize.js
│   │   └── files.js
│   └── index.js
│
├── uploads/             # Temporäre Dateien
├── .env                 # Konfiguration
└── package.json
```

---

## Features-Checkliste

- ✅ MP3-Upload (Drag & Drop)
- ✅ Audio-Player (Play/Pause, Seek, Volume)
- ✅ Transkription (Whisper API)
- ✅ Timestamps (klickbar)
- ✅ Zusammenfassung (Llama API)
- ✅ Edit-Modus (Monaco Editor)
- ✅ Real-time Progress (WebSocket)
- ✅ URL-Parameter (?mp3=..., ?text=..., ?edit=true)
- ✅ Responsive Design (Tailwind CSS)

---

## Support

- 📖 Ausführliche Doku: [README.md](./README.md)
- 🏗️ Architektur: [ARCHITECTURE.md](./ARCHITECTURE.md)
- 🔄 Workflows: [WORKFLOW.md](./WORKFLOW.md)
- 📦 Installation: [INSTALLATION.md](./INSTALLATION.md)

**Happy Coding! 🚀**
