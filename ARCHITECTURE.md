# 🏗️ Architektur-Dokumentation MP3 Transcriber App v2.1.0

**Datum**: 2026-02-19  
**Version**: 2.1.0  
**Status**: Production

---

## 📋 Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [Systemarchitektur](#systemarchitektur)
3. [Technologie-Stack](#technologie-stack)
4. [Datenbank-Design](#datenbank-design)
5. [Authentifizierung & Sicherheit](#authentifizierung--sicherheit)
6. [Komponenten-Details](#komponenten-details)
7. [Datenfluss](#datenfluss)
8. [API-Dokumentation](#api-dokumentation)
9. [State Management](#state-management)
10. [Performance-Optimierungen](#performance-optimierungen)
11. [Migration & Skalierung](#migration--skalierung)

---

## 🎯 Übersicht

Die MP3 Transcriber App ist eine moderne Full-Stack-Webapp zur Transkription und Zusammenfassung von MP3-Dateien. Sie verwendet RunPod-gehostete ML-Modelle (Whisper für Transkription, Llama für Zusammenfassung) und bietet ein umfassendes User-Management-System mit Admin-Panel.

### Hauptfunktionen

- 🎙️ **MP3-Transkription** mit Whisper Large V3
- 📝 **KI-Zusammenfassung** mit Llama 3.1
- 👥 **Multi-User-System** mit Role-Based Access Control
- 🔐 **Sichere Authentifizierung** mit JWT
- 💾 **PostgreSQL-Datenbank** für persistente Speicherung
- 🌐 **Public Sharing** via sichere Links
- ⚡ **Real-time Updates** via WebSocket

---

## 🏗️ Systemarchitektur

### High-Level Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (React SPA)                       │
│  ┌────────────────────────────────────────────────────┐    │
│  │  React Router v7                                    │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐        │    │
│  │  │  Login   │  │Dashboard │  │Transcribe│        │    │
│  │  └──────────┘  └──────────┘  └──────────┘        │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐        │    │
│  │  │  Admin   │  │  Public  │  │  Audio   │        │    │
│  │  │  Panel   │  │  Access  │  │  Player  │        │    │
│  │  └──────────┘  └──────────┘  └──────────┘        │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  Socket.io Client  ←──→  Axios (HTTP)                      │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ HTTPS / WSS
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Express Server (Node.js)                        │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Middleware Layer                                   │    │
│  │  ├─ JWT Auth                                        │    │
│  │  ├─ CORS                                            │    │
│  │  ├─ Rate Limiting                                   │    │
│  │  ├─ Multer (File Upload)                            │    │
│  │  └─ Error Handler                                   │    │
│  └────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Routes                                             │    │
│  │  ├─ /api/auth          (Login, Logout)             │    │
│  │  ├─ /api/users         (CRUD)                       │    │
│  │  ├─ /api/transcriptions (CRUD)                      │    │
│  │  ├─ /api/transcribe    (Whisper API)                │    │
│  │  ├─ /api/summarize     (Llama API)                  │    │
│  │  └─ /api/public        (Public Access)              │    │
│  └────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Socket.io Server                                   │    │
│  │  └─ Real-time Progress Updates                      │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ SQL Queries
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL Database                        │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Tables:                                            │    │
│  │  ├─ users                                           │    │
│  │  ├─ transcriptions (mit mp3_data BYTEA)            │    │
│  │  ├─ access_tokens                                   │    │
│  │  └─ audit_logs                                      │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ HTTPS API Calls
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                        RunPod APIs                           │
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
│   │   ├── index.html
│   │   └── manifest.json
│   │
│   └── src/
│       ├── components/
│       │   ├── auth/
│       │   │   ├── LoginScreen.js
│       │   │   └── ProtectedRoute.js
│       │   ├── admin/
│       │   │   └── UserManagement.js
│       │   ├── public/
│       │   │   ├── PublicLandingPage.js
│       │   │   ├── PublicMp3View.js
│       │   │   └── UserMp3ListView.js
│       │   ├── AudioPlayer.js
│       │   ├── ControlPanel.js
│       │   ├── Dashboard.js
│       │   ├── DropZone.js
│       │   ├── TranscribeScreen.js
│       │   └── TranscriptView.js
│       │
│       ├── context/
│       │   └── AuthContext.js
│       │
│       ├── services/
│       │   ├── api.js
│       │   ├── apiClient.js
│       │   ├── authService.js
│       │   ├── userService.js
│       │   └── publicAccessService.js
│       │
│       ├── utils/
│       │   └── helpers.js
│       │
│       ├── App.js
│       ├── index.js
│       └── index.css
│
├── server/                          # Node.js Backend
│   ├── db/
│   │   ├── database.js              # PostgreSQL Connection
│   │   ├── schema.sql               # DB Schema
│   │   └── seed.js                  # Initial Data
│   │
│   ├── middleware/
│   │   ├── auth.js                  # JWT Verification
│   │   └── rateLimiter.js           # Rate Limiting
│   │
│   ├── routes/
│   │   ├── auth.js                  # Login/Logout
│   │   ├── users.js                 # User CRUD
│   │   ├── transcriptions.js        # Transcription CRUD
│   │   ├── transcribe.js            # Whisper API
│   │   ├── summarize.js             # Llama API
│   │   ├── public.js                # Public Access
│   │   └── upload.js                # File Upload
│   │
│   ├── utils/
│   │   ├── tokenGenerator.js        # ID Generation
│   │   ├── logger.js                # Logging
│   │   └── validation.js            # Input Validation
│   │
│   └── index.js                     # Server Entry Point
│
├── .env                             # Environment Variables
├── package.json
└── README.md
```

---

## 💻 Technologie-Stack

### Frontend
- **React** 18.2 - UI Framework
- **React Router** v7 - Client-Side Routing
- **Tailwind CSS** 3.x - Styling
- **Monaco Editor** - Code-Editor für Transkriptionen
- **Socket.io-client** - WebSocket-Client
- **Axios** - HTTP-Client
- **react-dropzone** - File Upload

### Backend
- **Node.js** 18+ - Runtime
- **Express** 4.x - Web Framework
- **PostgreSQL** 15+ - Primary Database
- **Socket.io** - WebSocket-Server
- **JWT** - Authentication
- **bcrypt** - Password Hashing
- **Multer** - File Upload Middleware

### External Services
- **RunPod** - ML Model Hosting
  - Whisper Large V3 (Transkription)
  - Llama 3.1 8B (Zusammenfassung)

---

## 💾 Datenbank-Design

### Migrations-Strategie

Die App verwendet nun **PostgreSQL** statt SQLite für bessere Skalierbarkeit und Unterstützung großer BLOB-Daten (MP3-Dateien).

### Schema

#### Tabelle: `users`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  email VARCHAR(255) UNIQUE,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
```

#### Tabelle: `transcriptions`
```sql
CREATE TABLE transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mp3_filename VARCHAR(255) NOT NULL,
  mp3_data BYTEA,                    -- MP3-Datei als Binary Data
  mp3_size_bytes BIGINT,             -- Dateigröße in Bytes
  transcription_text TEXT,
  has_summary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transcriptions_user_id ON transcriptions(user_id);
CREATE INDEX idx_transcriptions_created_at ON transcriptions(created_at DESC);
```

#### Tabelle: `access_tokens`
```sql
CREATE TABLE access_tokens (
  token VARCHAR(21) PRIMARY KEY,     -- nanoid
  transcription_id UUID NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
  expires_at TIMESTAMP,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_access_tokens_transcription_id ON access_tokens(transcription_id);
```

#### Tabelle: `audit_logs`
```sql
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES users(id),
  ip_address VARCHAR(45),
  user_agent TEXT,
  details JSONB,
  success BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

### Warum PostgreSQL?

| Feature | SQLite | PostgreSQL |
|---------|--------|------------|
| **BLOB-Speicherung** | Max 1 GB | Praktisch unbegrenzt (bis 1 GB pro BYTEA-Feld) |
| **Concurrent Writes** | Begrenzt | Exzellent |
| **JSON Support** | Eingeschränkt | Native JSONB mit Indexing |
| **Full-Text Search** | FTS5 Extension | Native mit tsvector |
| **Skalierbarkeit** | Single-File | Horizontal & Vertical |
| **Remote Access** | Nein | Ja |
| **Replication** | Nein | Native Streaming Replication |

---

## 🔐 Authentifizierung & Sicherheit

### JWT-basierte Authentifizierung

```javascript
// Login Flow
POST /api/auth/login
{
  "username": "tom",
  "password": "MT9#Detomaso"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "tom",
    "is_admin": true
  }
}
```

### Token-Speicherung
- **httpOnly Cookie** (verhindert XSS-Angriffe)
- **SameSite: Strict** (CSRF-Schutz)
- **Secure Flag** (nur HTTPS in Production)
- **24h Gültigkeit**

### Sichere ID-Generierung

1. **User-IDs**: UUID v4 (kryptographisch sicher)
2. **Access-Tokens**: nanoid (21 Zeichen, URL-safe)

```javascript
const crypto = require('crypto');
const { nanoid } = require('nanoid');

// User-ID
const userId = crypto.randomUUID();
// → '550e8400-e29b-41d4-a716-446655440000'

// Access-Token
const accessToken = nanoid();
// → 'V1StGXR8_Z5jdHi6B-myT'
```

### Rate Limiting

```javascript
// Login: 5 Versuche pro 15 Minuten
// API: 100 Requests pro 15 Minuten
// Public Access: 10 Requests pro Minute
```

### Password-Hashing

```javascript
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 12;

// Hash
const hash = await bcrypt.hash(password, SALT_ROUNDS);

// Verify
const isValid = await bcrypt.compare(password, hash);
```

---

## 🧩 Komponenten-Details

### Frontend-Komponenten

#### 1. **AuthContext** (Context API)

Zentrale Authentifizierungs-State-Verwaltung:

```javascript
{
  user: Object | null,     // Current user
  isAuthenticated: Boolean,
  isAdmin: Boolean,
  login: Function,
  logout: Function,
  loading: Boolean
}
```

#### 2. **ProtectedRoute**

Schützt Routen vor unauthentifiziertem Zugriff:

```javascript
<ProtectedRoute requireAdmin={true}>
  <AdminPanel />
</ProtectedRoute>
```

#### 3. **TranscribeScreen**

Hauptkomponente für MP3-Transkription:

**Features:**
- MP3-Upload via Drag & Drop
- Audio-Player mit Timestamp-Navigation
- Real-time Transkription mit Progress
- Edit-Modus mit Monaco Editor
- Download-Funktion für Transkripte
- **NEU**: Admin kann User auswählen (Autocomplete)
- **NEU**: Standard-User automatisch zugeordnet

**Props:**
```javascript
{
  mode: 'create' | 'edit',
  transcriptionId: String (optional)
}
```

#### 4. **UserManagement** (Admin only)

CRUD für User-Verwaltung:
- User-Liste mit Suche/Filter
- Inline-Editing
- User anlegen/löschen
- MP3-Transkriptionen pro User anzeigen

#### 5. **PublicMp3View**

Public-Access-View ohne Login:
- Read-only Darstellung
- Passwortschutz (First Name)
- Keine Edit-Buttons
- Audio-Player funktional

### Backend-Routes

#### Auth Routes (`/api/auth`)

```javascript
POST   /api/auth/login     // Login
POST   /api/auth/logout    // Logout
GET    /api/auth/me        // Current User
```

#### User Routes (`/api/users`)

```javascript
GET    /api/users          // List all (Admin only)
GET    /api/users/:id      // Get one
POST   /api/users          // Create (Admin only)
PUT    /api/users/:id      // Update
DELETE /api/users/:id      // Delete (Admin only)
GET    /api/users/search?q=tom  // Search (Admin only)
```

#### Transcription Routes (`/api/transcriptions`)

```javascript
GET    /api/transcriptions         // List (current user or admin)
GET    /api/transcriptions/:id     // Get one
POST   /api/transcriptions         // Create
PUT    /api/transcriptions/:id     // Update
DELETE /api/transcriptions/:id     // Delete
GET    /api/transcriptions/:id/download  // Download as .txt
```

#### Processing Routes

```javascript
POST   /api/transcribe             // Whisper API
POST   /api/summarize              // Llama API
```

#### Public Access Routes

```javascript
GET    /api/public/:userId         // List MP3s for user
GET    /api/public/:userId/:mp3Id  // Get specific MP3
POST   /api/public/:userId/verify  // Verify password
```

---

## 📊 Datenfluss

### Neuer Transkriptions-Workflow

```
1. User: Upload MP3
   ├─> TranscribeScreen.handleFileUpload()
   └─> POST /api/transcriptions/upload
       ├─> Multer: Save to memory
       ├─> Read Buffer
       └─> Return { filename, buffer }

2. User: Click "Transcribe MP3"
   ├─> Admin: Select target user (Autocomplete)
   │   └─> GET /api/users/search?q=<input>
   ├─> POST /api/transcribe
   │   ├─> Read mp3_data from buffer
       │   ├─> Base64-Encode
   │   ├─> Socket: emit('transcribe:progress')
       │   ├─> RunPod Whisper API Call
   │   ├─> Parse & Format Response
   │   └─> Socket: emit('transcribe:complete')
   └─> POST /api/transcriptions
       ├─> INSERT INTO transcriptions (user_id, mp3_data, transcription_text)
       └─> Return transcription ID

3. User: Click "Download Transcription"
   └─> GET /api/transcriptions/:id/download
       ├─> Fetch transcription_text
       ├─> Set Content-Disposition: attachment
       └─> Stream as .txt file
```

### Public Access Workflow

```
1. User: Navigate to /public/:userId
   └─> PublicLandingPage
       ├─> Prompt for password (first name)
       └─> POST /api/public/:userId/verify
           ├─> Compare with user.first_name
           └─> Return list of MP3s (if valid)

2. User: Click on MP3
   └─> /public/:userId/:mp3Id
       ├─> Fetch transcription (ohne mp3_data)
       ├─> Display in PublicMp3View
       └─> Audio-Player streams from /api/transcriptions/:id/audio
```

---

## 🚀 API-Integration

### RunPod Whisper API

**Endpoint**: `https://api.runpod.ai/v2/{WHISPER_ENDPOINT}`

**Request**:
```json
{
  "input": {
    "audio": "base64-encoded-mp3",
    "model": "openai/whisper-large-v3",
    "language": "de",
    "beam_size": 7,
    "vad_filter": true,
    "condition_on_previous_text": false,
    "initial_prompt": "Dies ist eine klare, natürliche deutsche Sprache"
  }
}
```

**Response**:
```json
{
  "output": {
    "segments": [
      {
        "start": 0.5,
        "end": 3.2,
        "text": "Hallo, das ist ein Test."
      }
    ],
    "duration": 180.5
  }
}
```

### RunPod Llama API

**Endpoint**: `https://api.runpod.ai/v2/{LLAMA_ENDPOINT}`

**Request**:
```json
{
  "input": {
    "prompt": "System: Du bist ein präziser Zusammenfasser.\n\nUser: Fasse zusammen: [Text]",
    "model": "avans06/Meta-Llama-3.1-8B-Instruct-ct2-int8_float16",
    "max_length": 60,
    "temperature": 0.0,
    "repetition_penalty": 1.5
  }
}
```

---

## 📈 State Management

### Frontend State

**AuthContext** (Global):
```javascript
{
  user: { id, username, is_admin },
  isAuthenticated: Boolean,
  login: Function,
  logout: Function
}
```

**TranscribeScreen** (Local):
```javascript
{
  audioFile: File,
  audioUrl: String,
  transcription: String,
  isProcessing: Boolean,
  selectedUserId: String (Admin only),
  progress: { step, message }
}
```

---

## ⚡ Performance-Optimierungen

### Frontend
1. **Code-Splitting**: React.lazy() für Monaco Editor
2. **Memoization**: useMemo für große Transkriptionen
3. **Virtual Scrolling**: Für lange MP3-Listen
4. **WebSocket**: Real-time statt Polling

### Backend
1. **Connection Pooling**: PostgreSQL Connection Pool
2. **Streaming**: Audio-Daten streamen statt laden
3. **Caching**: Redis für häufig abgerufene Transkriptionen (Future)
4. **Compression**: GZIP für API-Responses

### Datenbank
1. **Indexes**: Optimiert für häufige Queries
2. **VACUUM**: Regelmäßige DB-Wartung
3. **Partitioning**: Nach Erstellungsdatum (bei > 1M Einträgen)

---

## 🔄 Migration & Skalierung

### SQLite → PostgreSQL Migration

**Warum?**
- MP3-Dateien in DB speichern (BYTEA statt BLOB)
- Bessere Concurrent Access
- Native JSON-Support (audit_logs)
- Vorbereitung für Multi-Server-Setup

**Migrations-Script**:
```bash
# Export aus SQLite
sqlite3 transcriber.db ".dump" > backup.sql

# Import in PostgreSQL (nach Schema-Anpassung)
psql -U postgres -d mp3_transcriber -f schema.sql
psql -U postgres -d mp3_transcriber -f backup_converted.sql
```

### Skalierungs-Strategie

**Wenn > 10.000 User oder > 1 Million Transkriptionen:**

1. **Object Storage** (S3/MinIO):
   - MP3s aus DB in S3 auslagern
   - `mp3_data` → `mp3_s3_url`

2. **Caching-Layer** (Redis):
   - Session-Storage
   - Häufig abgerufene Transkriptionen

3. **Load Balancing**:
   - Nginx vor Express
   - Horizontal Scaling mit Docker/Kubernetes

4. **Database Replication**:
   - Read Replicas für Queries
   - Master-Slave Setup

---

## 📊 Neue Features (v2.0.0)

### 1. Admin-User-Auswahl bei Transkription

**UI-Flow**:
```
[MP3 hochgeladen]
  ↓
[Transcribe-Button]
  ↓
[Admin?]
  ├─ Ja → [Dropdown: "User auswählen"] (mit Autocomplete)
  │        └─> API: GET /api/users/search?q=<input>
  └─ Nein → [Automatisch: current user]
  ↓
[Transkription wird gespeichert unter gewähltem User]
```

**Implementation**:
- React Component: `UserSelector` (Autocomplete)
- Backend Route: `/api/users/search` (LIKE-Query)

### 2. Download-Funktion für Transkriptionen

**Endpoint**: `GET /api/transcriptions/:id/download`

**Response Headers**:
```http
Content-Type: text/plain; charset=utf-8
Content-Disposition: attachment; filename="transcription-2026-02-18.txt"
```

### 3. Button-Position Optimierung

**Vorher**: Buttons rechts am Bildschirmrand (fest positioniert)

**Nachher**: Buttons rechts neben der Transkription (innerhalb des Containers)

```css
.transcript-container {
  display: flex;
  gap: 1rem;
}

.transcript-text {
  flex: 1;
}

.edit-buttons {
  flex-shrink: 0;
  align-self: flex-start;
  position: sticky;
  top: 1rem;
}
```

---

## ✅ Sicherheits-Checkliste

- [x] Passwords mit bcrypt (cost: 12)
- [x] JWT in httpOnly Cookies
- [x] Rate Limiting implementiert
- [x] SQL-Injection-Prevention (Prepared Statements)
- [x] XSS-Protection (React escapet automatisch)
- [x] CORS korrekt konfiguriert
- [x] Audit-Logging für alle kritischen Aktionen
- [x] Input-Validation auf allen Routen
- [x] HTTPS in Production (via Cloudflare Tunnel)

---

## 🎯 Zusammenfassung

Die MP3 Transcriber App v2.0.0 bietet:

✅ **Skalierbare Architektur** mit PostgreSQL  
✅ **Sichere Authentifizierung** mit JWT & bcrypt  
✅ **Multi-User-System** mit Role-Based Access  
✅ **Public Sharing** via sichere Links  
✅ **MP3-Dateien in DB** (keine Filesystem-Abhängigkeit)  
✅ **Admin-Panel** mit User-Management  
✅ **Real-time Updates** via WebSocket  
✅ **Performance-Optimiert** mit Indexing & Connection Pooling  

Die Architektur ist bereit für zehntausende User und Millionen Transkriptionen.
