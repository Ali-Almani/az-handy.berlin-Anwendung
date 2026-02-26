# 🚀 Installation und Start - Schritt für Schritt

## Problem: "Cannot find package 'express'"

Dieser Fehler bedeutet, dass die npm-Pakete noch nicht installiert sind.

## ✅ Lösung:

### Schritt 1: Dependencies installieren

```powershell
cd Z:\server
npm install
```

Dies kann einige Minuten dauern. Warten Sie, bis die Installation abgeschlossen ist.

### Schritt 2: Server starten

Nach erfolgreicher Installation:

```powershell
npm run dev
```

ODER:

```powershell
node index.js
```

## ✅ Was Sie sehen sollten:

Wenn alles funktioniert:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 IN-MEMORY MODE (No MongoDB required)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Using in-memory database for testing
✅ Default admin user created (In-Memory Mode)
   Email: admin@az-handy.berlin
   Password: Admin123!
🚀 Server running on port 5000
🌐 API available at: http://localhost:5000/api
💚 Health check: http://localhost:5000/api/health
```

## 🔍 Troubleshooting:

### Wenn `npm install` fehlschlägt:

1. **Prüfen Sie die Internetverbindung**
2. **Löschen Sie `node_modules` und `package-lock.json`:**
   ```powershell
   Remove-Item -Recurse -Force node_modules
   Remove-Item package-lock.json
   npm install
   ```

3. **Prüfen Sie die Node.js Version:**
   ```powershell
   node --version
   ```
   Sollte v18 oder höher sein.

### Wenn der Server nicht startet:

1. **Prüfen Sie, ob Port 5000 frei ist:**
   ```powershell
   netstat -ano | findstr :5000
   ```

2. **Prüfen Sie die `.env` Datei:**
   ```powershell
   Get-Content .env
   ```
   Sollte `USE_MEMORY_DB=true` enthalten.

## 📝 Vollständige Befehlsfolge:

```powershell
# 1. Zum Server-Verzeichnis wechseln
cd Z:\server

# 2. Pakete installieren (nur beim ersten Mal oder nach Änderungen)
npm install

# 3. Server starten
npm run dev
```

## 🎯 Nach erfolgreichem Start:

- Server läuft auf: **http://localhost:5000**
- Health Check: **http://localhost:5000/api/health**
- Login mit:
  - Email: `admin@az-handy.berlin`
  - Password: `Admin123!`

---

**Viel Erfolg! 🎉**
