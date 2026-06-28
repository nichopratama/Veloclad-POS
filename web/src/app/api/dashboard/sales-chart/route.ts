import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, AuthError } from '@/lib/rbac';

const daysId = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

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
      endDate = new Date(today.setHours(23, 59, 59, 999));
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
    }

    const result = await prisma.$queryRaw<{ date: string; sales: number }[]>`
      SELECT 
        TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') as date,
        SUM(total) as sales
      FROM transactions
      WHERE status = 'completed'
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
      GROUP BY TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD')
    `;

    // Initialize map with 0 for the selected date range
    const salesMap = new Map<string, number>();
    const orderedKeys: string[] = [];
    
    let current = new Date(startDate);
    while (current <= endDate) {
      const dateKey = current.toISOString().split('T')[0];
      salesMap.set(dateKey, 0);
      orderedKeys.push(dateKey);
      current.setDate(current.getDate() + 1);
    }

    // Merge from SQL result
    for (const row of result) {
      if (salesMap.has(row.date)) {
        salesMap.set(row.date, Number(row.sales));
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
