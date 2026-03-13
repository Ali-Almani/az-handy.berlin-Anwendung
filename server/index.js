import './loadEnv.js';
import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/errorHandler.js';
import { initDatabase } from './models/index.js';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
  }
});
app.set('io', io);

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'az-handy.berlin API is running',
    timestamp: new Date().toISOString()
  });
});

const mountRoutes = async () => {
  const authRoutes = (await import('./routes/auth.routes.js')).default;
  const userRoutes = (await import('./routes/user.routes.js')).default;
  const excelRoutes = (await import('./routes/excel.routes.js')).default;
  const dashboardRoutes = (await import('./routes/dashboard.routes.js')).default;
  const imeisRoutes = (await import('./routes/imeis.routes.js')).default;

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/excel', excelRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/imeis', imeisRoutes);

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
    console.log('✅ Daten werden in server/data/*.json gespeichert (bleiben nach Neustart)');
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

      if (process.env.NODE_ENV !== 'production') {
        startServer();
      } else {
        console.error('❌ Exiting in production mode (PostgreSQL required)');
        process.exit(1);
      }
    });
}

export default app;
