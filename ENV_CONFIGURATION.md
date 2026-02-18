# Environment-Konfiguration

## Übersicht

Die MP3 Transcriber App unterstützt verschiedene Umgebungen (Development/Production) über Environment-Variablen.

## Backend (Server)

**Konfigurationsdatei:** .env (im Projekt-Root)

**Wichtige Variablen:**
- ```env
NODE_ENV=production          # Umgebung: development oder production
PORT=5000                    # Server-Port
CLIENT_URL=http://localhost:5000  # Frontend-URL für CORS
POSTGRES_*                   # PostgreSQL-Verbindungsdetails
CLOUDFLARE_TUNNEL_ENABLED=true    # Cloudflare Tunnel aktivieren/deaktivieren
```

## Frontend (Client)

Die React-App verwendet umgebungsabhängige Konfigurationsdateien:

### Development-Modus

**Konfigurationsdatei:** `client/.env.development`

Wird automatisch verwendet wenn:
- `npm start` ausgeführt wird (Dev-Server)
- `NODE_ENV` nicht gesetzt ist

**Features:**
- Demo-Zugangsdaten werden im Login-Screen angezeigt
- Placeholder-Texte in Eingabefeldern
- `REACT_APP_SHOW_DEMO_CREDENTIALS=true`

### Production-Modus

**Konfigurationsdatei:** `client/.env.production`

Wird automatisch verwendet wenn:
- `npm run build` ausgeführt wird
- `NODE_ENV=production` gesetzt ist

**Features:**
- Keine Demo-Zugangsdaten im Login-Screen
- Keine Placeholder-Texte (Sicherheit)
- `REACT_APP_SHOW_DEMO_CREDENTIALS=false`

## Umgebung wechseln

### Development starten (Dev-Server)

```bash
# Im client-Verzeichnis
cd client
npm start
```

- Verwendet `.env.development`
- Hot-Reload aktiviert
- Demo-Credentials sichtbar

### Production-Build erstellen

```bash
# Im client-Verzeichnis
cd client
npm run build
```

- Verwendet `.env.production`
- Optimierte Build-Dateien in `client/build/`
- Keine Demo-Credentials

### Production-Server starten

```bash
# Im Projekt-Root
npm run server
```

- Serviert das Production-Build aus `server/public/`
- Backend läuft auf Port 5000
- Verwendet `.env` (Backend-Konfiguration)

## Deployment-Workflow

### Development/Testing

1. Backend starten: `npm run server`
2. Frontend Dev-Server starten: `cd client && npm start`
3. Development-Features sind aktiv

### Production-Deployment

1. Frontend bauen:
   ```bash
   cd client
   npm run build
   ```

2. Build deployen:
   ```bash
   cd ..
   Remove-Item -Recurse -Force server/public
   Copy-Item -Recurse client/build server/public
   ```

3. Server starten:
   ```bash
   npm run server
   ```

4. Production-Features sind aktiv (keine Demo-Credentials)

## Sicherheitshinweise

### ⚠️ WICHTIG: In Production

- **Niemals** `.env.development` verwenden
- **Niemals** `REACT_APP_SHOW_DEMO_CREDENTIALS=true` in Production
- **Immer** Production-Build mit `npm run build` erstellen
- **Immer** Backend `.env` mit starken Passwörtern schützen

### Empfohlene Einstellungen

**Development (.env.development):**
- Demo-Credentials: ✅ Erlaubt
- Placeholders: ✅ Erlaubt
- Debugging: ✅ Aktiviert

**Production (.env.production):**
- Demo-Credentials: ❌ Deaktiviert
- Placeholders: ❌ Entfernt
- Debugging: ❌ Minimal

## Aktuelle Konfiguration prüfen

**Backend:**
```bash
node -e "console.log('NODE_ENV:', process.env.NODE_ENV || 'development')"
```

**Frontend (während Build):**
```bash
# Development
npm start        # Zeigt REACT_APP_SHOW_DEMO_CREDENTIALS in Console

# Production
npm run build    # Verwendet .env.production
```

## Login-Screen Verhalten

| Umgebung | Username Placeholder | Passwort Placeholder | Demo-Credentials |
|----------|---------------------|---------------------|------------------|
| Development | "tom" | "••••••••" | ✅ Angezeigt |
| Production | (leer) | (leer) | ❌ Versteckt |

