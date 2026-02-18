# 📊 Datenbank-Tools - Übersicht

## 🚀 Schnell-Zugriff

### **Option 1: PowerShell-Alias (Empfohlen)**
```powershell
view-db
```
Zeigt alle Tabellen und deren Inhalt formatiert an.

### **Option 2: Direkter Node-Aufruf**
```powershell
node scripts/view-database.js
```

---

## 🔍 Was wird angezeigt?

Das Script zeigt alle Datenbank-Tabellen mit ihrem Inhalt:

- **`users`** - Alle Benutzer mit ID, Username, Vor-/Nachname, Email, Admin-Status
- **`transcriptions`** - MP3-Transkriptionen mit Dateiname und User-Zuordnung
- **`access_tokens`** - Öffentliche Zugriffs-Tokens für Sharing
- **`audit_logs`** - Sicherheits-Protokoll (Login-Versuche, etc.)

---

## 🖥️ GUI-Tools (Optional)

Falls Sie die Datenbank grafisch bearbeiten möchten:

### **DB Browser for SQLite** (Empfohlen)
- **Download**: https://sqlitebrowser.org/
- **Features**: Grafische Oberfläche, SQL-Editor, Tabellen-Bearbeitung
- **Datenbank-Pfad**: `D:\Projekte\git\mp3-transcriber-app\transcriber.db`

### **SQLite Studio**
- **Download**: https://sqlitestudio.pl/
- **Features**: Portabel, keine Installation nötig

### **DBeaver Community**
- **Download**: https://dbeaver.io/
- **Features**: Universal-Tool für viele Datenbanken

---

## 📝 Wichtige Hinweise

⚠️ **ACHTUNG**: Bearbeiten Sie die Datenbank nur, wenn der Server gestoppt ist!

```powershell
# Server stoppen
stop-server

# Datenbank ansehen/bearbeiten
view-db

# Server wieder starten
start-server
```

---

## 🛠️ Direkte SQL-Abfragen

Falls Sie SQL-Befehle direkt ausführen möchten:

```powershell
# SQLite Command-Line Tool verwenden
cd D:\Projekte\git\mp3-transcriber-app
sqlite3 transcriber.db
```

Nützliche SQL-Befehle:
```sql
-- Alle Tabellen anzeigen
.tables

-- Struktur einer Tabelle zeigen
.schema users

-- Alle Benutzer anzeigen
SELECT * FROM users;

-- Passwort für einen User ändern (gehashed!)
UPDATE users SET password_hash = '<bcrypt-hash>' WHERE username = 'test';

-- Anzahl Transkriptionen pro User
SELECT u.username, COUNT(t.id) as count 
FROM users u 
LEFT JOIN transcriptions t ON u.id = t.user_id 
GROUP BY u.id;

-- Beenden
.quit
```

---

## 🔄 Datenbank zurücksetzen

Falls Sie die Datenbank komplett neu initialisieren möchten:

```powershell
# Server stoppen
stop-server

# Datenbank löschen
Remove-Item transcriber.db*

# Server starten (erstellt neue DB automatisch)
start-server
```

Die Datenbank wird automatisch mit den Standard-Usern gefüllt (siehe `server/db/seed.js`).

---

## 📚 Weitere Informationen

- **Datenbank-Schema**: `server/db/schema.sql`
- **Seed-Script**: `server/db/seed.js`
- **Datenbank-Setup**: `server/db/database.js`
