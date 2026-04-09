import './loadEnv.js';
import path from 'path';
import http from 'http';
import express from 'express';
import 'express-async-errors';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/errorHandler.js';
import { initDatabase } from './models/index.js';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

/** Mehrere Frontends (Test + Live): CLIENT_URL=https://a.de,https://b.de */
const corsOrigin =
  process.env.CLIENT_URL && String(process.env.CLIENT_URL).includes(',')
    ? String(process.env.CLIENT_URL)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : process.env.CLIENT_URL || 'http://localhost:3000';

// Socket.io-Handshake sendet Origin der Webseite. Fehlt diese Domain in CLIENT_URL, schlägt
// wss://…/socket.io fehl. In Production daher standardmäßig Origin spiegeln (wie cors origin: true).
const socketIoCorsOrigin =
  process.env.SOCKET_IO_CORS_REFLECT === 'true' ||
  process.env.SOCKET_IO_CORS_REFLECT === '1' ||
  (process.env.NODE_ENV === 'production' && process.env.SOCKET_IO_CORS_REFLECT !== 'false');

const io = new Server(server, {
  cors: {
    origin: socketIoCorsOrigin ? true : corsOrigin,
    credentials: true
  }
});
app.set('io', io);

app.use(helmet());
// Wie Socket.io: In Production Standard-Origin spiegeln, sonst scheitern Requests bei www↔ohne www
// oder falscher CLIENT_URL. Mit CORS_STRICT=true nur noch CLIENT_URL-Einträge.
const httpCorsOrigin =
  process.env.NODE_ENV === 'production' && process.env.CORS_STRICT !== 'true' ? true : corsOrigin;
app.use(cors({
  origin: httpCorsOrigin,
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/api/health', (req, res) => {
  const secret = process.env.JWT_SECRET;
  res.json({
    status: 'OK',
    message: 'az-handy.berlin API is running',
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV || 'development',
    useMemoryDb: process.env.USE_MEMORY_DB === 'true',
    jwtSecretConfigured: !!(secret != null && String(secret).trim() !== ''),
    apiPatchLevel: 4
  });
});

const mountRoutes = async () => {
  const { ensureDataDir, getDataDir } = await import('./utils/filePersistence.js');
  ensureDataDir();
  app.use('/uploads', express.static(path.join(getDataDir(), 'uploads')));

  const authRoutes = (await import('./routes/auth.routes.js')).default;
  const userRoutes = (await import('./routes/user.routes.js')).default;
  const excelRoutes = (await import('./routes/excel.routes.js')).default;
  const dashboardRoutes = (await import('./routes/dashboard.routes.js')).default;
  const imeisRoutes = (await import('./routes/imeis.routes.js')).default;
  const formularCenterRoutes = (await import('./routes/formularCenter.routes.js')).default;

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/excel', excelRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/imeis', imeisRoutes);
  app.use('/api/formular-center', formularCenterRoutes);

  app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
  });

  app.use(errorHandler);
};

const startServer = async () => {
  await mountRoutes();
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 API available at: http://localhost:${PORT}/api`);
    console.log(`💚 Health check: http://localhost:${PORT}/api/health`);
  });
};

const hasPostgresConfig = process.env.DATABASE_URL || process.env.PG_DATABASE || process.env.PG_USER;
let USE_MEMORY_DB = process.env.USE_MEMORY_DB === 'true' || !hasPostgresConfig;

if (USE_MEMORY_DB) {
  process.env.USE_MEMORY_DB = 'true';
  // In Produktion: Persistenz immer aktivieren (Daten bleiben nach Neustart)
  if (process.env.NODE_ENV === 'production') {
    process.env.PERSIST_MEMORY_DATA = 'true';
  }
  const persist = process.env.PERSIST_MEMORY_DATA !== 'false';
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦 IN-MEMORY MODE (No database required)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (persist) {
    const { getDataDir, ensureDataDir } = await import('./utils/filePersistence.js');
    ensureDataDir(); // Datenverzeichnis sofort erstellen, bevor Modelle laden
    console.log('✅ Daten werden in server/data/*.json gespeichert (bleiben nach Neustart)');
    console.log(`   Pfad: ${getDataDir()}`);
  } else {
    console.log('⚠️  Data will be lost on server restart');
    console.log('   Für Persistenz: PERSIST_MEMORY_DATA=true in .env setzen');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  startServer();
} else {
  console.log('🔄 Connecting to PostgreSQL...');
  console.log(`   Host: ${process.env.PG_HOST || 'localhost'}`);

  initDatabase()
    .then(() => {
      console.log('✅ Connected to PostgreSQL');
      console.log('📊 User-Daten: PostgreSQL (persistent)');
      process.env.USE_MEMORY_DB = 'false'; // Sicherstellen, dass Routes PostgreSQL nutzen
      startServer();
    })
    .catch((error) => {
      console.error('');
      console.error('❌ PostgreSQL connection error:', error.message);
      console.error('');
      console.error('💡 Fallback: In-Memory-Modus mit Datei-Persistenz');
      console.error('');
      process.env.USE_MEMORY_DB = 'true';
      USE_MEMORY_DB = true;
      // In Produktion: Persistenz immer aktivieren
      if (process.env.NODE_ENV === 'production') {
        process.env.PERSIST_MEMORY_DATA = 'true';
      }

      const persist = process.env.PERSIST_MEMORY_DATA !== 'false';
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📦 IN-MEMORY MODE (PostgreSQL nicht verfügbar)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      if (persist) {
        console.log('✅ Daten werden in server/data/*.json gespeichert');
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');

      const requirePg =
        process.env.NODE_ENV === 'production' &&
        process.env.PRODUCTION_REQUIRE_POSTGRES === 'true';
      if (requirePg) {
        console.error('❌ PRODUCTION_REQUIRE_POSTGRES=true und PostgreSQL nicht erreichbar → Abbruch');
        process.exit(1);
      }
      if (process.env.NODE_ENV === 'production') {
        console.error('');
        console.error('⚠️  PRODUCTION ohne PostgreSQL: App läuft im Datei-Speicher-Modus (server/data/*.json).');
        console.error('⚠️  Ursache beheben (z. B. PostgreSQL „out of shared memory“), dann PM2 neu starten.');
        console.error('⚠️  Optional: PRODUCTION_REQUIRE_POSTGRES=true setzt hartes Beenden bei DB-Ausfall.');
        console.error('');
      }
      startServer();
    });
}

export default app;
