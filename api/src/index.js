require('dotenv').config({ path: '../.env' });
const env = require('./config/env'); // Fail-fast env validation (D10) — harus paling awal
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const knexConfig = require('../knexfile');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const libraryRoutes = require('./routes/library');
const salesRoutes = require('./routes/sales');
const inventoryRoutes = require('./routes/inventory');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = env.API_PORT;

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

// Health Check Endpoint (used by Docker healthcheck)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Routes
app.use('/api/auth', authRoutes(knexConfig));
app.use('/api/dashboard', dashboardRoutes(knexConfig));
app.use('/api/library', libraryRoutes(knexConfig));
app.use('/api/sales', salesRoutes(knexConfig));
app.use('/api/inventory', inventoryRoutes(knexConfig));
app.use('/api/settings', settingsRoutes(knexConfig));

// Root Route
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'AntiGravity POS API',
    tenant: process.env.TENANT_NAME,
    schema: process.env.DB_SCHEMA,
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 API Server running on port ${PORT}`);
  console.log(`🏢 Tenant Active: ${process.env.TENANT_NAME}`);
});
