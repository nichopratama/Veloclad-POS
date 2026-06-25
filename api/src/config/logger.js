const pino = require('pino');

/**
 * Logger terstruktur & berjenjang (Nicho-Brain D13).
 * Pengganti `console.log` — level via LOG_LEVEL, pretty di development.
 */
const isDev = (process.env.NODE_ENV || 'development') !== 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
        },
      }
    : {}),
  // Jangan pernah bocorkan field sensitif ke log.
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.password_hash', '*.token'],
    remove: true,
  },
});

module.exports = logger;
