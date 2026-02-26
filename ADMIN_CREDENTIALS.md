# 🔐 Administrator Login-Daten

## Standard Admin-Zugangsdaten

Nach dem Ausführen des `create-admin` Skripts können Sie sich mit folgenden Daten einloggen:

```
📧 Email:    admin@az-handy.berlin
🔑 Password: Admin123!
👤 Role:     admin
```

## ⚠️ WICHTIG

**Bitte ändern Sie das Passwort nach dem ersten Login!**

## 🚀 Admin-Benutzer erstellen

Um den Admin-Benutzer zu erstellen, führen Sie folgenden Befehl aus:

```bash
cd server
npm run create-admin
```

Oder direkt mit Node:

```bash
cd server
node scripts/create-admin.js
```

## 📝 Hinweise

- Der Admin-Benutzer wird nur erstellt, wenn er noch nicht existiert
- Falls der Admin bereits existiert, werden die Login-Daten angezeigt
- Das Passwort wird automatisch gehasht und sicher gespeichert
- Der Admin hat Zugriff auf alle Funktionen der Anwendung

## 🔒 Sicherheit

Für Produktionsumgebungen:
1. Ändern Sie das Standard-Passwort sofort
2. Verwenden Sie ein starkes, eindeutiges Passwort
3. Aktivieren Sie zusätzliche Sicherheitsmaßnahmen (2FA, etc.)
