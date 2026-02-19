# 📋 Changelog - MP3 Transcriber App

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

---

## [v1.0.0] - 2026-02-19 — 🏷️ Erster offizieller Release

> **Git-Tag:** `v1.0.0` | `MP3 Transcriber App v1.0.0`  
> Erster öffentlich getaggter Release der MP3 Transcriber App.  
> Beinhaltet alle Features aus den Entwicklungsversionen 2.0.0 und 2.1.0.  
> Enthält vollständige CRLF-Normalisierung, Header-Scroll-Fix, Audio-Player via Blob-URL,  
> rollenbasierte UI, UserManagement, Public Landing Pages und hash-basierte Duplikatserkennung.

---

## [2.1.0] - 2026-02-19

### 🎨 **UI/UX Verbesserungen & Vereinfachungen**

#### **TranscribeScreen - Vereinfachte Speicher-Logik**
- ❌ **Entfernt:** Komplexer "Transkription speichern für Benutzer" Block
- ❌ **Entfernt:** Separate "Transkription in Datenbank speichern" Button
- ✅ **Neu:** Einzelner intelligenter "💾 Transkription speichern" Button mit Auto-Logik:
  - Wenn ID vorhanden → Direkt Update in DB
  - Wenn User ausgewählt → Direkt für User speichern
  - Wenn kein User → User-Auswahl Modal öffnen → Auto-Save nach Auswahl

#### **ControlPanel - Optimiertes Button-Layout**
- Buttons jetzt in einer übersichtlichen Zeile angeordnet
- **Links:** Admin-Buttons (Transcribe MP3, Summarize) + Transkription speichern
- **Rechts:** Neue Datei laden, Edit-Modus Toggle
- Status-Anzeige unter Buttons: Audio, Transkription, Verarbeitungsstatus
- Success-Info nach Speichern: "✅ Gespeichert für: [Username] ID: [xyz]"

#### **Dashboard - Rollenbasierte Anzeige**
- "MP3 Transkribieren" Kachel nur noch für Admins sichtbar
- Normale User sehen nur für sie relevante Funktionen

#### **UserManagement - Layout-Optimierung**
- Grid-Layout angepasst: `grid-cols-2` statt `grid-cols-[1fr_420px]`
- Beide Spalten jetzt gleich breit (50/50) für bessere Zentrierung
- Zusätzliche Container-Begrenzung: `max-w-6xl mx-auto`
- MP3-Transkriptionen aufsteigend sortiert nach Dateinamen (A-Z)

#### **Public Access - Verbesserter Flow**
- Nach Public Access Verifikation direkt zu `/my-transcriptions` statt Dashboard
- `PublicMp3View` leitet jetzt automatisch zur TranscribeScreen mit geladener Transkription weiter
- Keine separate "Public View" mehr - direkt vollwertige TranscribeScreen

#### **MyTranscriptions - Neue Seite**
- Clickbare MP3-Transkriptionen in User-Liste
- Navigation zu spezifischer Transkription: `/transcribe/:transcriptionId`
- Übersichtliche Tabelle mit ID, MP3-Datei, Summary-Status, Erstelldatum

### 🔧 **Backend Improvements**

#### **Cache-Control Headers**
- `index.html`: `no-cache, no-store, must-revalidate` (nie cachen)
- JS/CSS Bundles: `public, max-age=31536000, immutable` (1 Jahr cachen)
- Verhindert Browser-Cache-Probleme nach Deployments

#### **Lazy Loading**
- `UserManagement` Component wird jetzt lazy geladen (`React.lazy`)
- Verhindert Tree-Shaking-Probleme bei Admin-only Components
- Bessere Performance durch Code-Splitting

### 📝 **Dokumentation**
- CHANGELOG.md aktualisiert mit allen Änderungen vom 2026-02-19

---

## [2.0.0] - 2026-02-18

### 🎉 **Major Release: PostgreSQL Migration & Neue Features**

---

### 🗄️ **Datenbank-Migration: SQLite → PostgreSQL**

#### **Warum PostgreSQL?**
- ✅ Bessere Concurrent Access
- ✅ Native JSONB für audit_logs  
- ✅ BYTEA für große Binärdaten (MP3-Dateien)
- ✅ Remote Access möglich
- ✅ Replication & Backup-Strategien
- ✅ Horizontal Skalierung vorbereitet

