# 🎉 Server läuft OHNE MongoDB!

Das Projekt verwendet jetzt **PostgreSQL** statt MongoDB.

## ✅ Datenbank-Optionen:

1. **PostgreSQL** – Hauptdatenbank (siehe POSTGRESQL_SETUP.md)
2. **In-Memory** – Für Tests ohne Datenbank

## 🚀 Server starten:

```powershell
cd server
npm run dev
```

### Mit PostgreSQL:
Setze in `server/.env`:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/az_handy_berlin
```

### Ohne Datenbank (In-Memory):
```
USE_MEMORY_DB=true
```

## 🔐 Admin-Login-Daten:

```
Email:    admin@az-handy.berlin
Password: Admin123!
```

Admin erstellen: `npm run create-admin`

## ⚠️ In-Memory Hinweise:

- Daten gehen beim Server-Neustart verloren
- Nur für Entwicklung/Testing!
