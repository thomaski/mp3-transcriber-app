# Permanenter Cloudflare Tunnel Setup
# Subdomain: mp3-transcriber.m4itexpertsgmbh.de

## ✅ Schritt 1: Cloudflare Account + Login

```powershell
# Cloudflare Login (öffnet Browser für Authentifizierung)
cloudflared tunnel login
```

**Was passiert:**
- Browser öffnet sich
- Sie wählen Ihre Domain aus (oder fügen sie hinzu)
- Cloudflare speichert die Berechtigung lokal

---

## ✅ Schritt 2: Named Tunnel erstellen

```powershell
cloudflared tunnel create mp3-transcriber
```

**Ausgabe (Beispiel):**
```
Tunnel credentials written to C:\Users\tom\.cloudflared\12345678-abcd-1234-abcd-123456789abc.json
Created tunnel mp3-transcriber with id 12345678-abcd-1234-abcd-123456789abc
```

**⚠️ WICHTIG:** Notieren Sie die Tunnel-ID!

---

## ✅ Schritt 3: Config-Datei erstellen

**Datei:** `C:\Users\tom\.cloudflared\config.yml`

```yaml
tunnel: mp3-transcriber
credentials-file: C:\Users\tom\.cloudflared\IHRE-TUNNEL-ID.json

ingress:
  - hostname: mp3-transcriber.m4itexpertsgmbh.de
    service: http://localhost:4000
  - service: http_status:404
```

**⚠️ Ersetzen Sie `IHRE-TUNNEL-ID.json` mit der echten Datei aus Schritt 2!**

---

## ✅ Schritt 4: DNS Route erstellen

```powershell
cloudflared tunnel route dns mp3-transcriber mp3-transcriber.m4itexpertsgmbh.de
```

**Was passiert:**
- Cloudflare erstellt automatisch einen CNAME-Eintrag
- Zeigt auf Ihren Tunnel
- **KEINE manuelle IONOS-Konfiguration nötig!**

---

## ✅ Schritt 5: Tunnel testen

```powershell
cloudflared tunnel run mp3-transcriber
```

**Erwartete Ausgabe:**
```
INF Starting tunnel tunnelID=12345678-abcd-1234-abcd-123456789abc
INF Registered tunnel connection connIndex=0
INF Connection registered connIndex=0
```

**Jetzt im Browser testen:**
```
https://mp3-transcriber.m4itexpertsgmbh.de
```

---

## ✅ Schritt 6: Als Windows-Dienst installieren (Optional)

Damit der Tunnel automatisch beim Windows-Start läuft:

```powershell
# Als Dienst installieren
cloudflared service install

# Dienst starten
Start-Service cloudflared

# Dienst-Status prüfen
Get-Service cloudflared
```

---

## 🎉 FERTIG!

**Ihre permanente URL:**
```
https://mp3-transcriber.m4itexpertsgmbh.de
```

**Diese URL:**
- ✅ Ändert sich NIEMALS
- ✅ Funktioniert weltweit
- ✅ Hat gültiges SSL-Zertifikat (HTTPS)
- ✅ Beeinflusst Ihre Haupt-Domain NICHT

---

## 📋 Troubleshooting

### Problem: "Domain not found"
**Lösung:** Sie müssen die Domain m4itexpertsgmbh.de erst zu Cloudflare hinzufügen.

**Schritt 1:** https://dash.cloudflare.com → "Add a Site"  
**Schritt 2:** `m4itexpertsgmbh.de` eingeben  
**Schritt 3:** Free Plan wählen  
**Schritt 4:** Cloudflare Nameserver bei IONOS eintragen:
- `aron.ns.cloudflare.com`
- `maya.ns.cloudflare.com`

### Problem: Tunnel startet nicht
**Lösung:** Prüfen Sie, ob Port 4000 frei ist:
```powershell
Get-NetTCPConnection -LocalPort 4000
```

### Problem: "Connection refused"
**Lösung:** Stellen Sie sicher, dass die App auf Port 4000 läuft:
```powershell
# Im mp3-transcriber-app Verzeichnis:
npm run dev:all
```

---

**Version:** 1.0.0  
**Letzte Aktualisierung:** 2026-02-19