#### **Schema-Änderungen**

| Feature | SQLite (alt) | PostgreSQL (neu) |
|---------|-------------|------------------|
| **IDs** | TEXT (6 chars) | UUID (gen_random_uuid()) |
| **Binärdaten** | BLOB | BYTEA |
| **Boolean** | INTEGER (0/1) | BOOLEAN |
| **JSON** | TEXT | JSONB |
| **Timestamps** | TEXT (ISO 8601) | TIMESTAMP |

#### **Neue Dateien**
- `server/db/database-pg.js` - PostgreSQL Connection Manager
- `server/db/postgresql-schema.sql` - PostgreSQL Schema
- `server/db/seed-pg.js` - Seed-Script für Default-User
- `server/db/migrate-sqlite-to-pg.js` - Migrations-Script von SQLite
- `POSTGRESQL_MIGRATION.md` - Detaillierte Migrationsanleitung

---

### 💾 **MP3-Dateien in Datenbank statt Filesystem**

#### **Upload-Flow (vorher)**
```
User → MP3 Upload → Filesystem (./uploads/) → Transkription
```

#### **Upload-Flow (nachher)**
```
User → MP3 Upload → Memory Buffer → PostgreSQL (mp3_data BYTEA) → Transkription
```

#### **Vorteile**
- ✅ Keine Filesystem-Abhängigkeit
- ✅ Atomic Transactions (MP3 + Transkription zusammen)
- ✅ Einfacheres Backup (nur DB)
- ✅ Keine verwaisten Dateien
- ✅ Skalierung mit DB (kein lokaler Storage nötig)

#### **Neue Endpoints**
```javascript
GET  /api/transcriptions/:id/audio     // Stream MP3 aus DB
GET  /api/transcriptions/:id/download  // Download Transkription als TXT
POST /api/transcriptions               // Mit MP3-Upload (multipart/form-data)
```

#### **Geänderte Dateien**
- `server/routes/upload.js` - Multer auf memoryStorage umgestellt
- `server/routes/transcriptions-pg.js` - Neue Route mit mp3_data BYTEA-Support
- `server/routes/transcribe.js` - Unterstützt jetzt Buffer (DB) und Dateipfad (legacy)

---

### 👥 **User-Zuordnung bei neuer Transkription**

#### **Logik**
- **Standard-User**: Transkription wird automatisch für eigenen User gespeichert
- **Admin**: Kann Ziel-User auswählen (mit Autocomplete)

#### **POST /api/transcriptions - Erweitert**

**Vorher:**
```javascript
{
  "mp3_filename": "audio.mp3",
  "transcription_text": "..."
}
// Transkription wird automatisch für aktuellen User gespeichert
```

**Nachher:**
```javascript
{
  "mp3_filename": "audio.mp3",
  "transcription_text": "...",
  "target_user_id": "uuid-des-ziel-users"  // NUR für Admins
}
// Admin kann Ziel-User auswählen
```

#### **GET /api/users/search - Neu (Autocomplete)**

**Endpoint:**
```
GET /api/users/search?q=tom
```

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": "uuid-1",
      "username": "tom",
      "first_name": "Tom",
      "last_name": "Kiesewetter",
      "displayName": "Tom Kiesewetter (tom)"
    }
  ]
}
```

**Features:**
- ILIKE-Search (case-insensitive)
- Sucht in: `username`, `first_name`, `last_name`
- Limit: 10 Ergebnisse
- Nur für Admins

---

### 📥 **Transkriptionstext lokal speichern (Download)**

#### **Neuer Endpoint**
```javascript
GET /api/transcriptions/:id/download
```

**Response:**
```http
Content-Type: text/plain; charset=utf-8
Content-Disposition: attachment; filename="audio_transcription.txt"

Datum:   18.02.2026
Start:   14:32:15
Dauer:   00:01:23
Modell:  openai/whisper-large-v3

[00:00:01] Transkriptionstext...
[00:00:15] Weiterer Text...
```

---

### 🎨 **UI/UX-Verbesserungen**

#### **Button-Position beim Editieren optimiert**

**Vorher:**
```jsx
<button className="fixed bottom-8 right-8 z-50 ...">
  Zur Zusammenfassung
