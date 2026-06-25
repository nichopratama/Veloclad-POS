import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

/**
 * Better Auth — autentikasi + session (Nicho-Brain D7, ADR-002/M1).
 *
 * Keputusan kunci (lihat docs/M1-auth-spec.md):
 * - DB: Prisma adapter; tabel auth dibuat di schema tenant (silo, via DATABASE_URL ?schema=).
 * - Password: pakai bcrypt untuk hash & verify → kompatibel dengan `password_hash` user lama
 *   (verify-shim) sehingga user existing login tanpa reset.
 * - additionalFields: `role` & `staffId` menautkan session ke entitas staff (`users` lama).
 * - Session DB-backed → revocation nyata; cookie httpOnly default.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  emailAndPassword: {
    enabled: true,
    // bcrypt untuk hash & verify — selaras dengan hash legacy (bcryptjs.compare).
    password: {
      hash: async (password) => bcrypt.hash(password, 10),
      verify: async ({ hash, password }) => bcrypt.compare(password, hash),
    },
  },

  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'kasir', input: false },
      staffId: { type: 'number', required: false, input: false },
    },
  },

  session: {
    expiresIn: 60 * 60 * 8, // 8 jam, selaras JWT lama
  },
});

