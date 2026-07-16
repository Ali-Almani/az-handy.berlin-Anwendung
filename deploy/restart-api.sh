#!/bin/bash
# API hängt / 502 Bad Gateway → Diagnose und Neustart
# Auf dem Server: cd ~/az-handy.berlin-Anwendung && bash deploy/restart-api.sh

set -e
PM2_NAME="${PM2_NAME:-az-api}"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Diagnose az-api (502 / Login nicht erreichbar)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "▶ PM2 Status:"
pm2 status "$PM2_NAME" 2>/dev/null || pm2 status || true
echo ""

echo "▶ Port 5000:"
if command -v ss >/dev/null 2>&1; then
  ss -ltnp 2>/dev/null | grep ':5000' || echo "   ❌ Nichts lauscht auf Port 5000"
else
  netstat -ltnp 2>/dev/null | grep ':5000' || echo "   ❌ Nichts lauscht auf Port 5000"
fi
echo ""

echo "▶ Letzte PM2-Logs:"
pm2 logs "$PM2_NAME" --lines 40 --nostream 2>/dev/null || true
echo ""

echo "▶ PostgreSQL (optional):"
systemctl is-active postgresql 2>/dev/null || service postgresql status 2>/dev/null | head -3 || true
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "♻️  Neustart API..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

pm2 delete "$PM2_NAME" 2>/dev/null || true
fuser -k 5000/tcp 2>/dev/null || true
sleep 2

PM2_INSTANCES="${PM2_INSTANCES:-1}" pm2 start ecosystem.config.cjs --only az-api --update-env
pm2 save

echo ""
echo "⏳ Warte auf Health-Check..."
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sf "http://127.0.0.1:5000/api/health" >/dev/null; then
    echo "✅ API läuft: http://127.0.0.1:5000/api/health"
    curl -s "http://127.0.0.1:5000/api/health"
    echo ""
    exit 0
  fi
  sleep 2
done

echo "❌ API antwortet nach Neustart nicht. Logs:"
pm2 logs "$PM2_NAME" --lines 60 --nostream 2>/dev/null || true
echo ""
echo "💡 Prüfen: grep PRODUCTION_REQUIRE_POSTGRES .env server/.env"
echo "   Wenn true und PostgreSQL down → auf false setzen oder PostgreSQL starten:"
echo "   sudo systemctl start postgresql"
exit 1
