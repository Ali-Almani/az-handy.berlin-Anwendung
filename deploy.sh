#!/bin/bash
# ============================================
# Deploy – az-handy.berlin (Ubuntu Server)
# ============================================
# Verwendung: ./deploy.sh
# Voraussetzung: .env mit CLIENT_URL, DATABASE_URL
# ============================================

set -e
PM2_NAME="${PM2_NAME:-az-api}"
WEB_ROOT="/var/www/az-schnelltest.berlin"
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

echo "📂 Kopiere neues Frontend zu $WEB_ROOT..."
mkdir -p "$WEB_ROOT"
cp -r client/dist/* "$WEB_ROOT/"

echo "🔧 Installiere Backend-Abhängigkeiten..."
npm run install-server

echo "🚀 Starte Backend neu..."
# Versuche az-api oder az-handy zu restarten, sonst neu starten
if pm2 restart az-api 2>/dev/null; then
  :
elif pm2 restart az-handy 2>/dev/null; then
  :
else
  echo "   PM2-Prozess nicht gefunden – starte neu als az-api..."
  pm2 start server/index.js --name az-api
  pm2 save
fi

echo "♻️ Nginx neu laden..."
sudo systemctl reload nginx 2>/dev/null || true

echo ""
echo "✅ Deployment fertig!"
echo ""
echo "⚠️  Falls IMEI-Liste im normalen Browser nicht erscheint:"
echo "    Nginx-Cache-Anpassung anwenden (index.html nicht cachen):"
echo "    sudo cp deploy/nginx-az-schnelltest.conf /etc/nginx/sites-available/az-schnelltest"
echo "    sudo nginx -t && sudo systemctl reload nginx"