</button>
```
- Button war am **rechten Bildschirmrand** fixiert
- Weit entfernt von der Transkription

**Nachher:**
```jsx
<button className="absolute top-20 right-6 z-10 ..." style={{ position: 'sticky' }}>
  Zur Zusammenfassung
</button>
```
- Button ist **innerhalb des Transkriptions-Containers**
- **Rechts neben** der Transkription (nicht am Bildschirmrand)
- `sticky` Position: bleibt beim Scrollen sichtbar

---

### ☁️ **Cloudflare Tunnel - Konfigurierbarer Schalter**

#### **Was ist neu?**
- ✅ `.env` Variable zum An-/Abschalten des Cloudflare Tunnels
- ✅ Automatischer Start nur wenn aktiviert
- ✅ Einfache Konfiguration

#### **Konfiguration in `.env`:**
```env
# Cloudflare Tunnel Configuration
CLOUDFLARE_TUNNEL_ENABLED=true   # true = aktiviert, false = deaktiviert
CLOUDFLARE_TUNNEL_NAME=mp3-transcriber
```

#### **Start-Scripts berücksichtigen jetzt die Variable**
- `start-cloudflare.ps1` - Prüft `.env` vor dem Start
- `start-server-autostart.ps1` - Startet Tunnel nur wenn aktiviert

---

### 🌐 **Remote Start von Win7**

#### **Was ist das?**
Das `remote-start-from-win7.ps1` Script ermöglicht es, den MP3 Transcriber Server auf dem Win11 Rechner **von einem Win7 Rechner aus** zu starten.

#### **Funktionsweise:**
1. **PowerShell Remoting**: Nutzt `Invoke-Command` für Remote-Ausführung
2. **Credential-Abfrage**: Sicherer Login mit Benutzername/Passwort
3. **Status-Check**: Prüft ob Server bereits läuft
4. **Automatischer Start**: Startet Server falls noch nicht aktiv

#### **Verwendung:**
```powershell
# Auf Win7:
.\remote-start-from-win7.ps1

# Eingabe:
# - Benutzername (Win11)
# - Passwort (Win11)
# → Server startet auf Win11
# → Erreichbar unter http://192.168.178.20:5000
```

#### **Voraussetzungen:**
- PowerShell Remoting auf Win11 aktiviert
- Netzwerkverbindung zwischen Win7 und Win11
- Gültige Anmeldedaten für Win11

#### **Technische Details:**
- **Ziel-IP**: `192.168.178.20` (Win11 Rechner)
- **Ziel-Port**: `5000` (Server-Port)
- **Remote-Command**: `cd D:\Projekte\git\mp3-transcriber-app; npm run dev`
- **Fenster-Modus**: Normal (sichtbar auf Win11)

---

### 📚 **Dokumentations-Konsolidierung**

#### **ARCHITECTURE.md - Vollständig überarbeitet**
- ✅ Konsolidierung von `ARCHITECTURE.md` und `ARCHITECTURE_V2_PROPOSAL.md`
- ✅ Alle Architekturinformationen in einem Dokument
- ✅ PostgreSQL-Migration dokumentiert
- ✅ Neue Features dokumentiert
- ✅ Skalierungs-Strategie hinzugefügt

#### **CHANGELOG.md - Alle Änderungen konsolidiert**
- ✅ Integration von `ÄNDERUNGEN_V2.md`
- ✅ Integration von `CHANGELOG.md`
- ✅ Integration von `UPDATES.md`
- ✅ Ein einheitliches Changelog für alle Versionen

#### **README.md - Aktualisiert**
- ✅ PostgreSQL statt SQLite
- ✅ Port 5000 statt 4000/3000 (Production-Setup)
- ✅ Neue Features dokumentiert
- ✅ Cloudflare Tunnel Integration
- ✅ Remote Start von Win7
- ✅ Neue API-Endpoints

#### **Dateien gelöscht (obsolet):**
- ❌ `ÄNDERUNGEN_V2.md` (in CHANGELOG.md integriert)
- ❌ `UPDATES.md` (in CHANGELOG.md integriert)
- ❌ `ARCHITECTURE_V2_PROPOSAL.md` (in ARCHITECTURE.md integriert)
- ❌ `CLOUDFLARE_TUNNEL_PERMANENT.md` (in README.md integriert)
- ❌ `CLOUDFLARE_TUNNEL_SETUP.md` (in README.md integriert)
- ❌ `EXTERNE_TESTS_ANLEITUNG.md` (in README.md integriert)
- ❌ `PORTS_AND_URLS.md` (in README.md integriert)
- ❌ `fix-hardcoded-ports.ps1` (obsolet)
- ❌ `transcriber.db` (SQLite, jetzt PostgreSQL)
- ❌ `server/transcriber.db` (SQLite, jetzt PostgreSQL)

---

### 🔧 **Backend-Änderungen**

#### **Server-Code auf PostgreSQL umgestellt**
- `server/index.js` - Verwendet `database-pg` und `seed-pg`
- `server/routes/auth.js` - PostgreSQL-Queries
- `server/utils/logger.js` - PostgreSQL-Queries
- Alle Queries von `?` auf `$1, $2, ...` umgestellt

#### **Neue Routes**
- `server/routes/users-pg.js` - User-Management mit Search-Route
- `server/routes/transcriptions-pg.js` - Transcriptions mit BYTEA-Support

---

### 🔐 **User-Verwaltung aktualisiert**

#### **Standard-User (neu):**

| Vorname | Nachname | Username | Email | Passwort | Rolle |
|---------|----------|----------|-------|----------|-------|
| tom | - | tom | thomas.kiesswetter@gmx.de | MT9#Detomaso | Admin |
| micha | - | micha | michaelabrassat@gmx.de | MT9#Schutzengel | Admin |
| test | - | test | - | test | User |

---

### ⚙️ **Environment-Variablen aktualisiert**

#### **Neue Variablen in `.env`:**
```env
# PostgreSQL Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD="PG9#Detomaso"
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=mp3_transcriber

