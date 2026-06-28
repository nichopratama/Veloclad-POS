import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, AuthError } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = req.nextUrl;
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');

    let startDate, endDate;
    if (startParam && endParam) {
      startDate = new Date(startParam);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(endParam);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const today = new Date();
      startDate = new Date(today.setHours(0, 0, 0, 0));
      endDate = new Date(today.setHours(23, 59, 59, 999));
    }

    const [transactionsStats, totalItems, transactionItems] = await Promise.all([
      prisma.transactions.aggregate({
        _sum: { total: true },
        _count: { id: true },
        where: {
          status: 'completed',
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      prisma.items.count({
        where: { is_active: true },
      }),
      prisma.transaction_items.findMany({
        where: {
          transactions: {
            status: 'completed',
            created_at: {
              gte: startDate,
              lte: endDate,
            }
          }
        },
        include: {
          items: {
            select: { hpp: true }
          }
        }
      })
    ]);

    const totalSales = transactionsStats._sum.total ? Number(transactionsStats._sum.total) : 0;
    const transactionCount = transactionsStats._count.id;

    const totalCOGS = transactionItems.reduce((acc, curr) => {
      const hpp = curr.items?.hpp ? Number(curr.items.hpp) : 0;
      return acc + (hpp * curr.qty);
    }, 0);
    const netProfit = totalSales - totalCOGS;

    return NextResponse.json({ totalSales, transactionCount, netProfit, totalItems });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('GET /api/dashboard/summary error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
