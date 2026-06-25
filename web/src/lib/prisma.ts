import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client singleton — hindari koneksi berlipat saat hot-reload dev (Next.js).
 * Schema tenant di-pin lewat `?schema=` di DATABASE_URL (SILO, ADR-001/002).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

