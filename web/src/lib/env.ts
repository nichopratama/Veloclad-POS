import { z } from 'zod';

/**
 * Validasi environment fail-fast (Nicho-Brain D10).
 * Di-port dari `api/src/config/env.js`. Boot gagal jika env wajib hilang/invalid.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url().min(1),
  // Better Auth (diisi di M1)
  BETTER_AUTH_SECRET: z.string().min(16).optional(),
  BETTER_AUTH_URL: z.string().url().optional(),
  // Label tenant untuk UI (silo: per-deploy beda schema → beda nama). Jangan hardcode di JSX.
  TENANT_NAME: z.string().min(1).default('vapescrew'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Konfigurasi environment tidak valid:');
  for (const issue of parsed.error.issues) {
    console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
  }
  throw new Error('Environment tidak valid — lihat pesan di atas.');
}

export const env = parsed.data;

