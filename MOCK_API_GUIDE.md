# 🎭 Mock API - Frontend ohne Backend-Server

## ✅ Was wurde erstellt:

Eine **vollständige Mock-API**, die im Browser läuft und alle API-Aufrufe simuliert - **ohne Backend-Server**!

## 🚀 So verwenden Sie es:

### Option 1: Mock-Modus aktivieren (Empfohlen)

Die `.env` Datei im `client` Verzeichnis ist bereits konfiguriert mit:
```
VITE_USE_MOCK_API=true
```

### Option 2: Manuell aktivieren

Erstellen Sie eine `.env` Datei im `client` Verzeichnis:

```env
VITE_USE_MOCK_API=true
```

ODER:

```env
VITE_API_URL=mock
```

## 📝 Test-Login-Daten:

Die Mock-API enthält bereits Test-Benutzer:

### Admin-Benutzer:
```
Email:    admin@az-handy.berlin
Password: Admin123!
Role:     admin
```

### Test-Benutzer:
```
Email:    test@example.com
Password: test123
Role:     user
```

## 🎯 Funktionen die funktionieren:

✅ **Login** - Anmeldung mit Test-Daten  
✅ **Registrierung** - Neue Benutzer erstellen  
✅ **Profil anzeigen** - Benutzerprofil laden  
✅ **Profil aktualisieren** - Profil bearbeiten  
✅ **Authentifizierung** - Token-basierte Auth  
✅ **Protected Routes** - Geschützte Routen  

## 🖥️ Frontend starten:

```powershell
cd client
npm start
```

ODER:

```powershell
cd client
npm run dev
```

Der Frontend-Server läuft dann auf: **http://localhost:3000**

## 🔄 Zurück zur echten API wechseln:

1. In `client/.env` ändern:
   ```env
   VITE_USE_MOCK_API=false
   VITE_API_URL=http://localhost:5000/api
   ```

2. Backend-Server starten

3. Frontend neu starten

## 💡 Vorteile:

- ✅ **Kein Backend-Server nötig** - Frontend läuft komplett eigenständig
- ✅ **Schnelles Testen** - Keine Server-Konfiguration erforderlich
- ✅ **Offline-Entwicklung** - Funktioniert ohne Internet
- ✅ **Einfaches Debugging** - Alle Daten im Browser
- ✅ **Keine Datenbank** - Alles im Speicher

## ⚠️ Wichtige Hinweise:

- **Daten gehen verloren** beim Seiten-Reload (nur im Browser-Speicher)
- **Nur für Entwicklung/Testing** - nicht für Produktion!
- **Mock-Daten** werden bei jedem Reload zurückgesetzt
- **Token** werden im localStorage gespeichert

## 🎨 Was passiert im Mock-Modus:

1. Alle API-Aufrufe werden abgefangen
2. Mock-API simuliert Server-Antworten
3. Daten werden im Browser-Speicher gehalten
4. Verzögerungen werden simuliert (wie bei echter API)

## 📊 Mock-Datenstruktur:

Die Mock-API speichert Benutzer im Browser-Speicher:
- Login-Daten werden validiert
- Neue Benutzer können registriert werden
- Profile können aktualisiert werden
- Token werden generiert und gespeichert

---

**Viel Spaß beim Entwickeln ohne Backend-Server! 🎉**
