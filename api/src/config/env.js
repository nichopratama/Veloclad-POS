const { z } = require('zod');

/**
 * Skema environment dengan validasi fail-fast (Nicho-Brain D10).
 * Aplikasi MENOLAK boot jika env wajib hilang/tidak valid —
 * tidak ada silent default untuk secret/kredensial.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3004),

  // Database
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1, 'DB_PASSWORD wajib diisi'),
  DB_SCHEMA: z.string().min(1, 'DB_SCHEMA wajib diisi'),

  // Auth
  JWT_SECRET: z.string().min(16, 'JWT_SECRET minimal 16 karakter'),
  JWT_EXPIRES_IN: z.string().default('8h'),

  // Tenant identity
  TENANT_ID: z.string().min(1),
  TENANT_NAME: z.string().default(''),

  // CORS — daftar origin yang diizinkan (pisah koma). Default ke localhost dev.
  CORS_ORIGIN: z.string().default('http://localhost:3003'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Konfigurasi environment tidak valid:');
  for (const issue of parsed.error.issues) {
    console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
  }
  // Fail-fast: jangan boot dengan env rusak.
  process.exit(1);
}

const env = parsed.data;

/** Daftar origin CORS sebagai array, sudah di-trim. */
env.CORS_ORIGINS = env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);

module.exports = env;
