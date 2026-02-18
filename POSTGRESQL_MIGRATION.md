# 🔄 PostgreSQL Migration Guide

## Übersicht

Dieses Dokument beschreibt die Migration von SQLite zu PostgreSQL für die MP3 Transcriber App.

---

## ⚠️ Wichtige Änderungen

### Warum PostgreSQL?

1. **BYTEA-Support**: Bessere Speicherung von großen Binärdaten (MP3-Dateien)
2. **Concurrent Access**: Mehrere gleichzeitige Schreibzugriffe
3. **JSON-Support**: Native JSONB für audit_logs
4. **Skalierbarkeit**: Vorbereitung für > 10.000 User
5. **Remote Access**: Client-Server-Architektur

### Schema-Änderungen

| Feature | SQLite | PostgreSQL |
|---------|--------|------------|
| **IDs** | TEXT (6 chars) | UUID |
| **Binärdaten** | BLOB | BYTEA |
| **Boolean** | INTEGER (0/1) | BOOLEAN |
| **JSON** | TEXT | JSONB |
| **IP-Adressen** | TEXT | INET |
| **Timestamps** | TEXT (ISO 8601) | TIMESTAMP |

---

## 📋 Voraussetzungen

### 1. PostgreSQL Installation (Windows)

**Download**: https://www.postgresql.org/download/windows/

**Installation**:
```powershell
# Download PostgreSQL 15+ Installer
# Während der Installation:
# - Port: 5432 (Standard)
# - Passwort: Wähle ein sicheres Passwort für 'postgres' User
# - Locale: German_Germany.1252 (oder C für englisch)
```

**Service starten**:
```powershell
# PostgreSQL sollte automatisch als Service starten
# Manueller Start:
net start postgresql-x64-15
```

### 2. Environment Variables

Erstelle eine `.env` Datei im Projekt-Root:

```env
# PostgreSQL Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=dein_sicheres_passwort
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=mp3_transcriber

# Alte SQLite-Konfiguration kann entfernt werden
# DB_PATH=./transcriber.db
```

### 3. npm-Packages installieren

```bash
cd D:\Projekte\git\mp3-transcriber-app
npm install pg
# better-sqlite3 kann deinstalliert werden (optional)
# npm uninstall better-sqlite3
```

---

## 🚀 Migrations-Schritte

### Schritt 1: Datenbank erstellen

```bash
# PowerShell (als Administrator)
psql -U postgres

# Im psql-Prompt:
CREATE DATABASE mp3_transcriber;
\c mp3_transcriber
\q
```

### Schritt 2: Schema erstellen

```bash
cd D:\Projekte\git\mp3-transcriber-app

# Schema ausführen
psql -U postgres -d mp3_transcriber -f server/db/postgresql-schema.sql
```

### Schritt 3: Default Users seeden

```bash
# Seed-Script ausführen
node server/db/seed-pg.js
```

### Schritt 4: Alte Daten migrieren (optional)

Wenn du Daten aus SQLite migrieren möchtest:

```bash
# Migrations-Script ausführen
node server/db/migrate-sqlite-to-pg.js
```

### Schritt 5: Server-Code anpassen

Die Haupt-Datei `server/index.js` muss angepasst werden:

```javascript
// Vorher (SQLite)
const { initDatabase } = require('./db/database');
const db = initDatabase();

// Nachher (PostgreSQL)
const { initDatabase } = require('./db/database-pg');
initDatabase().then(() => {
  console.log('✅ Database ready!');
}).catch(err => {
  console.error('❌ Database init failed:', err);
  process.exit(1);
});
```

### Schritt 6: Alle Queries anpassen

**SQLite** (synchron):
```javascript
const users = db.prepare('SELECT * FROM users').all();
```

**PostgreSQL** (asynchron):
```javascript
const { query } = require('./db/database-pg');
const users = await query('SELECT * FROM users');
```

---

## 🔧 Code-Anpassungen

### Query-Syntax Änderungen

| SQLite | PostgreSQL |
|--------|------------|
| `?` | `$1, $2, $3` |
| `CURRENT_TIMESTAMP` | `CURRENT_TIMESTAMP` (gleich) |
| `INTEGER PRIMARY KEY` | `BIGSERIAL PRIMARY KEY` |
| `TEXT` | `VARCHAR(n)` oder `TEXT` |
| `BLOB` | `BYTEA` |

**Beispiel**:

