#!/bin/bash
# ============================================
# Deploy – az-handy.berlin (Ubuntu Server)
# ============================================
# Verwendung: ./deploy.sh
# Voraussetzung: .env mit CLIENT_URL, DATABASE_URL
#
# Nur Schnelltest (Standard):  ./deploy.sh
# Zusätzlich Intranet-Static:    DEPLOY_INTRANET=1 ./deploy.sh
# Oder nur Ziel wählen:          DEPLOY_TARGET=both|schnelltest|intranet ./deploy.sh
#
# Pfade (anpassbar):
#   WEB_ROOT_SCHNELLTEST  (default /var/www/az-schnelltest.berlin)
#   WEB_ROOT_INTRANET    (default /var/www/az-intranet/html)
# ============================================

set -e
PM2_NAME="${PM2_NAME:-az-api}"
WEB_ROOT_SCHNELLTEST="${WEB_ROOT_SCHNELLTEST:-/var/www/az-schnelltest.berlin}"
WEB_ROOT_INTRANET="${WEB_ROOT_INTRANET:-/var/www/az-intranet/html}"
DEPLOY_TARGET="${DEPLOY_TARGET:-}"
if [ -z "$DEPLOY_TARGET" ]; then
  if [ "${DEPLOY_INTRANET:-0}" = "1" ]; then
    DEPLOY_TARGET="both"
  else
    DEPLOY_TARGET="schnelltest"
  fi
fi

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

cd "$PROJECT_DIR"

echo "🔄 Git Sync von GitHub..."
# Immer exakt mit origin/master synchronisieren (keine Merge-Konflikte)
git fetch origin
git reset --hard origin/master

echo "📦 Installiere Frontend-Abhängigkeiten..."
npm run install-client

echo "🏗️ Baue Frontend..."
npm run build

deploy_frontend_dir() {
  local dest="$1"
  echo "📂 Kopiere neues Frontend zu $dest..."
  mkdir -p "$dest"
  cp -r client/dist/* "$dest/"
}

case "$DEPLOY_TARGET" in
  intranet)
    deploy_frontend_dir "$WEB_ROOT_INTRANET"
    ;;
  both)
    deploy_frontend_dir "$WEB_ROOT_SCHNELLTEST"
    deploy_frontend_dir "$WEB_ROOT_INTRANET"
    ;;
  schnelltest|*)
    deploy_frontend_dir "$WEB_ROOT_SCHNELLTEST"
    ;;
esac

echo "🔧 Installiere Backend-Abhängigkeiten..."
npm run install-server

echo "🚀 Starte Backend neu..."
PM2_INSTANCES="${PM2_INSTANCES:-1}"
# ecosystem.config.cjs – Standard 1 Worker; PM2_INSTANCES=max für alle CPU-Kerne
if pm2 describe az-api >/dev/null 2>&1; then
  PM2_INSTANCES="$PM2_INSTANCES" pm2 reload ecosystem.config.cjs --update-env
else
  pm2 delete az-handy 2>/dev/null || true
  echo "   Starte az-api (${PM2_INSTANCES} Worker)..."
  PM2_INSTANCES="$PM2_INSTANCES" pm2 start ecosystem.config.cjs --only az-api
fi
pm2 save

echo "♻️ Nginx neu laden..."
sudo systemctl reload nginx 2>/dev/null || true

echo "💚 Health-Check API..."
API_OK=0
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sf "http://127.0.0.1:5000/api/health" >/dev/null; then
    echo "✅ API antwortet auf /api/health"
    API_OK=1
    break
  fi
  sleep 2
done
if [ "$API_OK" != "1" ]; then
  echo "❌ API antwortet nicht (Browser: 502 Bad Gateway). Auf dem Server:"
  echo "   bash deploy/restart-api.sh"
  echo "   pm2 logs az-api --lines 80"
fi

echo ""
echo "✅ Deployment fertig!"
echo ""
echo "⚠️  Falls IMEI-Liste im normalen Browser nicht erscheint:"
echo "    Nginx-Cache-Anpassung anwenden (index.html nicht cachen):"
echo "    sudo cp deploy/nginx-az-schnelltest.conf /etc/nginx/sites-available/az-schnelltest"
echo "    sudo nginx -t && sudo systemctl reload nginx"
