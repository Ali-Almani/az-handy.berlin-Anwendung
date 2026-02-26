# 🚀 Quick Start Guide

## Server starten

Das Projekt verwendet **PostgreSQL** oder **In-Memory** (ohne Datenbank). Hier sind die Optionen:

### Option 1: PostgreSQL (empfohlen für Entwicklung)

1. **PostgreSQL installieren** (falls noch nicht installiert):
   - Download: https://www.postgresql.org/download/windows/
   - Oder mit winget: `winget install PostgreSQL.PostgreSQL`

2. **Datenbank erstellen**:
   ```sql
   CREATE DATABASE az_handy_berlin;
   ```

3. **`.env` Datei konfigurieren** (in `server/.env`):
   ```
   DATABASE_URL=postgresql://postgres:DEIN_PASSWORT@localhost:5432/az_handy_berlin
   ```

4. **Server starten**:
   ```powershell
   cd server
   npm run dev
   ```

Die Tabellen werden automatisch erstellt (Sequelize `sync`).

### Option 2: In-Memory Modus (ohne Datenbank)

Für schnelle Tests ohne PostgreSQL:

1. **`.env` Datei** (in `server/.env`):
   ```
   USE_MEMORY_DB=true
   ```

2. **Server starten**:
   ```powershell
   cd server
   npm run dev
   ```

⚠️ Daten gehen beim Neustart verloren – nur für Entwicklung/Testing!

### Option 3: Mit dem PowerShell-Skript

```powershell
cd server
.\start.ps1
```

## Admin-Benutzer erstellen

Nachdem der Server läuft:

```powershell
cd server
npm run create-admin
```

**Login-Daten**:
- Email: `admin@az-handy.berlin`
- Password: `Admin123!`

## Beide Server starten (Frontend + Backend)

```powershell
# Im Root-Verzeichnis:
npm run dev
```

Dies startet:
- Backend auf `http://localhost:5000`
- Frontend auf `http://localhost:3000`

## Troubleshooting

### "ERR_CONNECTION_REFUSED"
- ✅ Prüfen Sie, ob der Server läuft (Port 5000)
- ✅ Prüfen Sie die `.env` Datei

### "PostgreSQL connection error"
- ✅ Stellen Sie sicher, dass PostgreSQL läuft (Port 5432)
- ✅ Prüfen Sie die `DATABASE_URL` in der `.env` Datei
- ✅ Prüfen Sie, ob die Datenbank `az_handy_berlin` existiert

### Server startet nicht
- ✅ Prüfen Sie, ob Port 5000 frei ist: `netstat -ano | findstr :5000`
- ✅ Prüfen Sie die Node.js Version: `node --version` (sollte v18+ sein)

### Ohne Datenbank testen
- ✅ Setzen Sie `USE_MEMORY_DB=true` in der `.env` Datei
