import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, AuthError } from '@/lib/rbac';
import { z } from 'zod';

const getQuerySchema = z.object({
  search: z.string().optional(),
});

const discountSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  value: z.number().nonnegative(),
  max_value: z.number().nonnegative().nullish(),
  is_active: z.boolean().default(true).optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const url = new URL(req.url);
    const query = getQuerySchema.parse(Object.fromEntries(url.searchParams));

    let whereClause = {};
    if (query.search) {
      whereClause = {
        name: { contains: query.search, mode: 'insensitive' },
      };
    }

    const data = await prisma.discounts.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ data });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid query parameters', details: error.errors }, { status: 400 });
    }
    console.error('GET /api/library/discounts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole('owner', 'admin');

    const body = await req.json();
    const parsedBody = discountSchema.parse(body);

    const newDiscount = await prisma.discounts.create({
      data: parsedBody as any,
    });

    return NextResponse.json({
      message: 'Discount created successfully',
      id: newDiscount.id,
    }, { status: 201 });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data', details: error.errors }, { status: 400 });
    }
    console.error('POST /api/library/discounts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
