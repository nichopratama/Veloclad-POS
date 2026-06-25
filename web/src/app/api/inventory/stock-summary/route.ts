import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, AuthError } from '@/lib/rbac';
import { z } from 'zod';

const getQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).default(30),
  search: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    // Lesson 1: Parse from Object.fromEntries to avoid null breaking Zod default/optional
    const searchParamsObj = Object.fromEntries(req.nextUrl.searchParams);
    const query = getQuerySchema.parse(searchParamsObj);

    const skip = (query.page - 1) * query.limit;

    // Build the where clause
    let whereClause = {};
    if (query.search) {
      whereClause = {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { code: { contains: query.search, mode: 'insensitive' } },
        ],
      };
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
        orderBy: { name: 'asc' }, // Lesson 3: picklists use name asc
      }),
    ]);

    return NextResponse.json({
      data,
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
