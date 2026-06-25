const logger = require('../config/logger');

/**
 * Global error handler (Nicho-Brain D7/D13).
 * - Mencatat detail error di server (lengkap).
 * - Mengembalikan pesan GENERIK ke client — tidak membocorkan internal/stack.
 * Express 5 meneruskan rejected promise dari async handler ke sini secara otomatis.
 */
const errorHandler = (err, req, res, next) => {
  // Status dari error yang dikenal, default 500.
  const status = err.status || err.statusCode || 500;

  logger.error({ err, path: req.originalUrl, method: req.method }, 'Unhandled error');

  // 4xx boleh menampilkan pesan error-nya; 5xx selalu generik.
  const message = status < 500 ? err.message : 'Internal server error';

  res.status(status).json({ error: message });
};

/** Handler 404 untuk route yang tak terdaftar. */
const notFoundHandler = (req, res) => {
  res.status(404).json({ error: 'Not found' });
};

module.exports = { errorHandler, notFoundHandler };
