import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/errorHandler.js';
import { initDatabase } from './models/index.js';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import excelRoutes from './routes/excel.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'az-handy.berlin API is running',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/excel', excelRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use(errorHandler);

const startServer = () => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 API available at: http://localhost:${PORT}/api`);
    console.log(`💚 Health check: http://localhost:${PORT}/api/health`);
  });
};

const hasPostgresConfig = process.env.DATABASE_URL || process.env.PG_DATABASE || process.env.PG_USER;
const USE_MEMORY_DB = process.env.USE_MEMORY_DB === 'true' || !hasPostgresConfig;

if (USE_MEMORY_DB) {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦 IN-MEMORY MODE (No database required)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Using in-memory database for testing');
  console.log('⚠️  Data will be lost on server restart');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  startServer();
} else {
  const dbUrl = process.env.DATABASE_URL || 'postgresql://localhost';
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
      console.error('💡 Options:');
      console.error('   1. Start PostgreSQL and create database');
      console.error('   2. Set USE_MEMORY_DB=true in .env to use in-memory database');
      console.error('   3. Check DATABASE_URL or PG_* variables in .env');
      console.error('');
      console.error('⚠️  Starting server with In-Memory database...');
      console.error('');

      if (process.env.NODE_ENV !== 'production') {
        process.env.USE_MEMORY_DB = 'true';
        startServer();
      } else {
        console.error('❌ Exiting in production mode (PostgreSQL required)');
        process.exit(1);
      }
    });
}

export default app;
