import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac';
import { handleApiError } from '@/lib/api';

const querySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const q = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams));

    const where: Prisma.void_itemsWhereInput = {};
    if (q.startDate || q.endDate) {
      where.created_at = {};
      if (q.startDate) where.created_at.gte = new Date(q.startDate);
      if (q.endDate) where.created_at.lte = new Date(`${q.endDate}T23:59:59.999`);
    }

    const rows = await prisma.void_items.findMany({
      where,
      include: {
        items: { select: { name: true } },
        users: { select: { name: true } },
        transactions: { select: { created_at: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    const data = rows.map((v) => ({
      ...v,
      item_name: v.items?.name ?? null,
      executed_by_name: v.users?.name ?? null,
      transaction_date: v.transactions?.created_at ?? null,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error, 'GET /api/sales/void-items');
  }
}

