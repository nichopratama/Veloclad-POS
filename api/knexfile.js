require('dotenv').config({ path: '../.env' }); // Adjust path to the root .env

/**
 * Set search_path pada SETIAP koneksi baru di pool (model silo: 1 schema per deployment).
 * Ini menghapus race condition `SET search_path` per-request pada pool: tiap koneksi
 * sudah ter-pin ke schema tenant sejak dibuat, jadi query apa pun yang mengambil koneksi
 * dari pool selalu berada di schema yang benar. (Nicho-Brain D7/D18 · ADR-001)
 */
const tenantSchema = process.env.DB_SCHEMA;

// Guard: nama schema hanya boleh identifier aman (env-controlled, tapi tetap divalidasi).
if (tenantSchema && !/^[a-zA-Z0-9_]+$/.test(tenantSchema)) {
  throw new Error(`DB_SCHEMA tidak valid: "${tenantSchema}" (hanya huruf, angka, underscore)`);
}

const afterCreate = (conn, done) => {
  if (!tenantSchema) {
    // Tanpa schema tenant, jalan di public saja (mis. saat tooling/migrasi global).
    return done(null, conn);
  }
  conn.query(`SET search_path TO "${tenantSchema}", public`, (err) => {
    done(err, conn);
  });
};

const baseConnection = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'antigravity_pos',
  user: process.env.DB_USER || 'pos_user',
  password: process.env.DB_PASSWORD,
};

const basePool = {
  min: 2,
  max: 10,
  afterCreate,
};

const baseConfig = {
  client: 'pg',
  pool: basePool,
  migrations: {
    tableName: 'knex_migrations',
    directory: './migrations',
  },
  seeds: {
    directory: './seeds',
  },
};

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
module.exports = {
  development: {
    ...baseConfig,
    connection: { ...baseConnection },
  },

  production: {
    ...baseConfig,
    connection: { ...baseConnection, host: process.env.DB_HOST || 'postgres' },
  },
};
