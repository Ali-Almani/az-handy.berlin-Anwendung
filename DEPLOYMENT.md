# az-handy.berlin – Deployment mit United Domains (Domain + Hosting)

Vollständige Anleitung: Domain bei United Domains nutzen und die Anwendung auf einem VPS hosten.

---

## Übersicht

| Schritt | Wo | Was |
|---------|-----|-----|
| 1 | **United Domains** | Domain az-schnelltest.berlin + DNS-Einträge |
| 2 | **VPS-Anbieter** | Server mieten (z.B. Hetzner) |
| 3 | **Server** | Projekt deployen, Nginx, SSL, PM2 |

**Hinweis:** United Domains bietet vor allem Domain-Registrierung und WordPress-Hosting. Für Node.js brauchst du einen VPS (z.B. Hetzner, DigitalOcean). Die Domain bleibt bei United Domains; per DNS zeigst du sie auf deinen Server.

---

## Teil 1: Domain bei United Domains einrichten

### 1.1 Einloggen und Domain wählen

1. Gehe zu [United Domains](https://www.united-domains.de) und melde dich an.
2. **Meine Domains** → **az-schnelltest.berlin** auswählen.

### 1.2 DNS-Verwaltung öffnen

1. Links im Menü: **ADMINISTRATION** (oder **CONFIG-MENÜ** → **ADMINISTRATION**).
2. Karte **DNS-Einträge** anklicken (dort werden A-, MX-, CNAME-Records verwaltet).

### 1.3 A-Record für die Hauptdomain hinzufügen

1. **Neuer Eintrag** / **Eintrag hinzufügen**.
2. Einstellungen:
   - **Typ**: A
   - **Name/Host**: `@` (steht für az-schnelltest.berlin)
   - **Wert/Ziel**: **IP-Adresse deines Servers** (z.B. `95.217.123.45`)
   - **TTL**: 3600 (oder Standard)
3. Speichern.

### 1.4 Optional: www-Unterdomain

1. Weiterer Eintrag:
   - **Typ**: A oder CNAME
   - **Name/Host**: `www`
   - **Wert**: Server-IP oder `az-schnelltest.berlin`
2. Speichern.

### 1.5 Wichtige Werte für az-schnelltest.berlin

| Einstellung | Wert |
|-------------|------|
| Domain | `az-schnelltest.berlin` |
| CLIENT_URL | `https://az-schnelltest.berlin` |
| VITE_API_URL | `https://az-schnelltest.berlin/api` |

**Hinweis:** DNS-Änderungen können 15 Minuten bis 48 Stunden dauern.

---

## Teil 2: VPS (Hosting) einrichten

### 2.1 Server mieten

United Domains bietet kein Node.js-Hosting. Du brauchst einen VPS:

| Anbieter | Produkt | Preis | Link |
|----------|---------|-------|------|
| **Hetzner** | CX11 | ca. 4 €/Monat | [hetzner.com/cloud](https://www.hetzner.com/cloud) |
| **DigitalOcean** | Basic Droplet | ab 5 €/Monat | [digitalocean.com](https://www.digitalocean.com) |
| **Contabo** | VPS S | ab 5 €/Monat | [contabo.com](https://contabo.com) |

**Empfehlung:** Hetzner CX11 (2 GB RAM, 20 GB SSD) – günstig, Rechenzentrum in Deutschland.

### 2.2 Server erstellen

1. Account beim Anbieter anlegen.
2. Neuen Server (Droplet/VPS) erstellen:
   - **Betriebssystem**: Ubuntu 22.04 LTS
   - **Region**: Frankfurt (oder nah an deinen Nutzern)
   - **Größe**: Mind. 1 GB RAM, 1 vCPU
3. SSH-Key hinzufügen (empfohlen) oder Passwort notieren.
4. **Öffentliche IP-Adresse** notieren – diese brauchst du für den A-Record bei United Domains.

### 2.3 Mit dem Server verbinden

```bash
ssh root@DEINE-SERVER-IP
```

---

## Teil 3: Projekt auf dem Server deployen

### 3.1 Voraussetzungen installieren

```bash
# System aktualisieren
apt update && apt upgrade -y

# Node.js 20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Nginx
apt install -y nginx

# PM2 (Prozess-Manager)
npm install -g pm2
```

### 3.2 Projekt auf den Server bringen

```bash
cd /var/www
git clone https://github.com/Ali-Almani/az-handy.berlin-Anwendung.git az-handy
cd az-handy
```

Oder: Projekt per SCP/SFTP hochladen.

### 3.3 Abhängigkeiten installieren und Frontend bauen

```bash
cd /var/www/az-handy
npm run deploy:prepare
```

Erzeugt `client/dist/` mit den statischen Dateien.

### 3.4 Umgebungsvariablen (.env)

```bash
cp deploy/.env.production.example .env
nano .env
```

**Wichtig anpassen:**
- `JWT_SECRET`: Eigenes sicheres Geheimnis (min. 32 Zeichen)
- `CLIENT_URL`: `https://az-schnelltest.berlin`

Beispiel-Inhalt:

```env
NODE_ENV=production
PORT=5000
USE_MEMORY_DB=true
PERSIST_MEMORY_DATA=true
JWT_SECRET=dein-sicheres-geheimnis-min-32-zeichen
CLIENT_URL=https://az-schnelltest.berlin
```

### 3.5 Nginx konfigurieren

```bash
sudo cp /var/www/az-handy/deploy/nginx-az-schnelltest.conf /etc/nginx/sites-available/az-handy
sudo ln -s /etc/nginx/sites-available/az-handy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3.6 SSL mit Let's Encrypt (HTTPS)

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d az-schnelltest.berlin -d www.az-schnelltest.berlin
```

Certbot richtet HTTPS automatisch ein.

### 3.7 App mit PM2 starten

```bash
cd /var/www/az-handy
pm2 start server/index.js --name az-handy
pm2 save
pm2 startup
```

---

## Teil 4: DNS bei United Domains prüfen

1. United Domains → **DNS-Einträge**
2. A-Record für `@` muss auf die **öffentliche IP deines Servers** zeigen.
3. Falls du die IP noch nicht eingetragen hast: Jetzt eintragen (siehe Teil 1.3).

---

## Checkliste

- [ ] VPS erstellt (Hetzner/DigitalOcean/Contabo)
- [ ] Öffentliche IP notiert
- [ ] A-Record bei United Domains auf Server-IP gesetzt
- [ ] Projekt auf Server geklont/hochgeladen
- [ ] `npm run deploy:prepare` ausgeführt
- [ ] `.env` mit JWT_SECRET und CLIENT_URL angelegt
- [ ] Nginx konfiguriert und aktiviert
- [ ] SSL mit Certbot eingerichtet
- [ ] PM2 startet die App

---

## Häufige Probleme

**502 Bad Gateway:** Node.js läuft nicht → `pm2 status` prüfen, ggf. `pm2 restart az-handy`

**CORS-Fehler:** `CLIENT_URL` in `.env` muss exakt `https://az-schnelltest.berlin` sein (mit https://)

**API nicht erreichbar:** Nginx-Proxy prüfen – `/api` muss auf Port 5000 zeigen

**Domain zeigt nicht auf Server:** DNS-Propagation abwarten (bis 48 Std.), A-Record bei United Domains prüfen

---

## Server-Anforderungen

| Komponente | Minimum |
|------------|---------|
| RAM | 1 GB |
| CPU | 1 Kern |
| Speicher | 10 GB |
| OS | Ubuntu 22.04 LTS |






1️⃣ Beste Deployment Architektur (für kleine–mittlere Projekte)

Für den Anfang brauchst du nur einen Server.

Architektur
Internet
   │
   │
   Nginx
   │
   ├── React Frontend (build)
   │
   └── Node.js API
          │
          │
      PostgreSQL
Technologien

Server: Ubuntu

Webserver: Nginx

Backend: Node.js

Frontend: React

Datenbank: PostgreSQL

Prozess Manager: PM2

Diese Architektur reicht problemlos für:

10k – 100k Nutzer monatlich.

2️⃣ Deployment in ~10 Minuten (Basic Workflow)
Schritt 1 – Server erstellen

Bei Hetzner Cloud

OS: Ubuntu 22

SSH Key hinzufügen

Dann verbinden:

ssh root@SERVER_IP
Schritt 2 – Node installieren
apt update
apt install nodejs npm -y

PM2 installieren:

npm install -g pm2
Schritt 3 – PostgreSQL installieren
apt install postgresql postgresql-contrib

DB erstellen:

sudo -u postgres createdb myapp
Schritt 4 – Projekt hochladen

z.B. mit Git:

git clone https://github.com/yourproject/app.git
Schritt 5 – Backend starten
cd server
npm install
pm2 start server.js
pm2 save
Schritt 6 – React Build
cd client
npm install
npm run build
Schritt 7 – Nginx installieren
apt install nginx

Config Beispiel:

server {
  listen 80;

  location / {
    root /var/www/app/client/build;
    try_files $uri /index.html;
  }

  location /api {
    proxy_pass http://localhost:5000;
  }
}

Restart:

systemctl restart nginx

Jetzt läuft dein Projekt.

3️⃣ Beste Hetzner Server Größe

Für dein Stack empfehle ich:

Starter (perfekt für MVP)

Server:

Hetzner CX22

Specs:

2 vCPU

4 GB RAM

40 GB SSD

Preis:

💰 ~6€ / Monat

Perfekt für:

Startups

SaaS MVP

kleine Apps
