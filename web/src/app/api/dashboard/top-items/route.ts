import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac';
import { handleApiError } from '@/lib/api';

const getQuerySchema = z.object({
  period: z.enum(['today', 'month']).optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { period } = getQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));

    // Rentang tanggal sesuai period (default: semua waktu).
    const now = new Date();
    let createdAt: { gte: Date; lte: Date } | undefined;
    if (period === 'today') {
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      const end = new Date(now); end.setHours(23, 59, 59, 999);
      createdAt = { gte: start, lte: end };
    } else if (period === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      createdAt = { gte: start, lte: end };
    }

    // groupBy aman & parameterized (ganti $queryRawUnsafe) — hormati tenant schema.
    const top = await prisma.transaction_items.groupBy({
      by: ['item_id'],
      where: {
        item_id: { not: null },
        transactions: { is: { status: 'completed', ...(createdAt ? { created_at: createdAt } : {}) } },
      },
      _sum: { qty: true, subtotal: true },
      orderBy: { _sum: { qty: 'desc' } },
      take: 5,
    });

    const ids = top.map((t) => t.item_id).filter((id): id is number => id !== null);
    const items = await prisma.items.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, code: true },
    });
    const itemMap = new Map(items.map((i) => [i.id, i]));

    // Pertahankan urutan dari groupBy (qty desc).
    const data = top.map((t) => ({
      id: t.item_id,
      name: itemMap.get(t.item_id as number)?.name ?? null,
      code: itemMap.get(t.item_id as number)?.code ?? null,
      qty: Number(t._sum.qty ?? 0),
      revenue: Number(t._sum.subtotal ?? 0),
    }));

    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error, 'GET /api/dashboard/top-items');
  }
}