# Cloudflare Tunnel Configuration
CLOUDFLARE_TUNNEL_ENABLED=true
CLOUDFLARE_TUNNEL_NAME=mp3-transcriber

# Server Configuration (aktualisiert)
PORT=5000                           # Production Port (nicht mehr 4000!)
CLIENT_URL=http://localhost:5000    # Frontend URL (aktualisiert)
```

---

### 🐛 **Bugfixes**

#### **Client URL korrigiert**
- **Vorher**: `CLIENT_URL=http://localhost:3000` (falsch!)
- **Nachher**: `CLIENT_URL=http://localhost:5000` (korrekt!)
- **Grund**: Frontend wird jetzt vom Backend-Server auf Port 5000 ausgeliefert

#### **Environment-Loading in DB-Scripts**
- `database-pg.js` - `dotenv.config()` hinzugefügt
- `seed-pg.js` - `dotenv.config()` hinzugefügt

#### **Password mit Sonderzeichen in `.env`**
- Passwörter mit `#` müssen in Anführungszeichen: `"PG9#Detomaso"`

---

### ⚠️ **Breaking Changes**

#### **1. Datenbank-Wechsel**
- SQLite → PostgreSQL
- Alte `database.js` → Neue `database-pg.js`
- Query-Syntax: `?` → `$1, $2, ...`

#### **2. ID-Format**
- SQLite: 6-Zeichen alphanumerisch (`abc123`)
- PostgreSQL: UUID (`550e8400-e29b-41d4-a716-446655440000`)

#### **3. Boolean-Werte**
- SQLite: INTEGER `0`/`1`
- PostgreSQL: BOOLEAN `false`/`true`

#### **4. MP3-Speicherung**
- Vorher: Filesystem (`./uploads/`)
- Nachher: PostgreSQL BYTEA

#### **5. Port-Konfiguration**
- Production Port: **5000** (nicht mehr 4000!)
- Frontend wird vom Backend ausgeliefert

---

### 📦 **Neue Dependencies**

#### **Backend**
- `pg` (v8.11.3) - PostgreSQL Client

---

### 📊 **Neue Route-Übersicht**

