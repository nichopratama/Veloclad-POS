import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
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
      select: { id: true, name: true, email: true, role: true, staffId: true, createdAt: true, image: true },
    });

    return NextResponse.json({ data: users });
  } catch (error: unknown) {
    return handleApiError(error, 'GET /api/users');
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole('admin');

    const contentType = req.headers.get('content-type') || '';
    let rawData: any;
    let imageUrl: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      rawData = Object.fromEntries(formData);
      
      const file = formData.get('image') as File | null;
      if (file && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const ext = file.name.split('.').pop() || 'jpg';
        const filename = `profile_${Date.now()}_${randomUUID().split('-')[0]}.${ext}`;
        const dir = path.join(process.cwd(), 'public', 'uploads', 'profiles');
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(path.join(dir, filename), buffer);
        imageUrl = `/uploads/profiles/${filename}`;
      }
    } else {
      rawData = await req.json();
    }

    const parsed = createUserSchema.parse(rawData);
    const passwordHash = await bcrypt.hash(parsed.password, 10);

    const created = await prisma.$transaction(async (tx) => {
      // 1. Staf `users` (target FK). Reuse bila email sudah ada (mis. sisa login terhapus).
      const existingStaff = await tx.users.findFirst({ where: { email: parsed.email } });
      const staff = existingStaff
        ? await tx.users.update({
            where: { id: existingStaff.id },
            data: { name: parsed.name, role: parsed.role, password_hash: passwordHash, avatar: imageUrl || existingStaff.avatar },
          })
        : await tx.users.create({
            data: { name: parsed.name, email: parsed.email, password_hash: passwordHash, role: parsed.role, avatar: imageUrl },
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
          image: imageUrl,
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
