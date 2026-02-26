# 🚀 Server starten - Schnellanleitung

## Option 1: Mit PowerShell-Skript (Einfachste Methode)

```powershell
cd server
.\start.ps1
```

## Option 2: Mit npm

```powershell
cd server
npm run dev
```

## Option 3: Direkt mit Node

```powershell
cd server
node index.js
```

## ✅ Nach dem Start:

Der Server läuft auf: **http://localhost:5000**

### Admin-Login:
- **Email**: `admin@az-handy.berlin`
- **Password**: `Admin123!`

## 🔍 Server testen:

Öffnen Sie im Browser: http://localhost:5000/api/health

Sie sollten sehen:
```json
{
  "status": "OK",
  "message": "az-handy.berlin API is running",
  "timestamp": "..."
}
```

## ⚠️ Wenn der Server nicht startet:

1. **Port 5000 bereits belegt?**
   ```powershell
   netstat -ano | findstr :5000
   ```

2. **Node.js installiert?**
   ```powershell
   node --version
   ```
   Sollte v18 oder höher sein.

3. **Dependencies installiert?**
   ```powershell
   cd server
   npm install
   ```

4. **Logs prüfen:**
   Der Server zeigt Fehlermeldungen direkt in der Konsole.

## 💡 Tipp:

Der Server läuft jetzt **OHNE MongoDB** (In-Memory Modus)!
- Daten gehen beim Neustart verloren
- Perfekt für Tests und Entwicklung
- Admin-Benutzer wird automatisch erstellt

---

**Viel Erfolg! 🎉**
