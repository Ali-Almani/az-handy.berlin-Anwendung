#!/bin/bash
# Login reparieren wenn PostgreSQL läuft, USE_MEMORY_DB aber falsch gesetzt ist
# Auf dem Server: cd ~/az-handy.berlin-Anwendung && bash deploy/fix-login.sh

set -e
cd "$(dirname "$0")/.."
PROJECT_DIR="$(pwd)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Login-Reparatur (PostgreSQL + Benutzer)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for ENV_FILE in "$PROJECT_DIR/.env" "$PROJECT_DIR/server/.env"; do
  if [ -f "$ENV_FILE" ]; then
    echo "📄 Prüfe $ENV_FILE"
    if grep -q '^USE_MEMORY_DB=true' "$ENV_FILE" 2>/dev/null; then
      if grep -qE '^(DATABASE_URL|PG_DATABASE|PG_USER)=' "$ENV_FILE" 2>/dev/null || \
         grep -qE '^(DATABASE_URL|PG_DATABASE|PG_USER)=' "$PROJECT_DIR/.env" "$PROJECT_DIR/server/.env" 2>/dev/null; then
        echo "   → USE_MEMORY_DB=true → false (PostgreSQL soll genutzt werden)"
        sed -i 's/^USE_MEMORY_DB=true/USE_MEMORY_DB=false/' "$ENV_FILE"
      fi
    fi
  fi
done

echo ""
echo "▶ PostgreSQL:"
sudo systemctl start postgresql 2>/dev/null || true
systemctl is-active postgresql 2>/dev/null || echo "   ⚠️  PostgreSQL Status unklar"

echo ""
echo "▶ API neu starten..."
pm2 delete az-api 2>/dev/null || true
fuser -k 5000/tcp 2>/dev/null || true
sleep 2
PM2_INSTANCES=1 pm2 start ecosystem.config.cjs --only az-api --update-env
pm2 save
sleep 3

echo ""
echo "▶ Health:"
curl -s "http://127.0.0.1:5000/api/health" || echo "   ❌ API antwortet nicht"
echo ""

if [ -f /root/MA_Zuornung_Shop.xlsx ]; then
  echo "▶ Excel gefunden – Benutzer importieren..."
  pm2 stop az-api
  cd server
  IMPORT_EXCEL_PATH="/root/MA_Zuornung_Shop.xlsx" npm run import-users-excel -- --update
  cd ..
  PM2_INSTANCES=1 pm2 start ecosystem.config.cjs --only az-api --update-env
  pm2 save
else
  echo "⚠️  Excel fehlt: /root/MA_Zuornung_Shop.xlsx"
  echo "   Vom Windows-PC hochladen:"
  echo '   scp "C:\Users\ali.almani\Downloads\MA_Zuornung_Shop.xlsx" root@178.104.37.181:/root/'
  echo "   Dann erneut: bash deploy/fix-login.sh"
fi

echo ""
echo "✅ Admin: admin@az-handy.berlin / Admin123!"
echo "✅ Shop:  E-Mail aus Excel / !azHandy.berlin20260203?"
