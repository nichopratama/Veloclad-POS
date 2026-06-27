import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/rbac';
import { handleApiError } from '@/lib/api';
import { createUserSchema } from '@/lib/users-schema';

/**
 * Users Management API (admin-only). Mengelola AKSES LOGIN ke POS.
 *
 * Satu "user" = 1 akun login = baris `user` (Better Auth) + `account` (kredensial)
 * + tautan ke staf `users` (int id, target FK transaksi). Pola buat 3-tabel mengikuti
 * scripts/seed-auth.mjs. Password di-hash bcrypt (selaras lib/auth.ts verify-shim).
 */
export async function GET() {
  try {
    await requireRole('admin');

    const users = await prisma.user.findMany({
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, email: true, role: true, staffId: true, createdAt: true },
    });

    return NextResponse.json({ data: users });
  } catch (error: unknown) {
    return handleApiError(error, 'GET /api/users');
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole('admin');

    const parsed = createUserSchema.parse(await req.json());
    const passwordHash = await bcrypt.hash(parsed.password, 10);

    const created = await prisma.$transaction(async (tx) => {
      // 1. Staf `users` (target FK). Reuse bila email sudah ada (mis. sisa login terhapus).
      const existingStaff = await tx.users.findFirst({ where: { email: parsed.email } });
      const staff = existingStaff
        ? await tx.users.update({
            where: { id: existingStaff.id },
            data: { name: parsed.name, role: parsed.role, password_hash: passwordHash },
          })
        : await tx.users.create({
            data: { name: parsed.name, email: parsed.email, password_hash: passwordHash, role: parsed.role },
          });

      // 2. Better Auth `user` (identitas login). Email @@unique → dup dilempar P2002 (409).
      const userId = randomUUID();
      const now = new Date();
      const user = await tx.user.create({
        data: {
          id: userId,
          name: parsed.name,
          email: parsed.email,
          emailVerified: true,
          role: parsed.role,
          staffId: staff.id,
          createdAt: now,
          updatedAt: now,
        },
      });

      // 3. Account kredensial (password bcrypt).
      await tx.account.create({
        data: {
          id: randomUUID(),
          accountId: userId,
          providerId: 'credential',
          userId,
          password: passwordHash,
          createdAt: now,
          updatedAt: now,
        },
      });

      return user;
    });

    return NextResponse.json(
      { id: created.id, name: created.name, email: created.email, role: created.role },
      { status: 201 },
    );
  } catch (error: unknown) {
    return handleApiError(error, 'POST /api/users');
  }
}