### **Transcriptions (PostgreSQL)**
```
GET    /api/transcriptions              // Liste (User oder Admin)
POST   /api/transcriptions              // Neu (mit target_user_id für Admin)
GET    /api/transcriptions/:id          // Details (ohne mp3_data)
GET    /api/transcriptions/:id/audio    // ✨ NEU: Stream MP3 aus DB
GET    /api/transcriptions/:id/download // ✨ NEU: Download als TXT
PUT    /api/transcriptions/:id          // Update
DELETE /api/transcriptions/:id          // Delete
```

### **Users (PostgreSQL)**
```
GET    /api/users                // Liste (Admin only)
GET    /api/users/search?q=tom   // ✨ NEU: Autocomplete (Admin only)
GET    /api/users/:id            // Details (Admin only)
POST   /api/users                // Create (Admin only)
PUT    /api/users/:id            // Update (Admin only)
DELETE /api/users/:id            // Delete (Admin only)
GET    /api/users/:id/transcriptions  // User-Transkriptionen (Admin)
```

---

### 🧪 **Setup-Schritte für PostgreSQL**

1. **PostgreSQL installieren** (Port 5432)
2. **Datenbank erstellen**: `CREATE DATABASE mp3_transcriber;`
3. **`.env` konfigurieren** (siehe oben)
4. **Schema laden**: `psql -U postgres -d mp3_transcriber -f server/db/postgresql-schema.sql`
5. **Default-Users seeden**: `node server/db/seed-pg.js`
6. **Server starten**: `npm run server`

---

### 📝 **Migrations-Optionen**

#### **Option A: Frische Installation (empfohlen)**
```bash
# 1. PostgreSQL installieren
# 2. Datenbank erstellen
# 3. Schema ausführen
# 4. Seed ausführen
# 5. Server-Code umstellen
```

#### **Option B: Daten aus SQLite migrieren**
```bash
# 1. Alles aus Option A
# 2. Migrations-Script ausführen
node server/db/migrate-sqlite-to-pg.js

# 3. Alte SQLite-DB sichern (wird nicht mehr benötigt)
cp transcriber.db transcriber.db.backup
```

---

### ✅ **Checkliste für Deployment**

- [x] PostgreSQL installiert und läuft
- [x] `.env` mit korrekten Credentials
- [x] Schema ausgeführt (`postgresql-schema.sql`)
- [x] Default users geseedet (`seed-pg.js`)
- [x] Server-Code auf `database-pg.js` umgestellt
- [x] Alle Routes auf PostgreSQL-Syntax umgestellt
- [x] Tests durchgeführt (Login, Upload, Transcribe)
- [x] Dokumentation aktualisiert

---

## [1.0.0] - 2026-02-16 (Initial Release)

### **Initial Features**
- 🎵 MP3 Upload und Transkription
- 🎧 Whisper API Integration (RunPod)
- 📊 LLaMA Summarization (RunPod)
- ⏱️ Socket.io für Live-Progress
- 🎨 Moderne UI mit Tailwind CSS
- 🔄 Drag & Drop Upload
- 📝 Timestamp-Navigation
- 🔆 Playback-Highlighting
- ✏️ Inline-Edit-Modus
- 🐧 WSL2 Integration für lokale Verarbeitung
- 📁 Lokale Datei-Unterstützung
- 🔒 JWT Authentication
- 👥 User Management
- 🗄️ SQLite Datenbank

---

## **Geplante Features für v2.1.0**

### **Phase 3: Frontend-Integration**
- [ ] **Admin User-Selector** in `TranscribeScreen.js`:
  - Autocomplete-Feld für User-Auswahl
  - Nur für Admin sichtbar
  - Standard-User: Automatisch eigener User

- [ ] **Download-Button** in `TranscriptView.js`:
  - "📥 Als TXT herunterladen" Button
  - Download via `/api/transcriptions/:id/download`

- [ ] **Audio-Player** aus DB:
  - MP3-Stream aus DB: `/api/transcriptions/:id/audio`

---

## **Bekannte Limitierungen**

1. **Frontend-Integration**: Admin User-Selector und Download-Button noch nicht im Frontend implementiert
2. **Cloudflare Tunnel**: Manuelle Konfiguration erforderlich
3. **WSL2 erforderlich**: Für lokale Verarbeitung
4. **Windows-Pfade**: Hardcodiert für Windows (`D:\...`)

---

**Letzte Aktualisierung**: 2026-02-18  
**Version**: 2.0.0  
**Status**: ✅ Production Ready
