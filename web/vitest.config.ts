import { defineConfig } from 'vitest/config';

/**
 * Vitest — unit test logika murni (mis. lib/sales-pricing.ts).
 * environment 'node' (tak butuh DOM); hanya file *.test.ts di src/.
 * Tes integrasi DB (Tier 2) akan pakai konfigurasi terpisah.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
