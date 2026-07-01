import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac';
import { handleApiError } from '@/lib/api';

const querySchema = z.object({
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { search, limit } = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams));

    // Mode pencarian.
    if (search) {
      const data = await prisma.items.findMany({
        where: {
          is_active: true,
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
            { variant_name: { contains: search, mode: 'insensitive' } },
          ],
        },
        take: limit,
        orderBy: { name: 'asc' },
      });
      return NextResponse.json({ data });
    }

    // Mode default: produk terlaris 1 bulan terakhir (transaksi completed).
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const top = await prisma.transaction_items.groupBy({
      by: ['item_id'],
      where: {
        transactions: { is: { created_at: { gte: oneMonthAgo }, status: 'completed' } },
        item_id: { not: null },
      },
      _sum: { qty: true },
      orderBy: { _sum: { qty: 'desc' } },
      take: limit,
    });

    const topIds = top.map((t) => t.item_id).filter((id): id is number => id !== null);

    if (topIds.length === 0) {
      // Fallback: belum ada penjualan → tampilkan item aktif.
      const data = await prisma.items.findMany({
        where: { is_active: true },
        take: limit,
        orderBy: { name: 'asc' },
      });
      return NextResponse.json({ data });
    }

    const data = await prisma.items.findMany({
      where: { id: { in: topIds }, is_active: true },
    });
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error, 'GET /api/sales/pos-items');
  }
}

