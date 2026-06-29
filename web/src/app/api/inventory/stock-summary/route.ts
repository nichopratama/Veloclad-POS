import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, AuthError } from '@/lib/rbac';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

const getQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).default(30),
  search: z.string().optional(),
  categoryId: z.coerce.number().int().optional(),
  sortBy: z.enum(['name', 'category', 'stock']).optional(),
  sortDir: z.enum(['asc', 'desc']).default('asc'),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    // Lesson 1: Parse from Object.fromEntries to avoid null breaking Zod default/optional
    const searchParamsObj = Object.fromEntries(req.nextUrl.searchParams);
    const query = getQuerySchema.parse(searchParamsObj);

    const skip = (query.page - 1) * query.limit;

    // Build the where clause
    const whereClause: Prisma.itemsWhereInput = {};
    if (query.search) {
      whereClause.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.categoryId) {
      whereClause.category_id = query.categoryId;
    }

    // Build the orderBy clause
    let orderByClause: Prisma.itemsOrderByWithRelationInput = { name: 'asc' };
    if (query.sortBy === 'name') {
      orderByClause = { name: query.sortDir };
    } else if (query.sortBy === 'category') {
      orderByClause = { categories: { name: query.sortDir } };
    } else if (query.sortBy === 'stock') {
      orderByClause = { stock: query.sortDir };
    }

    // Execute count and query in parallel
    const [total, data] = await Promise.all([
      prisma.items.count({ where: whereClause }),
      prisma.items.findMany({
        where: whereClause,
        include: {
          categories: true,
          suppliers: true,
        },
        skip,
        take: query.limit,
        orderBy: orderByClause,
      }),
    ]);

    // Attach the consignment portion of each item's stock (active CONSIGNMENT lots).
    const itemIds = data.map((d) => d.id);
    const consignLots = itemIds.length
      ? await prisma.stock_lots.groupBy({
          by: ['item_id'],
          where: { item_id: { in: itemIds }, source_type: 'CONSIGNMENT', status: 'ACTIVE' },
          _sum: { qty_remaining: true },
        })
      : [];
    const consignMap = new Map(consignLots.map((l) => [l.item_id, Number(l._sum.qty_remaining ?? 0)]));
    const dataWithConsign = data.map((d) => ({ ...d, consignment_stock: consignMap.get(d.id) ?? 0 }));

    return NextResponse.json({
      data: dataWithConsign,
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      // Lesson 4: use error.issues
      return NextResponse.json({ error: 'Invalid query parameters', details: error.issues }, { status: 400 });
    }
    console.error('GET /api/inventory/stock-summary error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
