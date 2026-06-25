import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, AuthError } from '@/lib/rbac';

const daysId = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const today = new Date();
    // Normalize to end of today
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));
    
    // 7 days ago, start of day
    const startOf7DaysAgo = new Date();
    startOf7DaysAgo.setDate(startOf7DaysAgo.getDate() - 6);
    startOf7DaysAgo.setHours(0, 0, 0, 0);

    const transactions = await prisma.transactions.findMany({
      where: {
        status: 'completed',
        created_at: {
          gte: startOf7DaysAgo,
          lte: endOfToday,
        },
      },
      select: {
        created_at: true,
        total: true,
      },
    });

    // Initialize map with 0 for the last 7 days
    const salesMap = new Map<string, number>();
    const orderedKeys: string[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      salesMap.set(dateKey, 0);
      orderedKeys.push(dateKey);
    }

    // Aggregate
    for (const tx of transactions) {
      const dateKey = tx.created_at.toISOString().split('T')[0];
      if (salesMap.has(dateKey)) {
        salesMap.set(dateKey, salesMap.get(dateKey)! + Number(tx.total));
      }
    }

    // Format output
    const data = orderedKeys.map(key => {
      const d = new Date(key);
      const dayName = daysId[d.getDay()];
      return {
        date: dayName,
        sales: salesMap.get(key) || 0,
      };
    });

    return NextResponse.json({ data });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('GET /api/dashboard/sales-chart error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
