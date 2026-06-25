require('dotenv').config({ path: '../.env' });
const env = require('./config/env'); // Fail-fast env validation (D10) — harus paling awal
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const pinoHttp = require('pino-http');
const logger = require('./config/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const knexConfig = require('../knexfile');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const libraryRoutes = require('./routes/library');
const salesRoutes = require('./routes/sales');
const inventoryRoutes = require('./routes/inventory');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = env.API_PORT;

// Instance Knex untuk readiness check. (TODO tech-debt: route masih bikin pool sendiri-sendiri;
// konsolidasi ke satu instance bersama saat refactor FASE 1.)
const knex = require('knex')(knexConfig[env.NODE_ENV] || knexConfig.development);

// Request logging terstruktur (D13)
app.use(pinoHttp({ logger }));

// Security headers (D7)
app.use(helmet());

// CORS — whitelist origin + credentials (D4/D7)
app.use(cors({
  origin: (origin, callback) => {
    // Izinkan request tanpa origin (mis. curl, healthcheck) & origin yang di-whitelist.
    if (!origin || env.CORS_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json());

// Rate limit endpoint auth — cegah brute-force (D14)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 10,                  // maks 10 percobaan / IP / window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan. Coba lagi nanti.' },
});

// Health Check (liveness) — dipakai Docker healthcheck
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Readiness — cek koneksi DB (D13)
app.get('/health/ready', async (req, res) => {
  try {
    await knex.raw('SELECT 1');
    res.status(200).json({ status: 'ready' });
  } catch (err) {
    logger.error({ err }, 'Readiness check gagal');
    res.status(503).json({ status: 'not-ready' });
  }
});

// Routes
app.use('/api/auth', authLimiter, authRoutes(knexConfig));
app.use('/api/dashboard', dashboardRoutes(knexConfig));
app.use('/api/library', libraryRoutes(knexConfig));
app.use('/api/sales', salesRoutes(knexConfig));
app.use('/api/inventory', inventoryRoutes(knexConfig));
app.use('/api/settings', settingsRoutes(knexConfig));

// Root Route
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'AntiGravity POS API',
    tenant: env.TENANT_NAME,
    schema: env.DB_SCHEMA,
  });
});

// 404 + global error handler (paling akhir) — D7/D13
app.use(notFoundHandler);
app.use(errorHandler);

// Tangkap error proses agar tak silent (D13)
process.on('unhandledRejection', (reason) => logger.error({ reason }, 'Unhandled promise rejection'));
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception — proses berhenti');
  process.exit(1);
});

// Start Server
const server = app.listen(PORT, () => {
  logger.info(`🚀 API Server running on port ${PORT} · Tenant: ${env.TENANT_NAME}`);
});

// Graceful shutdown (D18) — tutup koneksi rapi saat SIGTERM/SIGINT
const shutdown = (signal) => {
  logger.info(`${signal} diterima — graceful shutdown...`);
  server.close(async () => {
    await knex.destroy();
    logger.info('Server & koneksi DB ditutup. Bye.');
    process.exit(0);
  });
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
