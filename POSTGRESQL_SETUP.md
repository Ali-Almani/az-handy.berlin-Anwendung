# PostgreSQL Setup - az-handy.berlin

Das Projekt verwendet jetzt **PostgreSQL** statt MongoDB.

## Voraussetzungen

1. **PostgreSQL installieren** (falls noch nicht vorhanden):
   - Windows: https://www.postgresql.org/download/windows/
   - Oder: `winget install PostgreSQL.PostgreSQL`

2. **Datenbank erstellen**:
   ```sql
   CREATE DATABASE az_handy_berlin;
   ```

## Konfiguration

In `server/.env` eintragen:

```env
DATABASE_URL=postgresql://postgres:DEIN_PASSWORT@localhost:5432/az_handy_berlin
```

Oder einzeln:
```env
PG_USER=postgres
PG_PASSWORD=dein_passwort
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=az_handy_berlin
```

## Server starten

```powershell
cd server
npm run dev
```

Die Tabellen werden automatisch erstellt (Sequelize `sync`).

## Admin-Benutzer erstellen

```powershell
cd server
npm run create-admin
```

## In-Memory Modus (ohne PostgreSQL)

Für schnelle Tests ohne Datenbank:

```env
USE_MEMORY_DB=true
```

Daten gehen beim Neustart verloren – nur für Entwicklung!
