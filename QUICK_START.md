# 🚀 Quick Start Guide

## Server starten

Der Server benötigt MongoDB. Hier sind die Optionen:

### Option 1: Lokales MongoDB (empfohlen für Entwicklung)

1. **MongoDB installieren** (falls noch nicht installiert):
   - Download: https://www.mongodb.com/try/download/community
   - Oder mit Chocolatey: `choco install mongodb`

2. **MongoDB starten**:
   ```powershell
   # Als Windows Service (wenn installiert):
   net start MongoDB
   
   # Oder manuell:
   mongod --dbpath "C:\data\db"
   ```

3. **Server starten**:
   ```powershell
   cd server
   npm run dev
   ```

### Option 2: MongoDB Atlas (Cloud - keine lokale Installation)

1. **Kostenloses Konto erstellen**: https://www.mongodb.com/cloud/atlas

2. **Cluster erstellen** und Connection String kopieren

3. **`.env` Datei aktualisieren**:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/az-handy-berlin
   ```

4. **Server starten**:
   ```powershell
   cd server
   npm run dev
   ```

### Option 3: Mit dem PowerShell-Skript (prüft MongoDB automatisch)

```powershell
cd server
npm run dev:ps1
```

Das Skript prüft automatisch, ob MongoDB läuft und gibt hilfreiche Hinweise.

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
- ✅ Prüfen Sie, ob MongoDB läuft (Port 27017)
- ✅ Prüfen Sie die `.env` Datei

### "MongoDB connection error"
- ✅ Stellen Sie sicher, dass MongoDB läuft
- ✅ Prüfen Sie die `MONGODB_URI` in der `.env` Datei
- ✅ Bei Atlas: Prüfen Sie die IP-Whitelist

### Server startet nicht
- ✅ Prüfen Sie, ob Port 5000 frei ist: `netstat -ano | findstr :5000`
- ✅ Prüfen Sie die Node.js Version: `node --version` (sollte v18+ sein)
