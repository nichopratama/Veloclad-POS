import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole } from '@/lib/rbac';
import { handleApiError } from '@/lib/api';
import { z } from 'zod';

const getQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).default(30),
  search: z.string().optional(),
});

const itemSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  category_id: z.number().int().nullish(),
  unit: z.string().default('pcs'),
  hpp: z.number().nonnegative().default(0),
  price: z.number().nonnegative(),
  min_stock: z.number().int().default(0),
  supplier_id: z.number().int().nullish(),
  stock: z.number().int().default(0),
  is_active: z.boolean().default(true),
  internal_id: z.string().nullish(),
  variant_name: z.string().nullish(),
  brand_name: z.string().nullish(),
  condition: z.string().nullish(),
  image_url: z.string().nullish(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const url = new URL(req.url);
    // searchParams absen → key tak ada (undefined) agar .default()/.optional() Zod jalan.
    const query = getQuerySchema.parse(Object.fromEntries(url.searchParams));

    const skip = (query.page - 1) * query.limit;
    
    let whereClause = {};
    if (query.search) {
      whereClause = {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { code: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

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
        orderBy: { created_at: 'desc' },
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
  } catch (error) {
    return handleApiError(error, 'GET /api/library/items');
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole('owner', 'admin');

    const body = await req.json();
    const parsedBody = itemSchema.parse(body);

    const newItem = await prisma.items.create({
      data: parsedBody satisfies Prisma.itemsUncheckedCreateInput,
    });

    return NextResponse.json({
      message: 'Item created successfully',
      id: newItem.id,
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'POST /api/library/items');
  }
}
