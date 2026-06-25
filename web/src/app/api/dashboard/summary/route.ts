import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, AuthError } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const [transactionsStats, totalItems] = await Promise.all([
      prisma.transactions.aggregate({
        _sum: { total: true },
        _count: { id: true },
        where: {
          status: 'completed',
          created_at: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      }),
      prisma.items.count({
        where: { is_active: true },
      }),
    ]);

    const totalSales = transactionsStats._sum.total ? Number(transactionsStats._sum.total) : 0;
    const transactionCount = transactionsStats._count.id;

    return NextResponse.json({ totalSales, transactionCount, totalItems });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('GET /api/dashboard/summary error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
