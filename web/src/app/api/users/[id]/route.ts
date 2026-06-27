import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/rbac';
import { ApiError, handleApiError } from '@/lib/api';
import { wouldRemoveLastAdmin } from '@/lib/roles';
import { updateUserSchema } from '@/lib/users-schema';

/**
 * Operasi per-user (admin-only): PATCH (ubah nama/role/reset password) & DELETE (cabut login).
 * Pengaman anti-lockout: admin terakhir tak boleh dihapus / diturunkan role-nya.
 */

/** Jumlah akun yang masih ber-role admin (toleransi legacy `owner`). */
function countAdmins() {
  return prisma.user.count({ where: { role: { in: ['admin', 'owner'] } } });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('admin');
    const { id } = await ctx.params;

    const parsed = updateUserSchema.parse(await req.json());

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) throw new ApiError(404, 'User tidak ditemukan');

    // Anti-lockout: menurunkan admin terakhir → tolak.
    if (parsed.role !== undefined && wouldRemoveLastAdmin(await countAdmins(), target.role, parsed.role)) {
      throw new ApiError(400, 'Tidak bisa menurunkan role admin terakhir');
    }

    const passwordHash = parsed.password ? await bcrypt.hash(parsed.password, 10) : undefined;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { name: parsed.name, role: parsed.role, updatedAt: new Date() },
      });

      // Sinkronkan staf `users` (sumber FK transaksi) bila tertaut.
      if (target.staffId !== null && target.staffId !== undefined) {
        await tx.users.update({
          where: { id: target.staffId },
          data: { name: parsed.name, role: parsed.role, password_hash: passwordHash },
        });
      }

      if (passwordHash) {
        await tx.account.updateMany({
          where: { userId: id, providerId: 'credential' },
          data: { password: passwordHash, updatedAt: new Date() },
        });
      }
    });

    return NextResponse.json({ message: 'User berhasil diperbarui' });
  } catch (error: unknown) {
    return handleApiError(error, 'PATCH /api/users/[id]');
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole('admin');
    const { id } = await ctx.params;

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) throw new ApiError(404, 'User tidak ditemukan');

    if (target.id === session.user.id) {
      throw new ApiError(400, 'Tidak bisa menghapus akun sendiri');
    }
    if (wouldRemoveLastAdmin(await countAdmins(), target.role)) {
      throw new ApiError(400, 'Tidak bisa menghapus admin terakhir');
    }

    // Hapus identitas login; cascade menghapus session + account. Staf `users`
    // DIPERTAHANKAN (masih jadi FK target transaksi historis) → akses login hilang.
    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ message: 'Akses login user dicabut' });
  } catch (error: unknown) {
    return handleApiError(error, 'DELETE /api/users/[id]');
  }
}
