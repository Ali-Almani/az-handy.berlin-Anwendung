# Projektstruktur - az-handy.berlin

## Gesamtübersicht

```
az-handy.berlin/
├── client/                 # React Frontend
│   ├── public/            # Statische Assets
│   ├── src/
│   │   ├── components/    # React Komponenten
│   │   │   ├── Layout/
│   │   │   ├── Navbar/
│   │   │   ├── Footer/
│   │   │   └── ProtectedRoute/
│   │   ├── pages/         # Seiten-Komponenten
│   │   │   ├── Home/
│   │   │   ├── Auth/
│   │   │   │   ├── Login.jsx
│   │   │   │   └── Register.jsx
│   │   │   └── Dashboard/
│   │   ├── hooks/         # Custom React Hooks
│   │   │   └── useAuth.js
│   │   ├── services/      # API Services
│   │   │   ├── api.js
│   │   │   ├── auth.service.js
│   │   │   └── user.service.js
│   │   ├── styles/        # SCSS Stylesheets
│   │   │   ├── main.scss
│   │   │   ├── _variables.scss
│   │   │   ├── _reset.scss
│   │   │   ├── _base.scss
│   │   │   ├── _components/
│   │   │   ├── _layout.scss
│   │   │   └── _utilities.scss
│   │   ├── utils/         # Utility Functions
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   ├── .eslintrc.cjs
│   ├── .prettierrc
│   ├── vite.config.js
│   └── package.json
│
├── server/                 # Express Backend
│   ├── config/            # Konfigurationsdateien
│   │   └── database.js
│   ├── controllers/       # Route Controller
│   │   ├── auth.controller.js
│   │   └── user.controller.js
│   ├── middleware/        # Express Middleware
│   │   ├── auth.js
│   │   └── errorHandler.js
│   ├── models/            # Sequelize Models (PostgreSQL)
│   │   └── User.model.js
│   ├── routes/            # API Routes
│   │   ├── auth.routes.js
│   │   └── user.routes.js
│   ├── .env.example
│   ├── .eslintrc.cjs
│   ├── .prettierrc
│   ├── index.js           # Server Entry Point
│   └── package.json
│
├── .gitignore
├── .env.example
├── package.json           # Root Package.json
└── README.md
```

## Backend-Struktur (Express)

### Routes
- `/api/auth` - Authentifizierung (Register, Login)
- `/api/users` - Benutzer-Endpunkte (Profile, Update)

### Features
- JWT-basierte Authentifizierung
- Passwort-Hashing mit bcrypt
- Input-Validierung mit express-validator
- Error-Handling Middleware
- CORS & Security Headers (Helmet)
- PostgreSQL mit Sequelize

## Frontend-Struktur (React)

### Routing
- `/` - Homepage
- `/login` - Login-Seite
- `/register` - Registrierungs-Seite
- `/dashboard` - Geschützte Dashboard-Seite

### Features
- React Router für Navigation
- Context API für Auth-State
- Axios für API-Calls
- SCSS für Styling
- Responsive Design
- Protected Routes

### SCSS-Architektur
- Modulares SCSS-System
- Variablen-basiertes Design
- Component-basierte Styles
- Utility-Klassen
- Responsive Breakpoints

## Best Practices

✅ **Code-Organisation**
- Separation of Concerns
- Modularer Aufbau
- Wiederverwendbare Komponenten

✅ **Sicherheit**
- Environment Variables
- JWT Tokens
- Password Hashing
- Input Validation
- CORS Konfiguration

✅ **Code-Qualität**
- ESLint Konfiguration
- Prettier Formatierung
- Konsistente Namenskonventionen

✅ **Performance**
- Vite für schnelle Builds
- Code-Splitting
- Optimierte Bundle-Größe
