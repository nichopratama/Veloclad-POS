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

    const result = await prisma.$queryRaw<{ hour: number; count: number }[]>`
      SELECT 
        EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Jakarta')::int as hour,
        CAST(COUNT(id) AS INT) as count
      FROM transactions
      WHERE status = 'completed'
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
      GROUP BY hour
      ORDER BY hour ASC
    `;

    // Initialize map for 11:00 to 23:00 (13 hours)
    const heatmap = Array.from({ length: 13 }, (_, i) => {
      const hour = i + 11;
      return {
        hour: `${hour.toString().padStart(2, '0')}:00`,
        count: 0,
      };
    });

    for (const row of result) {
      if (row.hour >= 11 && row.hour <= 23) {
        heatmap[row.hour - 11].count = Number(row.count);
      }
    }

    return NextResponse.json({ data: heatmap });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('GET /api/dashboard/hourly-heatmap error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
