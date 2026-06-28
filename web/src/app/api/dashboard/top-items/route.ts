import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac';
import { handleApiError } from '@/lib/api';

const getQuerySchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { start, end } = getQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));

    // Rentang tanggal sesuai period (default: hari ini).
    const now = new Date();
    let createdAt: { gte: Date; lte: Date } | undefined;
    if (start && end) {
      const s = new Date(start); s.setHours(0, 0, 0, 0);
      const e = new Date(end); e.setHours(23, 59, 59, 999);
      createdAt = { gte: s, lte: e };
    } else {
      const s = new Date(now); s.setHours(0, 0, 0, 0);
      const e = new Date(now); e.setHours(23, 59, 59, 999);
      createdAt = { gte: s, lte: e };
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
      take: 8,
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