```javascript
// Vorher (SQLite)
const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

// Nachher (PostgreSQL)
const { queryOne } = require('./db/database-pg');
const user = await queryOne('SELECT * FROM users WHERE id = $1', [userId]);
```

### Transaktionen

**SQLite**:
```javascript
const insert = db.transaction((user) => {
  db.prepare('INSERT INTO users (username) VALUES (?)').run(user.username);
});
insert({ username: 'test' });
```

**PostgreSQL**:
```javascript
const { transaction } = require('./db/database-pg');

await transaction(async (client) => {
  await client.query('INSERT INTO users (username) VALUES ($1)', ['test']);
});
```

---

## ✅ Testen der Migration

### 1. Verbindung testen

```bash
node -e "const { initDatabase } = require('./server/db/database-pg'); initDatabase();"
```

### 2. Users abfragen

```bash
psql -U postgres -d mp3_transcriber -c "SELECT username, is_admin FROM users;"
```

Erwartete Ausgabe:
```
 username | is_admin 
----------+----------
 tom      | t
 micha    | t
 test     | f
```

### 3. Server starten

```bash
npm run server
```

Erwartete Logs:
```
📦 Initializing PostgreSQL database...
✅ Database connection successful!
✅ Database schema already exists.
🚀 Server running on port 5000
```

---

## 🔄 Rollback (Falls nötig)

### Zurück zu SQLite

1. `.env` anpassen:
```env
# PostgreSQL deaktivieren
# POSTGRES_USER=...

# SQLite wieder aktivieren
DB_PATH=./transcriber.db
```

2. `server/index.js` zurück ändern:
```javascript
const { initDatabase } = require('./db/database');  // Alte SQLite-Version
```

3. Server neu starten.

---

## 📊 Performance-Optimierungen (PostgreSQL)

### Connection Pooling

Bereits konfiguriert in `database-pg.js`:
```javascript
max: 20,                      // Max 20 gleichzeitige Verbindungen
idleTimeoutMillis: 30000,     // Idle connections nach 30s schließen
```

### Indexe

Bereits erstellt via `postgresql-schema.sql`:
- `idx_users_username`
- `idx_transcriptions_user_id`
- `idx_audit_logs_created_at`
- etc.

### Vacuum & Analyze

Regelmäßig ausführen (manuell oder via Cron):
```sql
VACUUM ANALYZE users;
VACUUM ANALYZE transcriptions;
VACUUM ANALYZE audit_logs;
```

---

## 🐛 Troubleshooting

### Error: "Connection refused"

**Problem**: PostgreSQL läuft nicht.

**Lösung**:
```powershell
net start postgresql-x64-15
```

### Error: "password authentication failed"

**Problem**: Falsches Passwort in `.env`.

**Lösung**: Passwort in `.env` korrigieren.

### Error: "database does not exist"

**Problem**: Datenbank wurde nicht erstellt.

**Lösung**:
```bash
psql -U postgres -c "CREATE DATABASE mp3_transcriber;"
```

### Error: "column does not exist"

**Problem**: Schema wurde nicht ausgeführt.

**Lösung**:
```bash
psql -U postgres -d mp3_transcriber -f server/db/postgresql-schema.sql
```

---

## 📈 Monitoring

### Aktive Verbindungen anzeigen

```sql
SELECT count(*) FROM pg_stat_activity WHERE datname = 'mp3_transcriber';
```

### Tabellen-Größen anzeigen

```sql
SELECT 
  tablename, 
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Slow Queries loggen

In `postgresql.conf`:
```ini
log_min_duration_statement = 1000  # Log queries > 1s
```

---

## ✅ Checkliste

- [ ] PostgreSQL installiert und läuft
- [ ] `.env` mit korrekten Credentials
- [ ] `npm install pg` ausgeführt
- [ ] Datenbank `mp3_transcriber` erstellt
- [ ] Schema ausgeführt (`postgresql-schema.sql`)
- [ ] Default users geseedet (`seed-pg.js`)
- [ ] Server-Code auf `database-pg.js` umgestellt
- [ ] Alle Queries von synchron auf asynchron umgestellt
- [ ] Server erfolgreich gestartet
- [ ] Login funktioniert
- [ ] Transkriptionen funktionieren

---

## 📚 Weiterführende Ressourcen

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [node-postgres (pg) Documentation](https://node-postgres.com/)
- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [pgAdmin 4](https://www.pgadmin.org/) - GUI für PostgreSQL-Verwaltung

---

**Letzte Aktualisierung**: 2026-02-18
