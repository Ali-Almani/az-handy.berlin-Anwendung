# Deploy – az-handy.berlin

## Wichtig: Client-Build mit echter API

Der Client muss mit `VITE_API_URL` gebaut werden, sonst nutzt er den **Mock API Modus** (Daten gehen bei Refresh verloren).

Das Skript `scripts/prepare-client-env.js` liest `CLIENT_URL` aus `.env` und erstellt `client/.env.production` automatisch.

## Port 5000 belegt (EADDRINUSE)

Wenn der Server nicht startet:

```bash
# Alle Prozesse auf Port 5000 beenden
pm2 stop all
fuser -k 5000/tcp
sleep 3

# Neu starten
cd ~/az-handy.berlin-Anwendung
pm2 start server/index.js --name az-handy
pm2 save
```

## Nach git pull: Neu bauen

```bash
cd ~/az-handy.berlin-Anwendung
git pull
npm run deploy:prepare
pm2 restart az-handy
```
